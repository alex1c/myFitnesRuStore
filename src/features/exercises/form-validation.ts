/**
 * Form validation helpers for create/edit exercise screens.
 */
import type { TrackingType } from '@/src/domain/types'
import { EXERCISE_NAME_MAX_LENGTH } from '@/src/domain/types'
import { usesWeightStep } from './labels'
import { parseDecimalInput } from '@/src/utils/parse-decimal'

export type ExerciseFormValues = {
	name: string
	muscleGroup: string
	equipment: string
	trackingType: TrackingType
	defaultRestSeconds: number
	weightStepRaw: string
	notes: string
}

export type ExerciseFormErrors = Partial<{
	name: string
	rest: string
	weightStep: string
}>

export function validateExerciseForm (
	values: ExerciseFormValues,
): { ok: true; weightStep: number | null } | { ok: false; errors: ExerciseFormErrors } {
	const errors: ExerciseFormErrors = {}
	const name = values.name.trim().replace(/\s+/g, ' ')

	if (name.length === 0) {
		errors.name = 'Введите название упражнения'
	} else if (name.length > EXERCISE_NAME_MAX_LENGTH) {
		errors.name = `Максимум ${EXERCISE_NAME_MAX_LENGTH} символов`
	}

	if (
		!Number.isFinite(values.defaultRestSeconds) ||
		values.defaultRestSeconds <= 0
	) {
		errors.rest = 'Укажите положительное время отдыха'
	}

	let weightStep: number | null = null
	if (usesWeightStep(values.trackingType)) {
		const trimmed = values.weightStepRaw.trim()
		if (trimmed.length > 0) {
			const parsed = parseDecimalInput(trimmed)
			if (!parsed.ok || parsed.value <= 0) {
				errors.weightStep = 'Введите корректный шаг веса, например 1,25'
			} else {
				weightStep = parsed.value
			}
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}

	return { ok: true, weightStep }
}

export const REST_PRESETS = [30, 45, 60, 90, 120, 180] as const

export const WEIGHT_STEP_PRESETS = [
	'0,5',
	'1',
	'1,25',
	'2',
	'2,5',
	'5',
] as const
