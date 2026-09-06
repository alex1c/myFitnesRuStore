/**
 * Production database bootstrap using Expo SQLite.
 * Kept separate from init.ts so Jest can exercise migrations without native modules.
 */
import { openExpoDatabase } from './expo-client'
import {
	initializeProvidedDatabase,
	type DatabaseInitResult,
} from './init'
import { LATEST_SCHEMA_VERSION } from './migrations'

/**
 * Initialize the on-device database for the mobile app.
 */
export async function initializeDatabase (): Promise<DatabaseInitResult> {
	const db = await openExpoDatabase()
	const result = await initializeProvidedDatabase(db)

	if (result.schemaVersion < LATEST_SCHEMA_VERSION) {
		throw new Error(
			`Database schema incomplete: expected ${LATEST_SCHEMA_VERSION}, got ${result.schemaVersion}`,
		)
	}

	return result
}
