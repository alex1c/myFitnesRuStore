/**
 * Default planning values when adding an exercise to a template.
 */
import type { Exercise, TrackingType } from '@/src/domain/types'
import { usesRepTargets } from './summary'

export type TemplateExerciseDefaults = {
	plannedSets: number
	targetRepsMin: number | null
	targetRepsMax: number | null
	restSeconds: number
}

export function defaultPlanForExercise (
	exercise: Pick<Exercise, 'trackingType' | 'defaultRestSeconds'>,
): TemplateExerciseDefaults {
	const restSeconds = exercise.defaultRestSeconds
	if (!usesRepTargets(exercise.trackingType)) {
		return {
			plannedSets: 3,
			targetRepsMin: null,
			targetRepsMax: null,
			restSeconds,
		}
	}

	return {
		plannedSets: 3,
		targetRepsMin: 8,
		targetRepsMax: 12,
		restSeconds,
	}
}

export function defaultPlanForTrackingType (
	trackingType: TrackingType,
	restSeconds: number,
): TemplateExerciseDefaults {
	return defaultPlanForExercise({
		trackingType,
		defaultRestSeconds: restSeconds,
	})
}

export const SET_PRESETS = [2, 3, 4, 5] as const
export const REST_PRESETS = [30, 45, 60, 90, 120, 180] as const
