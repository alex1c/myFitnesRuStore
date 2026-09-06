/**
 * Database bootstrap helpers shared by app and tests.
 */
import type { AppDatabase } from './client'
import { LATEST_SCHEMA_VERSION, runMigrations } from './migrations'
import { seedBuiltinExercises } from './seed/seed-builtin-exercises'

export type DatabaseInitResult = {
	db: AppDatabase
	schemaVersion: number
	builtinExerciseCount: number
}

/**
 * Initialize an already-opened AppDatabase (used by tests with memory driver).
 * Runs migrations, then idempotent built-in exercise seed.
 */
export async function initializeProvidedDatabase (
	db: AppDatabase,
): Promise<DatabaseInitResult> {
	const schemaVersion = await runMigrations(db)

	if (schemaVersion < LATEST_SCHEMA_VERSION) {
		throw new Error(
			`Database schema incomplete: expected ${LATEST_SCHEMA_VERSION}, got ${schemaVersion}`,
		)
	}

	const builtinExerciseCount = await seedBuiltinExercises(db)

	return { db, schemaVersion, builtinExerciseCount }
}
