/**
 * ExerciseRepository — library CRUD, soft archive, and per-exercise user settings.
 */
import { assertTrackingType } from '@/src/domain/validation'
import type {
	CreateExerciseInput,
	Exercise,
	UpdateExerciseInput,
} from '@/src/domain/types'
import { EXERCISE_NAME_MAX_LENGTH } from '@/src/domain/types'
import type { AppDatabase } from '../client'
import { createId } from '@/src/utils/id'
import { nowIso } from '@/src/utils/dates'

type ExerciseRow = {
	id: string
	name: string
	category: string
	muscle_group: string
	equipment: string
	tracking_type: string
	default_rest_seconds: number
	weight_step: number | null
	notes: string | null
	is_custom: number
	created_at: string
	updated_at: string
	archived_at: string | null
}

/** SELECT that coalesces user overrides over catalog defaults. */
const EXERCISE_SELECT = `
	SELECT
		e.id,
		e.name,
		e.category,
		e.muscle_group,
		e.equipment,
		e.tracking_type,
		COALESCE(s.default_rest_seconds, e.default_rest_seconds) AS default_rest_seconds,
		CASE
			WHEN s.exercise_id IS NOT NULL THEN s.weight_step
			ELSE e.weight_step
		END AS weight_step,
		CASE
			WHEN s.exercise_id IS NOT NULL THEN s.notes
			ELSE e.notes
		END AS notes,
		e.is_custom,
		e.created_at,
		e.updated_at,
		e.archived_at
	FROM exercises e
	LEFT JOIN exercise_user_settings s ON s.exercise_id = e.id
`

function mapRow (row: ExerciseRow): Exercise {
	return {
		id: row.id,
		name: row.name,
		category: row.category,
		muscleGroup: row.muscle_group,
		equipment: row.equipment,
		trackingType: assertTrackingType(row.tracking_type),
		defaultRestSeconds: row.default_rest_seconds,
		weightStep: row.weight_step,
		notes: row.notes,
		isCustom: row.is_custom === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		archivedAt: row.archived_at,
	}
}

function normalizeName (raw: string): string {
	return raw.trim().replace(/\s+/g, ' ')
}

export function validateExerciseName (raw: string): string {
	const name = normalizeName(raw)
	if (name.length === 0) {
		throw new Error('Введите название упражнения')
	}
	if (name.length > EXERCISE_NAME_MAX_LENGTH) {
		throw new Error(
			`Название слишком длинное (макс. ${EXERCISE_NAME_MAX_LENGTH} символов)`,
		)
	}
	return name
}

export class ExerciseRepository {
	constructor (private readonly db: AppDatabase) {}

	async create (input: CreateExerciseInput): Promise<Exercise> {
		const id = createId('ex')
		const timestamp = nowIso()
		const trackingType = input.trackingType ?? 'weight_reps'
		assertTrackingType(trackingType)
		const name = validateExerciseName(input.name)

		await this.db.runAsync(
			`INSERT INTO exercises (
				id, name, category, muscle_group, equipment, tracking_type,
				default_rest_seconds, weight_step, notes, is_custom,
				created_at, updated_at, archived_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
			[
				id,
				name,
				input.category ?? 'strength',
				input.muscleGroup ?? 'other',
				input.equipment ?? 'other',
				trackingType,
				input.defaultRestSeconds ?? 90,
				input.weightStep ?? null,
				input.notes?.trim() ? input.notes.trim() : null,
				input.isCustom === false ? 0 : 1,
				timestamp,
				timestamp,
			],
		)

		const created = await this.getById(id)
		if (!created) {
			throw new Error('Failed to read exercise after create')
		}
		return created
	}

	async getById (id: string): Promise<Exercise | null> {
		const row = await this.db.getFirstAsync<ExerciseRow>(
			`${EXERCISE_SELECT} WHERE e.id = ?`,
			[id],
		)
		return row ? mapRow(row) : null
	}

	/**
	 * List exercises. By default excludes archived rows.
	 */
	async list (options?: { includeArchived?: boolean }): Promise<Exercise[]> {
		const includeArchived = options?.includeArchived === true
		const rows = includeArchived
			? await this.db.getAllAsync<ExerciseRow>(
				`${EXERCISE_SELECT} ORDER BY e.name COLLATE NOCASE ASC`,
			)
			: await this.db.getAllAsync<ExerciseRow>(
				`${EXERCISE_SELECT}
				 WHERE e.archived_at IS NULL
				 ORDER BY e.name COLLATE NOCASE ASC`,
			)

		return rows.map(mapRow)
	}

	async listArchived (): Promise<Exercise[]> {
		const rows = await this.db.getAllAsync<ExerciseRow>(
			`${EXERCISE_SELECT}
			 WHERE e.archived_at IS NOT NULL
			 ORDER BY e.archived_at DESC`,
		)
		return rows.map(mapRow)
	}

	async countBuiltin (): Promise<number> {
		const row = await this.db.getFirstAsync<{ count: number }>(
			'SELECT COUNT(*) AS count FROM exercises WHERE is_custom = 0',
		)
		return row?.count ?? 0
	}

	/**
	 * Update exercise fields.
	 * Built-ins: identity fields stay locked; rest/step/notes go to overrides.
	 * Custom: full row update on exercises table.
	 */
	async update (id: string, input: UpdateExerciseInput): Promise<Exercise> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`)
		}

		if (input.trackingType !== undefined) {
			assertTrackingType(input.trackingType)
		}

		const timestamp = nowIso()

		if (!existing.isCustom) {
			const rest =
				input.defaultRestSeconds ?? existing.defaultRestSeconds
			const weightStep =
				input.weightStep !== undefined
					? input.weightStep
					: existing.weightStep
			const notes =
				input.notes !== undefined
					? input.notes?.trim()
						? input.notes.trim()
						: null
					: existing.notes

			await this.upsertUserSettings(id, {
				defaultRestSeconds: rest,
				weightStep,
				notes,
				updatedAt: timestamp,
			})

			const updated = await this.getById(id)
			if (!updated) {
				throw new Error('Failed to read exercise after update')
			}
			return updated
		}

		const name =
			input.name !== undefined
				? validateExerciseName(input.name)
				: existing.name

		await this.db.runAsync(
			`UPDATE exercises SET
				name = ?,
				category = ?,
				muscle_group = ?,
				equipment = ?,
				tracking_type = ?,
				default_rest_seconds = ?,
				weight_step = ?,
				notes = ?,
				updated_at = ?
			 WHERE id = ? AND is_custom = 1`,
			[
				name,
				input.category ?? existing.category,
				input.muscleGroup ?? existing.muscleGroup,
				input.equipment ?? existing.equipment,
				input.trackingType ?? existing.trackingType,
				input.defaultRestSeconds ?? existing.defaultRestSeconds,
				input.weightStep !== undefined
					? input.weightStep
					: existing.weightStep,
				input.notes !== undefined
					? input.notes?.trim()
						? input.notes.trim()
						: null
					: existing.notes,
				timestamp,
				id,
			],
		)

		const updated = await this.getById(id)
		if (!updated) {
			throw new Error('Failed to read exercise after update')
		}
		return updated
	}

	/**
	 * Soft-delete custom exercises only.
	 */
	async archive (id: string): Promise<Exercise> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`)
		}
		if (!existing.isCustom) {
			throw new Error('Встроенное упражнение нельзя архивировать')
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE exercises
			 SET archived_at = ?, updated_at = ?
			 WHERE id = ? AND is_custom = 1`,
			[timestamp, timestamp, id],
		)

		const archived = await this.getById(id)
		if (!archived) {
			throw new Error('Failed to read exercise after archive')
		}
		return archived
	}

	async restore (id: string): Promise<Exercise> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`)
		}
		if (!existing.isCustom) {
			throw new Error('Встроенное упражнение нельзя восстановить из архива')
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE exercises
			 SET archived_at = NULL, updated_at = ?
			 WHERE id = ? AND is_custom = 1`,
			[timestamp, id],
		)

		const restored = await this.getById(id)
		if (!restored) {
			throw new Error('Failed to read exercise after restore')
		}
		return restored
	}

	private async upsertUserSettings (
		exerciseId: string,
		settings: {
			defaultRestSeconds: number
			weightStep: number | null
			notes: string | null
			updatedAt: string
		},
	): Promise<void> {
		await this.db.runAsync(
			`INSERT INTO exercise_user_settings (
				exercise_id, default_rest_seconds, weight_step, notes, updated_at
			) VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(exercise_id) DO UPDATE SET
				default_rest_seconds = excluded.default_rest_seconds,
				weight_step = excluded.weight_step,
				notes = excluded.notes,
				updated_at = excluded.updated_at`,
			[
				exerciseId,
				settings.defaultRestSeconds,
				settings.weightStep,
				settings.notes,
				settings.updatedAt,
			],
		)
	}
}
