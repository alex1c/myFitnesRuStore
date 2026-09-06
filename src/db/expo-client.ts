/**
 * Expo SQLite production adapter.
 */
import * as SQLite from 'expo-sqlite'

import type { AppDatabase, SqlParams, SqlRunResult } from './client'

const DATABASE_NAME = 'my_sportzal.db'

function wrapExpoDatabase (db: SQLite.SQLiteDatabase): AppDatabase {
	return {
		execAsync: (source) => db.execAsync(source),
		runAsync: async (source, params = []): Promise<SqlRunResult> => {
			const result = await db.runAsync(source, params)
			return {
				changes: result.changes,
				lastInsertRowId: result.lastInsertRowId,
			}
		},
		getFirstAsync: <T>(source: string, params: SqlParams = []) =>
			db.getFirstAsync<T>(source, params),
		getAllAsync: <T>(source: string, params: SqlParams = []) =>
			db.getAllAsync<T>(source, params),
		withTransactionAsync: (task) => db.withTransactionAsync(task),
		closeAsync: () => db.closeAsync(),
	}
}

/**
 * Open the on-device database with foreign keys enabled.
 */
export async function openExpoDatabase (): Promise<AppDatabase> {
	const db = await SQLite.openDatabaseAsync(DATABASE_NAME)
	await db.execAsync('PRAGMA foreign_keys = ON;')
	return wrapExpoDatabase(db)
}
