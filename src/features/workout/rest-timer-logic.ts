/**
 * Pure rest-timer calculations — testable without React Native / notifications.
 */
export const DEFAULT_REST_SECONDS = 90
export const REST_ADJUST_SECONDS = 15

export type RestTimerSnapshot = {
	startedAt: string
	endsAt: string
	workoutExerciseId: string | null
	setId: string | null
	notificationId: string | null
}

/**
 * Resolve rest duration for a completed set.
 * Snapshot on workout_exercise wins over live exercise settings.
 */
export function resolveRestSeconds (input: {
	workoutExerciseRestSeconds: number | null | undefined
	exerciseDefaultRestSeconds: number | null | undefined
	fallback?: number
}): number {
	const fallback = input.fallback ?? DEFAULT_REST_SECONDS
	if (
		input.workoutExerciseRestSeconds !== null
		&& input.workoutExerciseRestSeconds !== undefined
		&& Number.isFinite(input.workoutExerciseRestSeconds)
		&& input.workoutExerciseRestSeconds > 0
	) {
		return Math.floor(input.workoutExerciseRestSeconds)
	}
	if (
		input.exerciseDefaultRestSeconds !== null
		&& input.exerciseDefaultRestSeconds !== undefined
		&& Number.isFinite(input.exerciseDefaultRestSeconds)
		&& input.exerciseDefaultRestSeconds > 0
	) {
		return Math.floor(input.exerciseDefaultRestSeconds)
	}
	return fallback
}

export function computeRestEndsAt (
	startedAtMs: number,
	durationSeconds: number,
): number {
	const safeDuration = Math.max(0, Math.floor(durationSeconds))
	return startedAtMs + safeDuration * 1000
}

export function remainingMs (endsAtIso: string, nowMs: number): number {
	const endsAt = Date.parse(endsAtIso)
	if (!Number.isFinite(endsAt)) {
		return 0
	}
	return Math.max(0, endsAt - nowMs)
}

export function isRestActive (endsAtIso: string | null | undefined, nowMs: number): boolean {
	if (!endsAtIso) {
		return false
	}
	return remainingMs(endsAtIso, nowMs) > 0
}

export function adjustRestEndsAt (
	endsAtIso: string,
	deltaSeconds: number,
	nowMs: number,
): { endsAt: string; expired: boolean } {
	const currentEnds = Date.parse(endsAtIso)
	if (!Number.isFinite(currentEnds)) {
		return { endsAt: new Date(nowMs).toISOString(), expired: true }
	}
	const nextEnds = currentEnds + deltaSeconds * 1000
	if (nextEnds <= nowMs) {
		return { endsAt: new Date(nowMs).toISOString(), expired: true }
	}
	return { endsAt: new Date(nextEnds).toISOString(), expired: false }
}

/** Format remaining time as MM:SS (or H:MM:SS when >= 1 hour). */
export function formatCountdown (remainingMilliseconds: number): string {
	const totalSeconds = Math.max(
		0,
		Math.ceil(remainingMilliseconds / 1000),
	)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const mm = String(minutes).padStart(2, '0')
	const ss = String(seconds).padStart(2, '0')
	if (hours > 0) {
		return `${hours}:${mm}:${ss}`
	}
	return `${mm}:${ss}`
}
