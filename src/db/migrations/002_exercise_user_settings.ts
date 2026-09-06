/**
 * Migration 002 — per-user settings for exercises (esp. built-ins).
 * Keeps catalog seed updates from overwriting personal rest / step / notes.
 */

export const MIGRATION_002_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercise_user_settings (
	exercise_id TEXT PRIMARY KEY NOT NULL,
	default_rest_seconds INTEGER,
	weight_step REAL,
	notes TEXT,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercise_user_settings_updated_at
	ON exercise_user_settings(updated_at);

CREATE TABLE IF NOT EXISTS app_meta (
	key TEXT PRIMARY KEY NOT NULL,
	value TEXT NOT NULL
);
`
