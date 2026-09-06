/**
 * Migration 004 — rest timer persistence + workout exercise rest snapshot.
 *
 * rest_seconds on workout_exercises freezes template/exercise rest at start
 * so later template edits cannot change an in-progress workout.
 *
 * workouts.rest_* columns store a single absolute-end rest timer.
 */
export const MIGRATION_004_SQL = `
ALTER TABLE workout_exercises ADD COLUMN rest_seconds INTEGER;

ALTER TABLE workouts ADD COLUMN rest_started_at TEXT;
ALTER TABLE workouts ADD COLUMN rest_ends_at TEXT;
ALTER TABLE workouts ADD COLUMN rest_workout_exercise_id TEXT;
ALTER TABLE workouts ADD COLUMN rest_set_id TEXT;
ALTER TABLE workouts ADD COLUMN rest_notification_id TEXT;
`
