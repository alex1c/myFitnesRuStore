/**
 * Pure set autofill and completion validation for active workouts.
 */
import type { TrackingType, WorkoutSet } from '@/src/domain/types'

export type SetMetricValues = {
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
}

/**
 * Build suggested values for the next set row.
 * Priority: last completed current set → matching previous historical set → empty.
 */
export function buildAutofillValues (input: {
	trackingType: TrackingType
	currentCompletedSets: WorkoutSet[]
	previousSets: WorkoutSet[]
	nextIndex: number
}): SetMetricValues {
	const lastCurrent =
		input.currentCompletedSets[input.currentCompletedSets.length - 1]
	if (lastCurrent) {
		return pickMetrics(lastCurrent)
	}

	const previous = input.previousSets[input.nextIndex]
	if (previous) {
		return pickMetrics(previous)
	}

	return emptyMetrics(input.trackingType)
}

function pickMetrics (set: WorkoutSet): SetMetricValues {
	return {
		weight: set.weight,
		reps: set.reps,
		durationSeconds: set.durationSeconds,
		distance: set.distance,
	}
}

function emptyMetrics (trackingType: TrackingType): SetMetricValues {
	switch (trackingType) {
		case 'duration':
			return {
				weight: null,
				reps: null,
				durationSeconds: 60,
				distance: null,
			}
		case 'distance_duration':
			return {
				weight: null,
				reps: null,
				durationSeconds: 600,
				distance: 1,
			}
		default:
			return {
				weight: null,
				reps: null,
				durationSeconds: null,
				distance: null,
			}
	}
}

export function validateSetCompletion (input: {
	trackingType: TrackingType
	weight: number | null
	reps: number | null
	durationSeconds: number | null
	distance: number | null
}): void {
	switch (input.trackingType) {
		case 'weight_reps':
			if (input.weight === null || input.weight < 0 || !Number.isFinite(input.weight)) {
				throw new Error('Укажите корректный вес')
			}
			if (
				input.reps === null ||
				!Number.isInteger(input.reps) ||
				input.reps < 1
			) {
				throw new Error('Укажите повторения')
			}
			break
		case 'bodyweight_reps':
			if (
				input.reps === null ||
				!Number.isInteger(input.reps) ||
				input.reps < 1
			) {
				throw new Error('Укажите повторения')
			}
			if (input.weight !== null && (input.weight < 0 || !Number.isFinite(input.weight))) {
				throw new Error('Укажите корректный дополнительный вес')
			}
			break
		case 'assisted_reps':
			if (input.weight === null || input.weight < 0 || !Number.isFinite(input.weight)) {
				throw new Error('Укажите вес помощи')
			}
			if (
				input.reps === null ||
				!Number.isInteger(input.reps) ||
				input.reps < 1
			) {
				throw new Error('Укажите повторения')
			}
			break
		case 'duration':
			if (
				input.durationSeconds === null ||
				input.durationSeconds <= 0 ||
				!Number.isFinite(input.durationSeconds)
			) {
				throw new Error('Укажите длительность')
			}
			break
		case 'distance_duration':
			if (
				input.distance === null ||
				input.distance <= 0 ||
				!Number.isFinite(input.distance)
			) {
				throw new Error('Укажите расстояние')
			}
			if (
				input.durationSeconds === null ||
				input.durationSeconds <= 0 ||
				!Number.isFinite(input.durationSeconds)
			) {
				throw new Error('Укажите длительность')
			}
			break
		default:
			break
	}
}

export function previousSetLabel (set: WorkoutSet | undefined): string {
	if (!set) {
		return '—'
	}
	if (set.weight !== null && set.reps !== null) {
		return `${formatWeight(set.weight)}×${set.reps}`
	}
	if (set.reps !== null) {
		return `${set.reps}`
	}
	if (set.durationSeconds !== null) {
		return formatDurationClock(set.durationSeconds)
	}
	return '—'
}

export function formatWeight (value: number): string {
	if (Number.isInteger(value)) {
		return String(value)
	}
	return String(value).replace('.', ',')
}

export function formatDurationClock (totalSeconds: number): string {
	const safe = Math.max(0, Math.floor(totalSeconds))
	const hours = Math.floor(safe / 3600)
	const minutes = Math.floor((safe % 3600) / 60)
	const seconds = safe % 60
	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(seconds)}`
	}
	return `${pad(minutes)}:${pad(seconds)}`
}

export function formatElapsed (startedAtIso: string, nowMs = Date.now()): string {
	const started = Date.parse(startedAtIso)
	if (!Number.isFinite(started)) {
		return '00:00'
	}
	const seconds = Math.max(0, Math.floor((nowMs - started) / 1000))
	return formatDurationClock(seconds)
}

export function formatElapsedHuman (
	startedAtIso: string,
	nowMs = Date.now(),
): string {
	const started = Date.parse(startedAtIso)
	if (!Number.isFinite(started)) {
		return 'только что'
	}
	const minutes = Math.max(0, Math.floor((nowMs - started) / 60000))
	if (minutes < 1) {
		return 'меньше минуты назад'
	}
	if (minutes < 60) {
		return `${minutes} мин назад`
	}
	const hours = Math.floor(minutes / 60)
	const rem = minutes % 60
	if (rem === 0) {
		return `${hours} ч назад`
	}
	return `${hours} ч ${rem} мин назад`
}

export function formatWorkoutDuration (
	startedAtIso: string,
	finishedAtIso: string,
): string {
	const start = Date.parse(startedAtIso)
	const end = Date.parse(finishedAtIso)
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
		return '—'
	}
	const totalMinutes = Math.floor((end - start) / 60000)
	if (totalMinutes < 60) {
		return `${Math.max(1, totalMinutes)} мин`
	}
	const hours = Math.floor(totalMinutes / 60)
	const minutes = totalMinutes % 60
	if (minutes === 0) {
		return `${hours} ч`
	}
	return `${hours} ч ${pad(minutes)} мин`
}

function pad (value: number): string {
	return value < 10 ? `0${value}` : String(value)
}
