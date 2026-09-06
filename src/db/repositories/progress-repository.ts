/**
 * Low-level progress queries over completed workout history.
 */
import type { TrackingType } from '@/src/domain/types'
import type { AppDatabase } from '../client'

export type CompletedSetHistoryRow = {
	setId: string
	workoutId: string
	workoutExerciseId: string
	exerciseId: string
	trackingType: TrackingType
	workoutName: string
	workoutStartedAt: string
	workoutFinishedAt: string
	setPosition: number
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
	completedAt: string
	setCreatedAt: string
}

export type ExerciseHistoryListItem = {
	exerciseId: string
	name: string
	trackingType: TrackingType
	archivedAt: string | null
	lastCompletedAt: string
}

export class ProgressRepository {
	constructor (private readonly db: AppDatabase) {}

	async countFinishedWorkouts (sinceIso: string | null): Promise<number> {
		if (sinceIso) {
			const row = await this.db.getFirstAsync<{ count: number }>(
				`SELECT COUNT(*) AS count FROM workouts
				 WHERE finished_at IS NOT NULL AND finished_at >= ?`,
				[sinceIso],
			)
			return row?.count ?? 0
		}
		const row = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM workouts WHERE finished_at IS NOT NULL`,
		)
		return row?.count ?? 0
	}

	async countCompletedSets (sinceIso: string | null): Promise<number> {
		if (sinceIso) {
			const row = await this.db.getFirstAsync<{ count: number }>(
				`SELECT COUNT(*) AS count
				 FROM sets s
				 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
				 INNER JOIN workouts w ON w.id = we.workout_id
				 WHERE s.completed_at IS NOT NULL
				   AND w.finished_at IS NOT NULL
				   AND w.finished_at >= ?`,
				[sinceIso],
			)
			return row?.count ?? 0
		}
		const row = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN workouts w ON w.id = we.workout_id
			 WHERE s.completed_at IS NOT NULL
			   AND w.finished_at IS NOT NULL`,
		)
		return row?.count ?? 0
	}

	/**
	 * Sum weight×reps only for weight_reps tracking (true kg tonnage).
	 */
	async sumWeightedVolumeKg (sinceIso: string | null): Promise<number> {
		const sql = sinceIso
			? `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS total
				 FROM sets s
				 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
				 INNER JOIN workouts w ON w.id = we.workout_id
				 INNER JOIN exercises e ON e.id = we.exercise_id
				 WHERE s.completed_at IS NOT NULL
				   AND w.finished_at IS NOT NULL
				   AND w.finished_at >= ?
				   AND e.tracking_type = 'weight_reps'
				   AND s.weight IS NOT NULL AND s.weight > 0
				   AND s.reps IS NOT NULL AND s.reps > 0`
			: `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS total
				 FROM sets s
				 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
				 INNER JOIN workouts w ON w.id = we.workout_id
				 INNER JOIN exercises e ON e.id = we.exercise_id
				 WHERE s.completed_at IS NOT NULL
				   AND w.finished_at IS NOT NULL
				   AND e.tracking_type = 'weight_reps'
				   AND s.weight IS NOT NULL AND s.weight > 0
				   AND s.reps IS NOT NULL AND s.reps > 0`
		const row = sinceIso
			? await this.db.getFirstAsync<{ total: number }>(sql, [sinceIso])
			: await this.db.getFirstAsync<{ total: number }>(sql)
		return row?.total ?? 0
	}

	async listExercisesWithHistory (): Promise<ExerciseHistoryListItem[]> {
		const rows = await this.db.getAllAsync<{
			exercise_id: string
			name: string
			tracking_type: string
			archived_at: string | null
			last_completed_at: string
		}>(
			`SELECT e.id AS exercise_id,
				e.name AS name,
				e.tracking_type AS tracking_type,
				e.archived_at AS archived_at,
				MAX(s.completed_at) AS last_completed_at
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN workouts w ON w.id = we.workout_id
			 INNER JOIN exercises e ON e.id = we.exercise_id
			 WHERE s.completed_at IS NOT NULL
			   AND w.finished_at IS NOT NULL
			 GROUP BY e.id
			 ORDER BY last_completed_at DESC, e.name COLLATE NOCASE ASC`,
		)
		return rows.map((row) => ({
			exerciseId: row.exercise_id,
			name: row.name,
			trackingType: row.tracking_type as TrackingType,
			archivedAt: row.archived_at,
			lastCompletedAt: row.last_completed_at,
		}))
	}

	async listCompletedSetsForExercise (
		exerciseId: string,
		options?: {
			sinceIso?: string | null
			/** Exclude this set id (e.g. current set before it is saved). */
			excludeSetId?: string | null
			/** Only sets completed strictly before this ISO timestamp. */
			beforeCompletedAt?: string | null
		},
	): Promise<CompletedSetHistoryRow[]> {
		const params: (string | number)[] = [exerciseId]
		const filters = [
			's.completed_at IS NOT NULL',
			'w.finished_at IS NOT NULL',
			'we.exercise_id = ?',
		]

		if (options?.sinceIso) {
			filters.push('w.finished_at >= ?')
			params.push(options.sinceIso)
		}
		if (options?.excludeSetId) {
			filters.push('s.id != ?')
			params.push(options.excludeSetId)
		}
		if (options?.beforeCompletedAt) {
			filters.push('s.completed_at < ?')
			params.push(options.beforeCompletedAt)
		}

		const rows = await this.db.getAllAsync<{
			set_id: string
			workout_id: string
			workout_exercise_id: string
			exercise_id: string
			tracking_type: string
			workout_name: string
			workout_started_at: string
			workout_finished_at: string
			set_position: number
			weight: number | null
			reps: number | null
			duration_seconds: number | null
			distance: number | null
			completed_at: string
			set_created_at: string
		}>(
			`SELECT s.id AS set_id,
				w.id AS workout_id,
				we.id AS workout_exercise_id,
				we.exercise_id AS exercise_id,
				e.tracking_type AS tracking_type,
				w.name AS workout_name,
				w.started_at AS workout_started_at,
				w.finished_at AS workout_finished_at,
				s.position AS set_position,
				s.weight AS weight,
				s.reps AS reps,
				s.duration_seconds AS duration_seconds,
				s.distance AS distance,
				s.completed_at AS completed_at,
				s.created_at AS set_created_at
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN workouts w ON w.id = we.workout_id
			 INNER JOIN exercises e ON e.id = we.exercise_id
			 WHERE ${filters.join(' AND ')}
			 ORDER BY w.finished_at ASC, w.id ASC, we.position ASC, s.position ASC, s.id ASC`,
			params,
		)

		return rows.map((row) => ({
			setId: row.set_id,
			workoutId: row.workout_id,
			workoutExerciseId: row.workout_exercise_id,
			exerciseId: row.exercise_id,
			trackingType: row.tracking_type as TrackingType,
			workoutName: row.workout_name,
			workoutStartedAt: row.workout_started_at,
			workoutFinishedAt: row.workout_finished_at,
			setPosition: row.set_position,
			weight: row.weight,
			reps: row.reps,
			durationSeconds: row.duration_seconds,
			distance: row.distance,
			completedAt: row.completed_at,
			setCreatedAt: row.set_created_at,
		}))
	}

	/**
	 * Completed sets for an exercise including the active (unfinished) workout.
	 * Used for live PR evaluation against prior history.
	 */
	async listPriorCompletedSetsForLivePr (
		exerciseId: string,
		excludeSetId: string,
	): Promise<CompletedSetHistoryRow[]> {
		const rows = await this.db.getAllAsync<{
			set_id: string
			workout_id: string
			workout_exercise_id: string
			exercise_id: string
			tracking_type: string
			workout_name: string
			workout_started_at: string
			workout_finished_at: string | null
			set_position: number
			weight: number | null
			reps: number | null
			duration_seconds: number | null
			distance: number | null
			completed_at: string
			set_created_at: string
		}>(
			`SELECT s.id AS set_id,
				w.id AS workout_id,
				we.id AS workout_exercise_id,
				we.exercise_id AS exercise_id,
				e.tracking_type AS tracking_type,
				w.name AS workout_name,
				w.started_at AS workout_started_at,
				w.finished_at AS workout_finished_at,
				s.position AS set_position,
				s.weight AS weight,
				s.reps AS reps,
				s.duration_seconds AS duration_seconds,
				s.distance AS distance,
				s.completed_at AS completed_at,
				s.created_at AS set_created_at
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN workouts w ON w.id = we.workout_id
			 INNER JOIN exercises e ON e.id = we.exercise_id
			 WHERE we.exercise_id = ?
			   AND s.completed_at IS NOT NULL
			   AND s.id != ?
			 ORDER BY s.completed_at ASC, s.id ASC`,
			[exerciseId, excludeSetId],
		)

		return rows.map((row) => ({
			setId: row.set_id,
			workoutId: row.workout_id,
			workoutExerciseId: row.workout_exercise_id,
			exerciseId: row.exercise_id,
			trackingType: row.tracking_type as TrackingType,
			workoutName: row.workout_name,
			workoutStartedAt: row.workout_started_at,
			workoutFinishedAt: row.workout_finished_at ?? row.workout_started_at,
			setPosition: row.set_position,
			weight: row.weight,
			reps: row.reps,
			durationSeconds: row.duration_seconds,
			distance: row.distance,
			completedAt: row.completed_at,
			setCreatedAt: row.set_created_at,
		}))
	}
}
