/**
 * Core domain model for exercises and workouts.
 * String unions stay open enough for future custom values where needed.
 */

/** How an exercise's performance is recorded. */
export type TrackingType =
	| 'weight_reps'
	| 'bodyweight_reps'
	| 'assisted_reps'
	| 'duration'
	| 'distance_duration'

/** Role of a logged set inside a workout. */
export type SetType = 'warmup' | 'working' | 'drop' | 'failure'

/**
 * Broad exercise buckets. Kept as string union of known values plus
 * a plain string path via helpers so user-defined categories can land later
 * without rewriting half the app.
 */
export type ExerciseCategory =
	| 'strength'
	| 'cardio'
	| 'mobility'
	| 'other'

export type MuscleGroup =
	| 'chest'
	| 'back'
	| 'shoulders'
	| 'biceps'
	| 'triceps'
	| 'forearms'
	| 'legs'
	| 'glutes'
	| 'calves'
	| 'core'
	| 'full_body'
	| 'cardio'
	| 'other'

export type Equipment =
	| 'barbell'
	| 'dumbbell'
	| 'machine'
	| 'cable'
	| 'bodyweight'
	| 'kettlebell'
	| 'band'
	| 'cardio_machine'
	| 'other'

export interface Exercise {
	id: string
	name: string
	category: ExerciseCategory | string
	muscleGroup: MuscleGroup | string
	equipment: Equipment | string
	trackingType: TrackingType
	/** Effective rest (user override coalesced over catalog default). */
	defaultRestSeconds: number
	/** Effective weight step (user override coalesced over catalog default). */
	weightStep: number | null
	/** Effective notes (user override coalesced over catalog default). */
	notes: string | null
	isCustom: boolean
	createdAt: string
	updatedAt: string
	archivedAt: string | null
}

export interface WorkoutTemplate {
	id: string
	name: string
	description: string | null
	position: number
	createdAt: string
	updatedAt: string
	archivedAt: string | null
}

export interface TemplateExercise {
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

export interface Workout {
	id: string
	templateId: string | null
	name: string
	startedAt: string
	finishedAt: string | null
	notes: string | null
	createdAt: string
	updatedAt: string
}

export interface WorkoutExercise {
	id: string
	workoutId: string
	exerciseId: string
	position: number
	notes: string | null
	createdAt: string
	updatedAt: string
}

export interface WorkoutSet {
	id: string
	workoutExerciseId: string
	position: number
	setType: SetType
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
}

export type WorkoutExerciseWithSets = {
	workoutExercise: WorkoutExercise
	exercise: Exercise | null
	sets: WorkoutSet[]
	previousSets: WorkoutSet[]
}

export type WorkoutDetail = {
	workout: Workout
	exercises: WorkoutExerciseWithSets[]
}

export type CreateSetInput = {
	workoutExerciseId: string
	position?: number
	setType?: SetType
	weight?: number | null
	reps?: number | null
	durationSeconds?: number | null
	distance?: number | null
	completedAt?: string | null
}

export type UpdateSetInput = Partial<{
	setType: SetType
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
	position: number
	completedAt: string | null
}>

export type CreateExerciseInput = {
	name: string
	category?: ExerciseCategory | string
	muscleGroup?: MuscleGroup | string
	equipment?: Equipment | string
	trackingType?: TrackingType
	defaultRestSeconds?: number
	weightStep?: number | null
	notes?: string | null
	isCustom?: boolean
}

export type UpdateExerciseInput = Partial<{
	name: string
	category: ExerciseCategory | string
	muscleGroup: MuscleGroup | string
	equipment: Equipment | string
	trackingType: TrackingType
	defaultRestSeconds: number
	weightStep: number | null
	notes: string | null
}>

export type CreateWorkoutTemplateInput = {
	name: string
	description?: string | null
	position?: number
}

export type AddTemplateExerciseInput = {
	templateId: string
	exerciseId: string
	position?: number
	plannedSets?: number | null
	targetRepsMin?: number | null
	targetRepsMax?: number | null
	restSeconds?: number | null
}

export type UpdateTemplateExerciseInput = Partial<{
	plannedSets: number | null
	targetRepsMin: number | null
	targetRepsMax: number | null
	restSeconds: number | null
	position: number
}>

/** Template with ordered exercise rows for editor/detail screens. */
export type WorkoutTemplateDetail = {
	template: WorkoutTemplate
	exercises: TemplateExercise[]
}

/** Max length for workout template names. */
export const TEMPLATE_NAME_MAX_LENGTH = 80

/** Max length for exercise names shown/stored in the library. */
export const EXERCISE_NAME_MAX_LENGTH = 80
