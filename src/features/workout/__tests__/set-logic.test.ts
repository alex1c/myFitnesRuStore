/**
 * Unit tests for set autofill and formatting helpers.
 */
import {
	buildAutofillValues,
	formatElapsed,
	formatWeight,
	previousSetLabel,
	validateSetCompletion,
} from '@/src/features/workout/set-logic'
import type { WorkoutSet } from '@/src/domain/types'

function set (partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'id'>): WorkoutSet {
	return {
		workoutExerciseId: 'wex',
		position: 0,
		setType: 'working',
		weight: null,
		reps: null,
		durationSeconds: null,
		distance: null,
		completedAt: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...partial,
	}
}

describe('buildAutofillValues', () => {
	it('prefers last current completed set over historical', () => {
		const values = buildAutofillValues({
			trackingType: 'weight_reps',
			currentCompletedSets: [
				set({ id: '1', weight: 82.5, reps: 10, completedAt: 'x' }),
			],
			previousSets: [set({ id: 'p', weight: 80, reps: 10, completedAt: 'y' })],
			nextIndex: 1,
		})
		expect(values).toEqual({
			weight: 82.5,
			reps: 10,
			durationSeconds: null,
			distance: null,
		})
	})

	it('falls back to matching previous historical set', () => {
		const values = buildAutofillValues({
			trackingType: 'weight_reps',
			currentCompletedSets: [],
			previousSets: [
				set({ id: 'p1', weight: 80, reps: 10, completedAt: 'y' }),
				set({ id: 'p2', weight: 80, reps: 8, completedAt: 'y' }),
			],
			nextIndex: 1,
		})
		expect(values.reps).toBe(8)
	})
})

describe('validateSetCompletion', () => {
	it('accepts decimal weights and rejects invalid reps', () => {
		expect(() =>
			validateSetCompletion({
				trackingType: 'weight_reps',
				weight: 82.5,
				reps: 10,
				durationSeconds: null,
				distance: null,
			}),
		).not.toThrow()
		expect(() =>
			validateSetCompletion({
				trackingType: 'weight_reps',
				weight: 80,
				reps: 0,
				durationSeconds: null,
				distance: null,
			}),
		).toThrow(/повторен/i)
	})
})

describe('format helpers', () => {
	it('formats weight with comma and previous labels', () => {
		expect(formatWeight(82.5)).toBe('82,5')
		expect(
			previousSetLabel(
				set({ id: '1', weight: 80, reps: 10, completedAt: 'x' }),
			),
		).toBe('80×10')
		expect(previousSetLabel(undefined)).toBe('—')
		expect(formatElapsed('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:01:05.000Z'))).toBe(
			'01:05',
		)
	})
})
