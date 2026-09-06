/**
 * Pure search/filter helpers for the exercise library (unit-testable).
 */
import type { Exercise, MuscleGroup } from '@/src/domain/types'
import {
	equipmentLabel,
	muscleGroupLabel,
	trackingTypeLabel,
} from './labels'

/** Primary filter chips on the list screen. */
export type ExerciseFilterId =
	| 'all'
	| 'chest'
	| 'back'
	| 'legs'
	| 'shoulders'
	| 'arms'
	| 'core'
	| 'glutes'
	| 'calves'
	| 'forearms'
	| 'cardio'
	| 'other'

export const PRIMARY_FILTERS: { id: ExerciseFilterId; label: string }[] = [
	{ id: 'all', label: 'Все' },
	{ id: 'chest', label: 'Грудь' },
	{ id: 'back', label: 'Спина' },
	{ id: 'legs', label: 'Ноги' },
	{ id: 'shoulders', label: 'Плечи' },
	{ id: 'arms', label: 'Руки' },
	{ id: 'core', label: 'Кор' },
]

export const MORE_FILTERS: { id: ExerciseFilterId; label: string }[] = [
	{ id: 'glutes', label: 'Ягодицы' },
	{ id: 'calves', label: 'Икры' },
	{ id: 'forearms', label: 'Предплечья' },
	{ id: 'cardio', label: 'Кардио' },
	{ id: 'other', label: 'Другое' },
]

const FILTER_MUSCLE_GROUPS: Record<ExerciseFilterId, MuscleGroup[] | null> = {
	all: null,
	chest: ['chest'],
	back: ['back'],
	legs: ['legs'],
	shoulders: ['shoulders'],
	arms: ['biceps', 'triceps'],
	core: ['core'],
	glutes: ['glutes'],
	calves: ['calves'],
	forearms: ['forearms'],
	cardio: ['cardio'],
	other: ['other', 'full_body'],
}

function normalizeSearch (raw: string): string {
	return raw.trim().toLocaleLowerCase('ru-RU')
}

function matchesQuery (exercise: Exercise, query: string): boolean {
	if (query.length === 0) {
		return true
	}

	const haystacks = [
		exercise.name,
		muscleGroupLabel(exercise.muscleGroup),
		equipmentLabel(exercise.equipment),
		trackingTypeLabel(exercise.trackingType),
		exercise.muscleGroup,
		exercise.equipment,
	]

	return haystacks.some((value) =>
		normalizeSearch(value).includes(query),
	)
}

function matchesFilter (
	exercise: Exercise,
	filter: ExerciseFilterId,
): boolean {
	const groups = FILTER_MUSCLE_GROUPS[filter]
	if (groups === null) {
		return true
	}
	return groups.includes(exercise.muscleGroup as MuscleGroup)
}

/**
 * Filter + search exercises for the library list.
 */
export function filterExercises (
	exercises: Exercise[],
	options: {
		query?: string
		filter?: ExerciseFilterId
	},
): Exercise[] {
	const query = normalizeSearch(options.query ?? '')
	const filter = options.filter ?? 'all'

	return exercises.filter(
		(exercise) =>
			matchesFilter(exercise, filter) && matchesQuery(exercise, query),
	)
}
