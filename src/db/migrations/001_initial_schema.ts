/**
 * Migration 001 — foundational schema for workouts and exercises.
 * Dates are ISO-8601 TEXT. Numeric tracking fields stay nullable when unused.
 */

export const MIGRATION_001_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
	version INTEGER PRIMARY KEY NOT NULL,
	applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	muscle_group TEXT NOT NULL,
	equipment TEXT NOT NULL,
	tracking_type TEXT NOT NULL,
	default_rest_seconds INTEGER NOT NULL DEFAULT 90,
	weight_step REAL,
	notes TEXT,
	is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	archived_at TEXT
);

CREATE TABLE IF NOT EXISTS workout_templates (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	description TEXT,
	position INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	archived_at TEXT
);

CREATE TABLE IF NOT EXISTS template_exercises (
	id TEXT PRIMARY KEY NOT NULL,
	template_id TEXT NOT NULL,
	exercise_id TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	planned_sets INTEGER,
	target_reps_min INTEGER,
	target_reps_max INTEGER,
	rest_seconds INTEGER,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
	FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS workouts (
	id TEXT PRIMARY KEY NOT NULL,
	template_id TEXT,
	name TEXT NOT NULL,
	started_at TEXT NOT NULL,
	finished_at TEXT,
	notes TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
	id TEXT PRIMARY KEY NOT NULL,
	workout_id TEXT NOT NULL,
	exercise_id TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	notes TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
	FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sets (
	id TEXT PRIMARY KEY NOT NULL,
	workout_exercise_id TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	set_type TEXT NOT NULL DEFAULT 'working',
	weight REAL,
	reps INTEGER,
	duration_seconds INTEGER,
	distance REAL,
	completed_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercises_archived_at
	ON exercises(archived_at);

CREATE INDEX IF NOT EXISTS idx_exercises_name
	ON exercises(name);

CREATE INDEX IF NOT EXISTS idx_workout_templates_position
	ON workout_templates(position);

CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id
	ON template_exercises(template_id);

CREATE INDEX IF NOT EXISTS idx_template_exercises_exercise_id
	ON template_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workouts_started_at
	ON workouts(started_at);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id
	ON workout_exercises(workout_id);

CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id
	ON sets(workout_exercise_id);
`
