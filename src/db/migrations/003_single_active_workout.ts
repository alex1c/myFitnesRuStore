/**
 * Migration 003 — enforce the single-active-workout invariant in SQLite.
 */

export const MIGRATION_003_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_single_active
	ON workouts((1))
	WHERE finished_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_finished_at
	ON workouts(finished_at DESC, started_at DESC, id DESC)
	WHERE finished_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_workout
	ON workout_exercises(exercise_id, workout_id);

CREATE INDEX IF NOT EXISTS idx_sets_exercise_completed_position
	ON sets(workout_exercise_id, completed_at, position);
`
