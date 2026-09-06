/**
 * In-memory SQLite adapter powered by sql.js for Jest (no native build tools).
 * Mirrors the AppDatabase async surface used by repositories.
 */
import fs from 'node:fs'
import path from 'node:path'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'

import type { AppDatabase, SqlParams, SqlRunResult } from './client'

function normalizeParams (params: SqlParams): SqlValue[] {
	return params.map((value) => {
		if (typeof value === 'boolean') {
			return value ? 1 : 0
		}
		return value
	})
}

function rowsFromExec (
	db: Database,
	source: string,
	params: SqlParams = [],
): Record<string, SqlValue>[] {
	const statement = db.prepare(source)
	try {
		statement.bind(normalizeParams(params))
		const rows: Record<string, SqlValue>[] = []
		while (statement.step()) {
			rows.push(statement.getAsObject())
		}
		return rows
	} finally {
		statement.free()
	}
}

/**
 * Create an in-memory database suitable for deterministic unit tests.
 */
export async function createMemoryDatabase (): Promise<AppDatabase> {
	const wasmPath = path.resolve(
		process.cwd(),
		'node_modules',
		'sql.js',
		'dist',
		'sql-wasm.wasm',
	)
	const wasmBinary = new Uint8Array(fs.readFileSync(wasmPath))
	const SQL = await initSqlJs({
		// sql.js typings expect ArrayBuffer; Uint8Array is accepted at runtime.
		wasmBinary: wasmBinary.buffer as ArrayBuffer,
	})
	const db = new SQL.Database()
	db.run('PRAGMA foreign_keys = ON;')

	return {
		execAsync: async (source) => {
			db.exec(source)
		},
		runAsync: async (source, params = []): Promise<SqlRunResult> => {
			db.run(source, normalizeParams(params))
			return {
				changes: db.getRowsModified(),
				lastInsertRowId: Number(
					db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? 0,
				),
			}
		},
		getFirstAsync: async <T>(source: string, params: SqlParams = []) => {
			const rows = rowsFromExec(db, source, params)
			return (rows[0] as T | undefined) ?? null
		},
		getAllAsync: async <T>(source: string, params: SqlParams = []) => {
			return rowsFromExec(db, source, params) as T[]
		},
		withTransactionAsync: async (task) => {
			db.run('BEGIN')
			try {
				await task()
				db.run('COMMIT')
			} catch (error) {
				db.run('ROLLBACK')
				throw error
			}
		},
		closeAsync: async () => {
			db.close()
		},
	}
}
