/**
 * Progress metrics unit tests — e1RM, volume, ranking.
 */
import {
	E1RM_MAX_REPS,
	compareBestWeightSet,
	estimateE1rm,
	formatE1rmKg,
	pickBestWeightSet,
	roundE1rm,
	setVolumeKg,
} from '@/src/features/progress/metrics'

describe('e1RM (Epley)', () => {
	it('returns weight for 1 rep', () => {
		expect(estimateE1rm(100, 1)).toBe(100)
	})

	it('estimates 80×10', () => {
		const value = estimateE1rm(80, 10)
		expect(value).not.toBeNull()
		expect(value!).toBeCloseTo(80 * (1 + 10 / 30), 5)
		expect(roundE1rm(value!)).toBe(106.5)
	})

	it('rejects invalid inputs and high reps', () => {
		expect(estimateE1rm(0, 10)).toBeNull()
		expect(estimateE1rm(80, 0)).toBeNull()
		expect(estimateE1rm(-10, 5)).toBeNull()
		expect(estimateE1rm(80, E1RM_MAX_REPS + 1)).toBeNull()
		expect(estimateE1rm(82.5, 8)).not.toBeNull()
	})

	it('formats without floating tails', () => {
		expect(formatE1rmKg(120)).toBe('120')
		expect(formatE1rmKg(120.25)).toBe('120,5')
		expect(formatE1rmKg(120.4)).toBe('120,5')
	})
})

describe('volume', () => {
	it('sums weight × reps and ignores invalid', () => {
		expect(setVolumeKg(80, 10)).toBe(800)
		expect(setVolumeKg(80, 8)).toBe(640)
		expect(setVolumeKg(0, 10)).toBeNull()
		expect(setVolumeKg(80, 0)).toBeNull()
	})
})

describe('best set ranking', () => {
	it('prefers higher e1RM then weight then reps', () => {
		expect(
			compareBestWeightSet(
				{ weight: 90, reps: 10 },
				{ weight: 100, reps: 1 },
			),
		).toBeGreaterThan(0)

		const best = pickBestWeightSet([
			{ weight: 80, reps: 10 },
			{ weight: 85, reps: 8 },
			{ weight: 90, reps: 3 },
		])
		expect(best?.weight).toBe(85)
	})
})
