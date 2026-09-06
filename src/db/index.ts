/**
 * Database layer public exports for app code.
 * Tests should import concrete modules to avoid loading expo-sqlite.
 */
export type { AppDatabase, SqlParams, SqlRunResult } from './client'
export { initializeDatabase } from './expo-init'
export { initializeProvidedDatabase } from './init'
export {
	getSchemaVersion,
	LATEST_SCHEMA_VERSION,
	MIGRATIONS,
	runMigrations,
} from './migrations'
export { ExerciseRepository } from './repositories/exercise-repository'
export { WorkoutTemplateRepository } from './repositories/workout-template-repository'
export { WorkoutRepository } from './repositories/workout-repository'
export {
	ActiveWorkoutExistsError,
	WorkoutService,
	createWorkoutService,
} from './services/workout-service'
