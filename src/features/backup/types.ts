/**
 * Versioned JSON backup format constants and TypeScript shapes.
 */
export const BACKUP_FORMAT_ID = 'my-fitness-backup' as const
export const BACKUP_FORMAT_VERSION = 1 as const

export type BackupExerciseRow = {
	id: string
	name: string
	category: string
	muscleGroup: string
	equipment: string
	trackingType: string
	defaultRestSeconds: number
	weightStep: number | null
	notes: string | null
	isCustom: boolean
	createdAt: string
	updatedAt: string
	archivedAt: string | null
}

export type BackupExerciseSettingsRow = {
	exerciseId: string
	defaultRestSeconds: number | null
	weightStep: number | null
	notes: string | null
	updatedAt: string
}

export type BackupTemplateRow = {
	id: string
	name: string
	description: string | null
	position: number
	createdAt: string
	updatedAt: string
	archivedAt: string | null
}

export type BackupTemplateExerciseRow = {
	id: string
	templateId: string
	exerciseId: string
	position: number
	plannedSets: number | null
	targetRepsMin: number | null
	targetRepsMax: number | null
	restSeconds: number | null
	createdAt: string
	updatedAt: string
}

export type BackupWorkoutRow = {
	id: string
	templateId: string | null
	name: string
	startedAt: string
	finishedAt: string | null
	notes: string | null
	restStartedAt: string | null
	restEndsAt: string | null
	restWorkoutExerciseId: string | null
	restSetId: string | null
	/** Runtime-only; cleared on restore. */
	restNotificationId: string | null
	createdAt: string
	updatedAt: string
}

export type BackupWorkoutExerciseRow = {
	id: string
	workoutId: string
	exerciseId: string
	position: number
	notes: string | null
	restSeconds: number | null
	createdAt: string
	updatedAt: string
}

export type BackupSetRow = {
	id: string
	workoutExerciseId: string
	position: number
	setType: string
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
}

export type BackupPayloadData = {
	/** Custom exercises only — built-ins come from current app seed. */
	customExercises: BackupExerciseRow[]
	exerciseUserSettings: BackupExerciseSettingsRow[]
	workoutTemplates: BackupTemplateRow[]
	templateExercises: BackupTemplateExerciseRow[]
	workouts: BackupWorkoutRow[]
	workoutExercises: BackupWorkoutExerciseRow[]
	sets: BackupSetRow[]
}

export type FitnessBackupV1 = {
	format: typeof BACKUP_FORMAT_ID
	version: typeof BACKUP_FORMAT_VERSION
	createdAt: string
	appVersion: string
	data: BackupPayloadData
}

export class BackupValidationError extends Error {
	constructor (
		message: string,
		public readonly code:
			| 'PARSE'
			| 'FORMAT'
			| 'VERSION'
			| 'STRUCTURE'
			| 'INTEGRITY',
	) {
		super(message)
		this.name = 'BackupValidationError'
	}
}
