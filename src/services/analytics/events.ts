/**
 * Typed AppMetrica event names and privacy-safe payloads.
 * Never include user-entered text or exact training numbers here.
 */
export const ANALYTICS_EVENTS = {
	workoutStarted: 'workout_started',
	workoutCompleted: 'workout_completed',
	workoutDiscarded: 'workout_discarded',
	setCompleted: 'set_completed',
	restTimerStarted: 'rest_timer_started',
	restTimerSkipped: 'rest_timer_skipped',
	restTimerAdjusted: 'rest_timer_adjusted',
	templateCreated: 'template_created',
	templateDuplicated: 'template_duplicated',
	customExerciseCreated: 'custom_exercise_created',
	backupCreated: 'backup_created',
	restoreCompleted: 'restore_completed',
	csvExported: 'csv_exported',
} as const

export type AnalyticsEventName =
	(typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

export type WorkoutStartSource = 'template' | 'quick' | 'repeat'

export type RestDurationBucket =
	| 'lte60'
	| '61-90'
	| '91-120'
	| '121-180'
	| 'gt180'

export type AnalyticsPrimitive = string | number | boolean

export type AnalyticsParams = Record<string, AnalyticsPrimitive>

export type WorkoutStartedParams = {
	source: WorkoutStartSource
	exercise_count: number
	planned_set_count: number
}

export type WorkoutCompletedParams = {
	duration_seconds: number
	completed_set_count: number
	exercise_count: number
}

export type WorkoutDiscardedParams = {
	duration_seconds: number
	completed_set_count: number
}

export type SetCompletedParams = {
	tracking_type: string
	set_type: string
}

export type RestTimerStartedParams = {
	duration_bucket: RestDurationBucket
}

export type RestTimerAdjustedParams = {
	direction: 'increase' | 'decrease'
}

export type TemplateCreatedParams = {
	exercise_count: number
}

export type TemplateDuplicatedParams = {
	exercise_count: number
}

export type CustomExerciseCreatedParams = {
	tracking_type: string
	equipment_category?: string
}

/** Keys that must never appear in custom analytics payloads. */
export const FORBIDDEN_ANALYTICS_KEYS = [
	'name',
	'notes',
	'weight',
	'reps',
	'exerciseId',
	'exercise_id',
	'workoutName',
	'templateName',
	'workout_name',
	'template_name',
	'exerciseName',
	'exercise_name',
	'path',
	'uri',
	'filePath',
	'file_path',
] as const
