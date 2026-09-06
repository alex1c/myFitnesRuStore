/**
 * Pure rest-timer helper unit tests.
 */
import {
	adjustRestEndsAt,
	computeRestEndsAt,
	formatCountdown,
	remainingMs,
	resolveRestSeconds,
} from '@/src/features/workout/rest-timer-logic'

describe('rest-timer-logic', () => {
	it('starts restEndsAt at now + duration', () => {
		const now = Date.parse('2026-01-01T12:00:00.000Z')
		expect(computeRestEndsAt(now, 90)).toBe(now + 90_000)
	})

	it('restores remaining after elapsed time', () => {
		const now = Date.parse('2026-01-01T12:00:00.000Z')
		const endsAt = new Date(now + 90_000).toISOString()
		expect(remainingMs(endsAt, now + 30_000)).toBe(60_000)
	})

	it('clamps expired remaining to zero', () => {
		const now = Date.parse('2026-01-01T12:00:00.000Z')
		const endsAt = new Date(now + 90_000).toISOString()
		expect(remainingMs(endsAt, now + 100_000)).toBe(0)
	})

	it('adds and subtracts 15 seconds', () => {
		const now = Date.parse('2026-01-01T12:00:00.000Z')
		const endsAt = new Date(now + 60_000).toISOString()
		const plus = adjustRestEndsAt(endsAt, 15, now)
		expect(Date.parse(plus.endsAt) - now).toBe(75_000)
		expect(plus.expired).toBe(false)

		const minus = adjustRestEndsAt(endsAt, -15, now)
		expect(Date.parse(minus.endsAt) - now).toBe(45_000)
		expect(minus.expired).toBe(false)
	})

	it('prevents negative remaining by expiring', () => {
		const now = Date.parse('2026-01-01T12:00:00.000Z')
		const endsAt = new Date(now + 10_000).toISOString()
		const result = adjustRestEndsAt(endsAt, -15, now)
		expect(result.expired).toBe(true)
		expect(remainingMs(result.endsAt, now)).toBe(0)
	})

	it('formats countdown as MM:SS', () => {
		expect(formatCountdown(0)).toBe('00:00')
		expect(formatCountdown(9_000)).toBe('00:09')
		expect(formatCountdown(65_000)).toBe('01:05')
		expect(formatCountdown(180_000)).toBe('03:00')
	})

	it('resolves snapshot rest over exercise default', () => {
		expect(
			resolveRestSeconds({
				workoutExerciseRestSeconds: 180,
				exerciseDefaultRestSeconds: 60,
			}),
		).toBe(180)
		expect(
			resolveRestSeconds({
				workoutExerciseRestSeconds: null,
				exerciseDefaultRestSeconds: 150,
			}),
		).toBe(150)
		expect(
			resolveRestSeconds({
				workoutExerciseRestSeconds: null,
				exerciseDefaultRestSeconds: null,
			}),
		).toBe(90)
	})
})
