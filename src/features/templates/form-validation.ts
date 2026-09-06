/**
 * Validation for workout template create/edit and exercise planning fields.
 */
import { TEMPLATE_NAME_MAX_LENGTH } from '@/src/domain/types'

export type TemplateExercisePlanInput = {
	plannedSets: number
	targetRepsMin: number | null
	targetRepsMax: number | null
	restSeconds: number
	usesReps: boolean
}

export type TemplateExercisePlanErrors = Partial<{
	name: string
	plannedSets: string
	reps: string
	restSeconds: string
}>

export function validateTemplateName (raw: string): string {
	const name = raw.trim().replace(/\s+/g, ' ')
	if (name.length === 0) {
		throw new Error('Введите название тренировки')
	}
	if (name.length > TEMPLATE_NAME_MAX_LENGTH) {
		throw new Error(
			`Название слишком длинное (макс. ${TEMPLATE_NAME_MAX_LENGTH} символов)`,
		)
	}
	return name
}

export function validateTemplateMeta (input: {
	name: string
	description?: string
}): { ok: true; name: string; description: string | null } | {
	ok: false
	errors: TemplateExercisePlanErrors
} {
	try {
		const name = validateTemplateName(input.name)
		const description = input.description?.trim()
			? input.description.trim()
			: null
		return { ok: true, name, description }
	} catch (error) {
		return {
			ok: false,
			errors: {
				name:
					error instanceof Error
						? error.message
						: 'Введите название тренировки',
			},
		}
	}
}

export function validateTemplateExercisePlan (
	input: TemplateExercisePlanInput,
): { ok: true } | { ok: false; errors: TemplateExercisePlanErrors } {
	const errors: TemplateExercisePlanErrors = {}

	if (
		!Number.isInteger(input.plannedSets) ||
		input.plannedSets < 1 ||
		input.plannedSets > 20
	) {
		errors.plannedSets = 'Укажите число подходов от 1 до 20'
	}

	if (
		!Number.isFinite(input.restSeconds) ||
		input.restSeconds <= 0 ||
		input.restSeconds > 600
	) {
		errors.restSeconds = 'Укажите положительное время отдыха'
	}

	if (input.usesReps) {
		const min = input.targetRepsMin
		const max = input.targetRepsMax
		if (min === null || max === null) {
			errors.reps = 'Укажите повторения'
		} else if (
			!Number.isInteger(min) ||
			!Number.isInteger(max) ||
			min < 1 ||
			max < 1 ||
			min > 100 ||
			max > 100
		) {
			errors.reps = 'Повторения должны быть от 1 до 100'
		} else if (min > max) {
			errors.reps = 'Минимум не может быть больше максимума'
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}
	return { ok: true }
}
