/**
 * Low-level CRUD for workouts, workout exercises, and sets.
 */
import { assertSetType } from '@/src/domain/validation'
import type {
	CreateSetInput,
	UpdateSetInput,
	Workout,
	WorkoutExercise,
	WorkoutSet,
} from '@/src/domain/types'
import { DEFAULT_SET_TYPE } from '@/src/domain/constants'
import type { AppDatabase } from '../client'
import { createId } from '@/src/utils/id'
import { nowIso } from '@/src/utils/dates'

type WorkoutRow = {
	id: string
	template_id: string | null
	name: string
	started_at: string
	finished_at: string | null
	notes: string | null
	created_at: string
	updated_at: string
}

type WorkoutExerciseRow = {
	id: string
	workout_id: string
	exercise_id: string
	position: number
	notes: string | null
	created_at: string
	updated_at: string
}

type SetRow = {
	id: string
	workout_exercise_id: string
	position: number
	set_type: string
	weight: number | null
	reps: number | null
	duration_seconds: number | null
	distance: number | null
	completed_at: string | null
	created_at: string
	updated_at: string
}

function mapWorkout (row: WorkoutRow): Workout {
	return {
		id: row.id,
		templateId: row.template_id,
		name: row.name,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function mapWorkoutExercise (row: WorkoutExerciseRow): WorkoutExercise {
	return {
		id: row.id,
		workoutId: row.workout_id,
		exerciseId: row.exercise_id,
		position: row.position,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function mapSet (row: SetRow): WorkoutSet {
	return {
		id: row.id,
		workoutExerciseId: row.workout_exercise_id,
		position: row.position,
		setType: assertSetType(row.set_type),
		weight: row.weight,
		reps: row.reps,
		durationSeconds: row.duration_seconds,
		distance: row.distance,
		completedAt: row.completed_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export class WorkoutRepository {
	constructor (private readonly db: AppDatabase) {}

	async createWorkout (input: {
		name: string
		templateId?: string | null
		startedAt?: string
		notes?: string | null
	}): Promise<Workout> {
		const id = createId('wo')
		const timestamp = nowIso()
		const startedAt = input.startedAt ?? timestamp

		await this.db.runAsync(
			`INSERT INTO workouts (
				id, template_id, name, started_at, finished_at, notes, created_at, updated_at
			) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
			[
				id,
				input.templateId ?? null,
				input.name.trim(),
				startedAt,
				input.notes ?? null,
				timestamp,
				timestamp,
			],
		)

		const created = await this.getWorkoutById(id)
		if (!created) {
			throw new Error('Failed to read workout after create')
		}
		return created
	}

	async getWorkoutById (id: string): Promise<Workout | null> {
		const row = await this.db.getFirstAsync<WorkoutRow>(
			'SELECT * FROM workouts WHERE id = ?',
			[id],
		)
		return row ? mapWorkout(row) : null
	}

	async getActiveWorkout (): Promise<Workout | null> {
		const row = await this.db.getFirstAsync<WorkoutRow>(
			`SELECT * FROM workouts
			 WHERE finished_at IS NULL
			 ORDER BY started_at DESC
			 LIMIT 1`,
		)
		return row ? mapWorkout(row) : null
	}

	async listCompleted (): Promise<Workout[]> {
		const rows = await this.db.getAllAsync<WorkoutRow>(
			`SELECT * FROM workouts
			 WHERE finished_at IS NOT NULL
			 ORDER BY finished_at DESC`,
		)
		return rows.map(mapWorkout)
	}

	async updateWorkout (
		id: string,
		input: Partial<{
			name: string
			notes: string | null
			finishedAt: string | null
		}>,
	): Promise<Workout> {
		const existing = await this.getWorkoutById(id)
		if (!existing) {
			throw new Error(`Workout not found: ${id}`)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE workouts SET
				name = ?,
				notes = ?,
				finished_at = ?,
				updated_at = ?
			 WHERE id = ?`,
			[
				input.name ?? existing.name,
				input.notes !== undefined ? input.notes : existing.notes,
				input.finishedAt !== undefined
					? input.finishedAt
					: existing.finishedAt,
				timestamp,
				id,
			],
		)

		const updated = await this.getWorkoutById(id)
		if (!updated) {
			throw new Error('Failed to read workout after update')
		}
		return updated
	}

	async deleteWorkout (id: string): Promise<void> {
		await this.db.runAsync('DELETE FROM workouts WHERE id = ?', [id])
	}

	async addWorkoutExercise (input: {
		workoutId: string
		exerciseId: string
		position?: number
		notes?: string | null
	}): Promise<WorkoutExercise> {
		const id = createId('wex')
		const timestamp = nowIso()
		const position =
			input.position ?? (await this.nextExercisePosition(input.workoutId))

		await this.db.runAsync(
			`INSERT INTO workout_exercises (
				id, workout_id, exercise_id, position, notes, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.workoutId,
				input.exerciseId,
				position,
				input.notes ?? null,
				timestamp,
				timestamp,
			],
		)

		await this.touchWorkout(input.workoutId, timestamp)
		const created = await this.getWorkoutExerciseById(id)
		if (!created) {
			throw new Error('Failed to read workout exercise after create')
		}
		return created
	}

	async getWorkoutExerciseById (id: string): Promise<WorkoutExercise | null> {
		const row = await this.db.getFirstAsync<WorkoutExerciseRow>(
			'SELECT * FROM workout_exercises WHERE id = ?',
			[id],
		)
		return row ? mapWorkoutExercise(row) : null
	}

	async listWorkoutExercises (workoutId: string): Promise<WorkoutExercise[]> {
		const rows = await this.db.getAllAsync<WorkoutExerciseRow>(
			`SELECT * FROM workout_exercises
			 WHERE workout_id = ?
			 ORDER BY position ASC`,
			[workoutId],
		)
		return rows.map(mapWorkoutExercise)
	}

	async updateWorkoutExercise (
		id: string,
		input: Partial<{ exerciseId: string; notes: string | null; position: number }>,
	): Promise<WorkoutExercise> {
		const existing = await this.getWorkoutExerciseById(id)
		if (!existing) {
			throw new Error(`Workout exercise not found: ${id}`)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE workout_exercises SET
				exercise_id = ?,
				notes = ?,
				position = ?,
				updated_at = ?
			 WHERE id = ?`,
			[
				input.exerciseId ?? existing.exerciseId,
				input.notes !== undefined ? input.notes : existing.notes,
				input.position ?? existing.position,
				timestamp,
				id,
			],
		)
		await this.touchWorkout(existing.workoutId, timestamp)

		const updated = await this.getWorkoutExerciseById(id)
		if (!updated) {
			throw new Error('Failed to read workout exercise after update')
		}
		return updated
	}

	async deleteWorkoutExercise (id: string): Promise<void> {
		const existing = await this.getWorkoutExerciseById(id)
		if (!existing) {
			throw new Error(`Workout exercise not found: ${id}`)
		}
		await this.db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id])
		await this.renumberExercises(existing.workoutId)
		await this.touchWorkout(existing.workoutId, nowIso())
	}

	async reorderWorkoutExercises (
		workoutId: string,
		orderedIds: string[],
	): Promise<WorkoutExercise[]> {
		const timestamp = nowIso()
		await this.db.withTransactionAsync(async () => {
			for (let index = 0; index < orderedIds.length; index += 1) {
				const id = orderedIds[index]
				if (!id) {
					continue
				}
				await this.db.runAsync(
					`UPDATE workout_exercises
					 SET position = ?, updated_at = ?
					 WHERE id = ? AND workout_id = ?`,
					[index, timestamp, id, workoutId],
				)
			}
			await this.db.runAsync(
				'UPDATE workouts SET updated_at = ? WHERE id = ?',
				[timestamp, workoutId],
			)
		})
		return this.listWorkoutExercises(workoutId)
	}

	async createSet (input: CreateSetInput): Promise<WorkoutSet> {
		const id = createId('set')
		const timestamp = nowIso()
		const setType = input.setType ?? DEFAULT_SET_TYPE
		assertSetType(setType)
		const position =
			input.position ??
			(await this.nextSetPosition(input.workoutExerciseId))

		await this.db.runAsync(
			`INSERT INTO sets (
				id, workout_exercise_id, position, set_type,
				weight, reps, duration_seconds, distance, completed_at,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.workoutExerciseId,
				position,
				setType,
				input.weight ?? null,
				input.reps ?? null,
				input.durationSeconds ?? null,
				input.distance ?? null,
				input.completedAt ?? null,
				timestamp,
				timestamp,
			],
		)

		const we = await this.getWorkoutExerciseById(input.workoutExerciseId)
		if (we) {
			await this.touchWorkout(we.workoutId, timestamp)
		}

		const created = await this.getSetById(id)
		if (!created) {
			throw new Error('Failed to read set after create')
		}
		return created
	}

	async getSetById (id: string): Promise<WorkoutSet | null> {
		const row = await this.db.getFirstAsync<SetRow>(
			'SELECT * FROM sets WHERE id = ?',
			[id],
		)
		return row ? mapSet(row) : null
	}

	async listSets (workoutExerciseId: string): Promise<WorkoutSet[]> {
		const rows = await this.db.getAllAsync<SetRow>(
			`SELECT * FROM sets
			 WHERE workout_exercise_id = ?
			 ORDER BY position ASC`,
			[workoutExerciseId],
		)
		return rows.map(mapSet)
	}

	async listCompletedSets (workoutExerciseId: string): Promise<WorkoutSet[]> {
		const rows = await this.db.getAllAsync<SetRow>(
			`SELECT * FROM sets
			 WHERE workout_exercise_id = ? AND completed_at IS NOT NULL
			 ORDER BY position ASC`,
			[workoutExerciseId],
		)
		return rows.map(mapSet)
	}

	async updateSet (id: string, input: UpdateSetInput): Promise<WorkoutSet> {
		const existing = await this.getSetById(id)
		if (!existing) {
			throw new Error(`Set not found: ${id}`)
		}
		if (input.setType !== undefined) {
			assertSetType(input.setType)
		}

		const timestamp = nowIso()
		await this.db.runAsync(
			`UPDATE sets SET
				set_type = ?,
				weight = ?,
				reps = ?,
				duration_seconds = ?,
				distance = ?,
				position = ?,
				completed_at = ?,
				updated_at = ?
			 WHERE id = ?`,
			[
				input.setType ?? existing.setType,
				input.weight !== undefined ? input.weight : existing.weight,
				input.reps !== undefined ? input.reps : existing.reps,
				input.durationSeconds !== undefined
					? input.durationSeconds
					: existing.durationSeconds,
				input.distance !== undefined ? input.distance : existing.distance,
				input.position ?? existing.position,
				input.completedAt !== undefined
					? input.completedAt
					: existing.completedAt,
				timestamp,
				id,
			],
		)

		const we = await this.getWorkoutExerciseById(existing.workoutExerciseId)
		if (we) {
			await this.touchWorkout(we.workoutId, timestamp)
		}

		const updated = await this.getSetById(id)
		if (!updated) {
			throw new Error('Failed to read set after update')
		}
		return updated
	}

	async deleteSet (id: string): Promise<void> {
		const existing = await this.getSetById(id)
		if (!existing) {
			throw new Error(`Set not found: ${id}`)
		}
		await this.db.runAsync('DELETE FROM sets WHERE id = ?', [id])
		await this.renumberSets(existing.workoutExerciseId)
		const we = await this.getWorkoutExerciseById(existing.workoutExerciseId)
		if (we) {
			await this.touchWorkout(we.workoutId, nowIso())
		}
	}

	/**
	 * Find completed sets for an exercise from the latest finished workout
	 * that started before the given timestamp (typically current workout start).
	 */
	async findPreviousCompletedSets (
		exerciseId: string,
		beforeStartedAt: string,
	): Promise<WorkoutSet[]> {
		const workout = await this.db.getFirstAsync<{ id: string }>(
			`SELECT w.id AS id
			 FROM workouts w
			 INNER JOIN workout_exercises we ON we.workout_id = w.id
			 WHERE w.finished_at IS NOT NULL
			   AND w.started_at < ?
			   AND we.exercise_id = ?
			 ORDER BY w.finished_at DESC
			 LIMIT 1`,
			[beforeStartedAt, exerciseId],
		)
		if (!workout) {
			return []
		}

		const we = await this.db.getFirstAsync<{ id: string }>(
			`SELECT id FROM workout_exercises
			 WHERE workout_id = ? AND exercise_id = ?
			 ORDER BY position ASC
			 LIMIT 1`,
			[workout.id, exerciseId],
		)
		if (!we) {
			return []
		}

		return this.listCompletedSets(we.id)
	}

	async countCompletedSetsInWorkout (workoutId: string): Promise<number> {
		const row = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 WHERE we.workout_id = ? AND s.completed_at IS NOT NULL`,
			[workoutId],
		)
		return row?.count ?? 0
	}

	async countCompletedSetsForExercise (
		workoutExerciseId: string,
	): Promise<number> {
		const row = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM sets
			 WHERE workout_exercise_id = ? AND completed_at IS NOT NULL`,
			[workoutExerciseId],
		)
		return row?.count ?? 0
	}

	private async nextExercisePosition (workoutId: string): Promise<number> {
		const row = await this.db.getFirstAsync<{ max_position: number | null }>(
			`SELECT MAX(position) AS max_position
			 FROM workout_exercises WHERE workout_id = ?`,
			[workoutId],
		)
		return (row?.max_position ?? -1) + 1
	}

	private async nextSetPosition (workoutExerciseId: string): Promise<number> {
		const row = await this.db.getFirstAsync<{ max_position: number | null }>(
			`SELECT MAX(position) AS max_position FROM sets
			 WHERE workout_exercise_id = ?`,
			[workoutExerciseId],
		)
		return (row?.max_position ?? -1) + 1
	}

	private async renumberExercises (workoutId: string): Promise<void> {
		const rows = await this.listWorkoutExercises(workoutId)
		const timestamp = nowIso()
		for (let index = 0; index < rows.length; index += 1) {
			const row = rows[index]
			if (!row || row.position === index) {
				continue
			}
			await this.db.runAsync(
				`UPDATE workout_exercises SET position = ?, updated_at = ? WHERE id = ?`,
				[index, timestamp, row.id],
			)
		}
	}

	private async renumberSets (workoutExerciseId: string): Promise<void> {
		const rows = await this.listSets(workoutExerciseId)
		const timestamp = nowIso()
		for (let index = 0; index < rows.length; index += 1) {
			const row = rows[index]
			if (!row || row.position === index) {
				continue
			}
			await this.db.runAsync(
				`UPDATE sets SET position = ?, updated_at = ? WHERE id = ?`,
				[index, timestamp, row.id],
			)
		}
	}

	private async touchWorkout (workoutId: string, timestamp: string): Promise<void> {
		await this.db.runAsync(
			'UPDATE workouts SET updated_at = ? WHERE id = ?',
			[timestamp, workoutId],
		)
	}
}
