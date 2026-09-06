/**
 * WorkoutTemplateRepository — full template planning API for Phase 2.
 */
import type {
	AddTemplateExerciseInput,
	CreateWorkoutTemplateInput,
	TemplateExercise,
	UpdateTemplateExerciseInput,
	WorkoutTemplate,
	WorkoutTemplateDetail,
} from '@/src/domain/types'
import { validateTemplateName } from '@/src/features/templates/form-validation'
import type { AppDatabase } from '../client'
import { createId } from '@/src/utils/id'
import { nowIso } from '@/src/utils/dates'

type TemplateRow = {
	id: string
	name: string
	description: string | null
	position: number
	created_at: string
	updated_at: string
	archived_at: string | null
}

type TemplateExerciseRow = {
	id: string
	template_id: string
	exercise_id: string
	position: number
	planned_sets: number | null
	target_reps_min: number | null
	target_reps_max: number | null
	rest_seconds: number | null
	created_at: string
	updated_at: string
}

function mapTemplate (row: TemplateRow): WorkoutTemplate {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		position: row.position,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		archivedAt: row.archived_at,
	}
}

function mapTemplateExercise (row: TemplateExerciseRow): TemplateExercise {
	return {
		id: row.id,
		templateId: row.template_id,
		exerciseId: row.exercise_id,
		position: row.position,
		plannedSets: row.planned_sets,
		targetRepsMin: row.target_reps_min,
		targetRepsMax: row.target_reps_max,
		restSeconds: row.rest_seconds,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export class WorkoutTemplateRepository {
	constructor (private readonly db: AppDatabase) {}

	async create (input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
		const id = createId('tpl')
		const timestamp = nowIso()
		const name = validateTemplateName(input.name)
		const description = input.description?.trim()
			? input.description.trim()
			: null
		const position =
			input.position ?? (await this.nextTemplatePosition())

		await this.db.runAsync(
			`INSERT INTO workout_templates (
				id, name, description, position, created_at, updated_at, archived_at
			) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
			[id, name, description, position, timestamp, timestamp],
		)

		const created = await this.getById(id)
		if (!created) {
			throw new Error('Failed to read template after create')
		}
		return created
	}

	async getById (id: string): Promise<WorkoutTemplate | null> {
		const row = await this.db.getFirstAsync<TemplateRow>(
			'SELECT * FROM workout_templates WHERE id = ?',
			[id],
		)
		return row ? mapTemplate(row) : null
	}

	async getDetail (id: string): Promise<WorkoutTemplateDetail | null> {
		const template = await this.getById(id)
		if (!template) {
			return null
		}
		const exercises = await this.listExercises(id)
		return { template, exercises }
	}

	async list (options?: { includeArchived?: boolean }): Promise<WorkoutTemplate[]> {
		const includeArchived = options?.includeArchived === true
		const rows = includeArchived
			? await this.db.getAllAsync<TemplateRow>(
				`SELECT * FROM workout_templates
				 ORDER BY position ASC, name COLLATE NOCASE ASC`,
			)
			: await this.db.getAllAsync<TemplateRow>(
				`SELECT * FROM workout_templates
				 WHERE archived_at IS NULL
				 ORDER BY position ASC, name COLLATE NOCASE ASC`,
			)

		return rows.map(mapTemplate)
	}

	async listArchived (): Promise<WorkoutTemplate[]> {
		const rows = await this.db.getAllAsync<TemplateRow>(
			`SELECT * FROM workout_templates
			 WHERE archived_at IS NOT NULL
			 ORDER BY archived_at DESC`,
		)
		return rows.map(mapTemplate)
	}

	async update (
		id: string,
		input: Partial<CreateWorkoutTemplateInput>,
	): Promise<WorkoutTemplate> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Workout template not found: ${id}`)
		}

		const name =
			input.name !== undefined
				? validateTemplateName(input.name)
				: existing.name
		const description =
			input.description !== undefined
				? input.description?.trim()
					? input.description.trim()
					: null
				: existing.description

		const next = {
			name,
			description,
			position: input.position ?? existing.position,
			updatedAt: nowIso(),
		}

		await this.db.runAsync(
			`UPDATE workout_templates
			 SET name = ?, description = ?, position = ?, updated_at = ?
			 WHERE id = ?`,
			[next.name, next.description, next.position, next.updatedAt, id],
		)

		const updated = await this.getById(id)
		if (!updated) {
			throw new Error('Failed to read template after update')
		}
		return updated
	}

	async archive (id: string): Promise<WorkoutTemplate> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Workout template not found: ${id}`)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE workout_templates
			 SET archived_at = ?, updated_at = ?
			 WHERE id = ?`,
			[timestamp, timestamp, id],
		)

		const archived = await this.getById(id)
		if (!archived) {
			throw new Error('Failed to read template after archive')
		}
		return archived
	}

	async restore (id: string): Promise<WorkoutTemplate> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Workout template not found: ${id}`)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE workout_templates
			 SET archived_at = NULL, updated_at = ?
			 WHERE id = ?`,
			[timestamp, id],
		)

		const restored = await this.getById(id)
		if (!restored) {
			throw new Error('Failed to read template after restore')
		}
		return restored
	}

	/**
	 * Duplicate template and all exercise rows in one transaction.
	 */
	async duplicate (id: string): Promise<WorkoutTemplate> {
		const detail = await this.getDetail(id)
		if (!detail) {
			throw new Error(`Workout template not found: ${id}`)
		}

		const newTemplateId = createId('tpl')
		const timestamp = nowIso()
		const position = await this.nextTemplatePosition()
		const copyName = `${detail.template.name} — копия`

		await this.db.withTransactionAsync(async () => {
			await this.db.runAsync(
				`INSERT INTO workout_templates (
					id, name, description, position, created_at, updated_at, archived_at
				) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
				[
					newTemplateId,
					copyName,
					detail.template.description,
					position,
					timestamp,
					timestamp,
				],
			)

			for (const exercise of detail.exercises) {
				await this.db.runAsync(
					`INSERT INTO template_exercises (
						id, template_id, exercise_id, position,
						planned_sets, target_reps_min, target_reps_max, rest_seconds,
						created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						createId('tpex'),
						newTemplateId,
						exercise.exerciseId,
						exercise.position,
						exercise.plannedSets,
						exercise.targetRepsMin,
						exercise.targetRepsMax,
						exercise.restSeconds,
						timestamp,
						timestamp,
					],
				)
			}
		})

		const created = await this.getById(newTemplateId)
		if (!created) {
			throw new Error('Failed to read duplicated template')
		}
		return created
	}

	async addExercise (
		input: AddTemplateExerciseInput,
	): Promise<TemplateExercise> {
		const template = await this.getById(input.templateId)
		if (!template) {
			throw new Error(`Workout template not found: ${input.templateId}`)
		}

		const id = createId('tpex')
		const timestamp = nowIso()
		const position =
			input.position ?? (await this.nextExercisePosition(input.templateId))

		await this.db.runAsync(
			`INSERT INTO template_exercises (
				id, template_id, exercise_id, position,
				planned_sets, target_reps_min, target_reps_max, rest_seconds,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.templateId,
				input.exerciseId,
				position,
				input.plannedSets ?? null,
				input.targetRepsMin ?? null,
				input.targetRepsMax ?? null,
				input.restSeconds ?? null,
				timestamp,
				timestamp,
			],
		)

		await this.touchTemplate(input.templateId, timestamp)

		const row = await this.db.getFirstAsync<TemplateExerciseRow>(
			'SELECT * FROM template_exercises WHERE id = ?',
			[id],
		)
		if (!row) {
			throw new Error('Failed to read template exercise after create')
		}
		return mapTemplateExercise(row)
	}

	async updateExercise (
		templateExerciseId: string,
		input: UpdateTemplateExerciseInput,
	): Promise<TemplateExercise> {
		const existing = await this.getTemplateExerciseById(templateExerciseId)
		if (!existing) {
			throw new Error(`Template exercise not found: ${templateExerciseId}`)
		}

		const timestamp = nowIso()
		const next = {
			plannedSets:
				input.plannedSets !== undefined
					? input.plannedSets
					: existing.plannedSets,
			targetRepsMin:
				input.targetRepsMin !== undefined
					? input.targetRepsMin
					: existing.targetRepsMin,
			targetRepsMax:
				input.targetRepsMax !== undefined
					? input.targetRepsMax
					: existing.targetRepsMax,
			restSeconds:
				input.restSeconds !== undefined
					? input.restSeconds
					: existing.restSeconds,
			position:
				input.position !== undefined ? input.position : existing.position,
		}

		await this.db.runAsync(
			`UPDATE template_exercises SET
				planned_sets = ?,
				target_reps_min = ?,
				target_reps_max = ?,
				rest_seconds = ?,
				position = ?,
				updated_at = ?
			 WHERE id = ?`,
			[
				next.plannedSets,
				next.targetRepsMin,
				next.targetRepsMax,
				next.restSeconds,
				next.position,
				timestamp,
				templateExerciseId,
			],
		)

		await this.touchTemplate(existing.templateId, timestamp)

		const updated = await this.getTemplateExerciseById(templateExerciseId)
		if (!updated) {
			throw new Error('Failed to read template exercise after update')
		}
		return updated
	}

	async removeExercise (templateExerciseId: string): Promise<void> {
		const existing = await this.getTemplateExerciseById(templateExerciseId)
		if (!existing) {
			throw new Error(`Template exercise not found: ${templateExerciseId}`)
		}

		await this.db.runAsync(
			'DELETE FROM template_exercises WHERE id = ?',
			[templateExerciseId],
		)
		await this.renumberPositions(existing.templateId)
		await this.touchTemplate(existing.templateId, nowIso())
	}

	/**
	 * Reorder exercises by ordered list of template_exercise ids.
	 */
	async reorderExercises (
		templateId: string,
		orderedIds: string[],
	): Promise<TemplateExercise[]> {
		const existing = await this.listExercises(templateId)
		if (existing.length !== orderedIds.length) {
			throw new Error('Reorder list must include every template exercise')
		}

		const existingIds = new Set(existing.map((item) => item.id))
		for (const id of orderedIds) {
			if (!existingIds.has(id)) {
				throw new Error(`Unknown template exercise in reorder: ${id}`)
			}
		}

		const timestamp = nowIso()
		await this.db.withTransactionAsync(async () => {
			for (let index = 0; index < orderedIds.length; index += 1) {
				const id = orderedIds[index]
				if (!id) {
					continue
				}
				await this.db.runAsync(
					`UPDATE template_exercises
					 SET position = ?, updated_at = ?
					 WHERE id = ? AND template_id = ?`,
					[index, timestamp, id, templateId],
				)
			}
			await this.db.runAsync(
				`UPDATE workout_templates SET updated_at = ? WHERE id = ?`,
				[timestamp, templateId],
			)
		})

		return this.listExercises(templateId)
	}

	async moveExercise (
		templateExerciseId: string,
		direction: 'up' | 'down',
	): Promise<TemplateExercise[]> {
		const current = await this.getTemplateExerciseById(templateExerciseId)
		if (!current) {
			throw new Error(`Template exercise not found: ${templateExerciseId}`)
		}

		const list = await this.listExercises(current.templateId)
		const index = list.findIndex((item) => item.id === templateExerciseId)
		if (index < 0) {
			throw new Error('Template exercise missing from list')
		}

		const swapWith = direction === 'up' ? index - 1 : index + 1
		if (swapWith < 0 || swapWith >= list.length) {
			return list
		}

		const ordered = list.map((item) => item.id)
		const temp = ordered[index]
		const other = ordered[swapWith]
		if (!temp || !other) {
			return list
		}
		ordered[index] = other
		ordered[swapWith] = temp

		return this.reorderExercises(current.templateId, ordered)
	}

	async listExercises (templateId: string): Promise<TemplateExercise[]> {
		const rows = await this.db.getAllAsync<TemplateExerciseRow>(
			`SELECT * FROM template_exercises
			 WHERE template_id = ?
			 ORDER BY position ASC`,
			[templateId],
		)
		return rows.map(mapTemplateExercise)
	}

	async countExerciseOccurrences (
		templateId: string,
		exerciseId: string,
	): Promise<number> {
		const row = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM template_exercises
			 WHERE template_id = ? AND exercise_id = ?`,
			[templateId, exerciseId],
		)
		return row?.count ?? 0
	}

	async getTemplateExerciseById (
		id: string,
	): Promise<TemplateExercise | null> {
		const row = await this.db.getFirstAsync<TemplateExerciseRow>(
			'SELECT * FROM template_exercises WHERE id = ?',
			[id],
		)
		return row ? mapTemplateExercise(row) : null
	}

	private async nextTemplatePosition (): Promise<number> {
		const row = await this.db.getFirstAsync<{ max_position: number | null }>(
			'SELECT MAX(position) AS max_position FROM workout_templates',
		)
		return (row?.max_position ?? -1) + 1
	}

	private async nextExercisePosition (templateId: string): Promise<number> {
		const row = await this.db.getFirstAsync<{ max_position: number | null }>(
			`SELECT MAX(position) AS max_position
			 FROM template_exercises WHERE template_id = ?`,
			[templateId],
		)
		return (row?.max_position ?? -1) + 1
	}

	private async renumberPositions (templateId: string): Promise<void> {
		const rows = await this.listExercises(templateId)
		const timestamp = nowIso()
		await this.db.withTransactionAsync(async () => {
			for (let index = 0; index < rows.length; index += 1) {
				const row = rows[index]
				if (!row || row.position === index) {
					continue
				}
				await this.db.runAsync(
					`UPDATE template_exercises
					 SET position = ?, updated_at = ?
					 WHERE id = ?`,
					[index, timestamp, row.id],
				)
			}
		})
	}

	private async touchTemplate (
		templateId: string,
		timestamp: string,
	): Promise<void> {
		await this.db.runAsync(
			`UPDATE workout_templates SET updated_at = ? WHERE id = ?`,
			[timestamp, templateId],
		)
	}
}
