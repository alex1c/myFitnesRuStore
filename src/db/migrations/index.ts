/**
 * Versioned migration runner.
 * Each migration runs at most once, tracked in schema_migrations.
 */
import type { AppDatabase } from '../client'
import { MIGRATION_001_SQL } from './001_initial_schema'
import { MIGRATION_002_SQL } from './002_exercise_user_settings'
import { MIGRATION_003_SQL } from './003_single_active_workout'
import { nowIso } from '@/src/utils/dates'

export type Migration = {
	version: number
	name: string
	sql: string
}

/** Ordered list — append 003, … here in later phases. */
export const MIGRATIONS: readonly Migration[] = [
	{
		version: 1,
		name: '001_initial_schema',
		sql: MIGRATION_001_SQL,
	},
	{
		version: 2,
		name: '002_exercise_user_settings',
		sql: MIGRATION_002_SQL,
	},
	{
		version: 3,
		name: '003_single_active_workout',
		sql: MIGRATION_003_SQL,
	},
] as const

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0

async function ensureMigrationsTable (db: AppDatabase): Promise<void> {
	await db.execAsync(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY NOT NULL,
			applied_at TEXT NOT NULL
		);
	`)
}

export async function getSchemaVersion (db: AppDatabase): Promise<number> {
	await ensureMigrationsTable(db)
	const row = await db.getFirstAsync<{ version: number }>(
		'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
	)
	return row?.version ?? 0
}

/**
 * Apply pending migrations in version order inside a transaction per migration.
 */
export async function runMigrations (db: AppDatabase): Promise<number> {
	await ensureMigrationsTable(db)
	const currentVersion = await getSchemaVersion(db)

	for (const migration of MIGRATIONS) {
		if (migration.version <= currentVersion) {
			continue
		}

		await db.withTransactionAsync(async () => {
			await db.execAsync(migration.sql)
			await db.runAsync(
				'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
				[migration.version, nowIso()],
			)
		})
	}

	return getSchemaVersion(db)
}
