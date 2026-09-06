/**
 * Idempotent seeder for the built-in exercise catalog.
 * Upserts catalog fields by stable id without touching user settings overrides.
 */
import type { AppDatabase } from '../client'
import { nowIso } from '@/src/utils/dates'
import {
	BUILTIN_EXERCISES,
	BUILTIN_EXERCISE_SEED_VERSION,
} from './builtin-exercises'

const SEED_META_KEY = 'builtin_exercise_seed_version'

/**
 * Upsert built-in exercises without opening a nested transaction.
 * Safe to call inside an outer restore transaction.
 */
export async function upsertBuiltinExercises (db: AppDatabase): Promise<void> {
	const timestamp = nowIso()
	for (const exercise of BUILTIN_EXERCISES) {
		await db.runAsync(
			`INSERT INTO exercises (
				id, name, category, muscle_group, equipment, tracking_type,
				default_rest_seconds, weight_step, notes, is_custom,
				created_at, updated_at, archived_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, NULL)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				category = excluded.category,
				muscle_group = excluded.muscle_group,
				equipment = excluded.equipment,
				tracking_type = excluded.tracking_type,
				default_rest_seconds = excluded.default_rest_seconds,
				weight_step = excluded.weight_step,
				is_custom = 0,
				updated_at = excluded.updated_at
			WHERE exercises.is_custom = 0`,
			[
				exercise.id,
				exercise.name,
				exercise.category,
				exercise.muscleGroup,
				exercise.equipment,
				exercise.trackingType,
				exercise.defaultRestSeconds,
				exercise.weightStep,
				timestamp,
				timestamp,
			],
		)
	}

	await db.runAsync(
		`INSERT INTO app_meta (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		[SEED_META_KEY, BUILTIN_EXERCISE_SEED_VERSION],
	)
}

/**
 * Insert or refresh built-in exercises inside its own transaction.
 */
export async function seedBuiltinExercises (db: AppDatabase): Promise<number> {
	await db.withTransactionAsync(async () => {
		await upsertBuiltinExercises(db)
	})

	const row = await db.getFirstAsync<{ count: number }>(
		'SELECT COUNT(*) AS count FROM exercises WHERE is_custom = 0',
	)
	return row?.count ?? 0
}

export async function getBuiltinSeedVersion (
	db: AppDatabase,
): Promise<string | null> {
	const row = await db.getFirstAsync<{ value: string }>(
		'SELECT value FROM app_meta WHERE key = ?',
		[SEED_META_KEY],
	)
	return row?.value ?? null
}
