/**
 * WorkoutTemplateRepository — basic CRUD scaffold for Phase 0.
 */
import type {
	CreateWorkoutTemplateInput,
	TemplateExercise,
	WorkoutTemplate,
} from '@/src/domain/types'
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
		const position = input.position ?? 0

		await this.db.runAsync(
			`INSERT INTO workout_templates (
				id, name, description, position, created_at, updated_at, archived_at
			) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
			[
				id,
				input.name.trim(),
				input.description ?? null,
				position,
				timestamp,
				timestamp,
			],
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

	async update (
		id: string,
		input: Partial<CreateWorkoutTemplateInput>,
	): Promise<WorkoutTemplate> {
		const existing = await this.getById(id)
		if (!existing) {
			throw new Error(`Workout template not found: ${id}`)
		}

		const next = {
			name: input.name?.trim() ?? existing.name,
			description:
				input.description !== undefined
					? input.description
					: existing.description,
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

	/**
	 * Attach an exercise to a template (FK smoke path for Phase 0).
	 */
	async addExercise (input: {
		templateId: string
		exerciseId: string
		position?: number
		plannedSets?: number | null
		targetRepsMin?: number | null
		targetRepsMax?: number | null
		restSeconds?: number | null
	}): Promise<TemplateExercise> {
		const id = createId('tpex')
		const timestamp = nowIso()

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
				input.position ?? 0,
				input.plannedSets ?? null,
				input.targetRepsMin ?? null,
				input.targetRepsMax ?? null,
				input.restSeconds ?? null,
				timestamp,
				timestamp,
			],
		)

		const row = await this.db.getFirstAsync<TemplateExerciseRow>(
			'SELECT * FROM template_exercises WHERE id = ?',
			[id],
		)
		if (!row) {
			throw new Error('Failed to read template exercise after create')
		}
		return mapTemplateExercise(row)
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
}
