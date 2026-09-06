/**
 * Search and filter unit tests for the exercise library.
 */
import type { Exercise } from '@/src/domain/types'
import { filterExercises } from '@/src/features/exercises/search-exercises'

function sample (partial: Partial<Exercise> & Pick<Exercise, 'id' | 'name'>): Exercise {
	return {
		category: 'strength',
		muscleGroup: 'chest',
		equipment: 'barbell',
		trackingType: 'weight_reps',
		defaultRestSeconds: 90,
		weightStep: 2.5,
		notes: null,
		isCustom: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		archivedAt: null,
		...partial,
	}
}

const library: Exercise[] = [
	sample({ id: '1', name: 'Жим штанги лёжа', muscleGroup: 'chest', equipment: 'barbell' }),
	sample({
		id: '2',
		name: 'Жим гантелей лёжа',
		muscleGroup: 'chest',
		equipment: 'dumbbell',
	}),
	sample({
		id: '3',
		name: 'Тяга штанги в наклоне',
		muscleGroup: 'back',
		equipment: 'barbell',
	}),
	sample({
		id: '4',
		name: 'Сгибание рук с гантелями',
		muscleGroup: 'biceps',
		equipment: 'dumbbell',
	}),
	sample({
		id: '5',
		name: 'Планка',
		muscleGroup: 'core',
		equipment: 'bodyweight',
		trackingType: 'duration',
		weightStep: null,
	}),
]

describe('filterExercises', () => {
	it('matches Cyrillic substrings case-insensitively', () => {
		expect(filterExercises(library, { query: 'жим' }).map((item) => item.id)).toEqual([
			'1',
			'2',
		])
		expect(
			filterExercises(library, { query: 'ГАНТЕЛ' }).map((item) => item.id),
		).toEqual(['2', '4'])
		expect(filterExercises(library, { query: 'тяга' }).map((item) => item.id)).toEqual([
			'3',
		])
		expect(
			filterExercises(library, { query: 'бицепс' }).map((item) => item.id),
		).toEqual(['4'])
		expect(
			filterExercises(library, { query: 'планка' }).map((item) => item.id),
		).toEqual(['5'])
	})

	it('trims whitespace and returns full list for empty query', () => {
		expect(filterExercises(library, { query: '  жим  ' })).toHaveLength(2)
		expect(filterExercises(library, { query: '   ' })).toHaveLength(library.length)
		expect(filterExercises(library, { query: '' })).toHaveLength(library.length)
	})

	it('applies category filters together with search', () => {
		expect(
			filterExercises(library, { filter: 'chest', query: 'жим' }).map(
				(item) => item.id,
			),
		).toEqual(['1', '2'])
		expect(
			filterExercises(library, { filter: 'arms' }).map((item) => item.id),
		).toEqual(['4'])
		expect(
			filterExercises(library, { filter: 'back', query: 'жим' }),
		).toHaveLength(0)
	})
})
