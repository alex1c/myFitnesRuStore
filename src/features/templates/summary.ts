/**
 * Russian plural helpers and template summary formatting.
 */
import type { TemplateExercise, TrackingType } from '@/src/domain/types'
import { formatRestLabel } from '@/src/features/exercises/labels'

export function pluralRu (
	count: number,
	one: string,
	few: string,
	many: string,
): string {
	const absolute = Math.abs(count) % 100
	const last = absolute % 10
	if (absolute > 10 && absolute < 20) {
		return many
	}
	if (last === 1) {
		return one
	}
	if (last >= 2 && last <= 4) {
		return few
	}
	return many
}

export function formatExerciseCount (count: number): string {
	return `${count} ${pluralRu(count, 'упражнение', 'упражнения', 'упражнений')}`
}

export function formatSetCount (count: number): string {
	return `${count} ${pluralRu(count, 'подход', 'подхода', 'подходов')}`
}

export function totalPlannedSets (exercises: TemplateExercise[]): number {
	return exercises.reduce((sum, item) => sum + (item.plannedSets ?? 0), 0)
}

export function formatTemplateSummary (exercises: TemplateExercise[]): string {
	if (exercises.length === 0) {
		return 'Упражнения не добавлены'
	}
	const sets = totalPlannedSets(exercises)
	if (sets > 0) {
		return `${formatExerciseCount(exercises.length)} • ${formatSetCount(sets)}`
	}
	return formatExerciseCount(exercises.length)
}

export function usesRepTargets (trackingType: TrackingType): boolean {
	return (
		trackingType === 'weight_reps' ||
		trackingType === 'bodyweight_reps' ||
		trackingType === 'assisted_reps'
	)
}

/**
 * Format planned sets × reps for list/detail rows.
 * Examples: "4 × 8–10", "3 × 10", "3 подхода" (no reps)
 */
export function formatSetsRepsLine (input: {
	plannedSets: number | null
	targetRepsMin: number | null
	targetRepsMax: number | null
	trackingType: TrackingType
}): string {
	const sets = input.plannedSets ?? 0
	const setsLabel = formatSetCount(sets || 0)

	if (!usesRepTargets(input.trackingType)) {
		return sets > 0 ? setsLabel : 'Подходы не заданы'
	}

	const min = input.targetRepsMin
	const max = input.targetRepsMax
	if (min === null || max === null || sets <= 0) {
		return sets > 0 ? setsLabel : 'План не задан'
	}

	const reps = min === max ? `${min}` : `${min}–${max}`
	return `${sets} × ${reps}`
}

export function formatTemplateExerciseSubtitle (input: {
	plannedSets: number | null
	targetRepsMin: number | null
	targetRepsMax: number | null
	restSeconds: number | null
	trackingType: TrackingType
}): string {
	const plan = formatSetsRepsLine(input)
	const rest =
		input.restSeconds !== null && input.restSeconds > 0
			? `отдых ${formatRestLabel(input.restSeconds)}`
			: null
	return rest ? `${plan} • ${rest}` : plan
}

export function formatDetailExerciseLine (input: {
	index: number
	name: string
	plannedSets: number | null
	targetRepsMin: number | null
	targetRepsMax: number | null
	trackingType: TrackingType
}): string {
	const plan = formatSetsRepsLine(input)
	return `${input.index}. ${input.name} — ${plan}`
}
