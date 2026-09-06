/**
 * Thin async database contract shared by Expo SQLite and the Jest memory adapter.
 * Repositories depend on this interface, not on a specific driver.
 */

export type SqlParams = (string | number | null | boolean)[]

export type SqlRunResult = {
	changes: number
	lastInsertRowId: number
}

export interface AppDatabase {
	execAsync: (source: string) => Promise<void>
	runAsync: (source: string, params?: SqlParams) => Promise<SqlRunResult>
	getFirstAsync: <T>(
		source: string,
		params?: SqlParams,
	) => Promise<T | null>
	getAllAsync: <T>(source: string, params?: SqlParams) => Promise<T[]>
	withTransactionAsync: (task: () => Promise<void>) => Promise<void>
	closeAsync: () => Promise<void>
}
