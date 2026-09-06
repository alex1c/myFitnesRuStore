/**
 * Migration 005 — indexes for progress / history aggregations.
 */
export const MIGRATION_005_SQL = `
CREATE INDEX IF NOT EXISTS idx_sets_completed_lookup
	ON sets(completed_at, workout_exercise_id)
	WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_finished_started
	ON workouts(finished_at, started_at, id)
	WHERE finished_at IS NOT NULL;
`
