/**
 * Database bootstrap helpers shared by app and tests.
 */
import type { AppDatabase } from './client'
import { LATEST_SCHEMA_VERSION, runMigrations } from './migrations'

export type DatabaseInitResult = {
	db: AppDatabase
	schemaVersion: number
}

/**
 * Initialize an already-opened AppDatabase (used by tests with memory driver).
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

	return { db, schemaVersion }
}
