/**
 * ExerciseRepository — minimal CRUD + soft archive for Phase 0 smoke checks.
 */
import { assertTrackingType } from '@/src/domain/validation'
import type {
	CreateExerciseInput,
	Exercise,
	UpdateExerciseInput,
} from '@/src/domain/types'
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

export class ExerciseRepository {
	constructor (private readonly db: AppDatabase) {}

	async create (input: CreateExerciseInput): Promise<Exercise> {
		const id = createId('ex')
		const timestamp = nowIso()
		const trackingType = input.trackingType ?? 'weight_reps'
		assertTrackingType(trackingType)

		await this.db.runAsync(
			`INSERT INTO exercises (
				id, name, category, muscle_group, equipment, tracking_type,
				default_rest_seconds, weight_step, notes, is_custom,
				created_at, updated_at, archived_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
			[
				id,
				input.name.trim(),
				input.category ?? 'strength',
				input.muscleGroup ?? 'other',
				input.equipment ?? 'other',
				trackingType,
				input.defaultRestSeconds ?? 90,
				input.weightStep ?? null,
				input.notes ?? null,
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
			'SELECT * FROM exercises WHERE id = ?',
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
				'SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC',
			)
			: await this.db.getAllAsync<ExerciseRow>(
				`SELECT * FROM exercises
				 WHERE archived_at IS NULL
				 ORDER BY name COLLATE NOCASE ASC`,
			)

		return rows.map(mapRow)
	}

	async update (id: string, input: UpdateExerciseInput): Promise<Exercise> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`)
		}

		if (input.trackingType !== undefined) {
			assertTrackingType(input.trackingType)
		}

		const next: Exercise = {
			...existing,
			name: input.name?.trim() ?? existing.name,
			category: input.category ?? existing.category,
			muscleGroup: input.muscleGroup ?? existing.muscleGroup,
			equipment: input.equipment ?? existing.equipment,
			trackingType: input.trackingType ?? existing.trackingType,
			defaultRestSeconds:
				input.defaultRestSeconds ?? existing.defaultRestSeconds,
			weightStep:
				input.weightStep !== undefined
					? input.weightStep
					: existing.weightStep,
			notes: input.notes !== undefined ? input.notes : existing.notes,
			updatedAt: nowIso(),
		}

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
			 WHERE id = ?`,
			[
				next.name,
				next.category,
				next.muscleGroup,
				next.equipment,
				next.trackingType,
				next.defaultRestSeconds,
				next.weightStep,
				next.notes,
				next.updatedAt,
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
	 * Soft-delete: set archived_at without removing the row.
	 */
	async archive (id: string): Promise<Exercise> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Exercise not found: ${id}`)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE exercises
			 SET archived_at = ?, updated_at = ?
			 WHERE id = ?`,
			[timestamp, timestamp, id],
		)

		const archived = await this.getById(id)
		if (!archived) {
			throw new Error('Failed to read exercise after archive')
		}
		return archived
	}
}
