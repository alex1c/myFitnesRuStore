/**
 * Strength metric helpers — Epley e1RM, volume, best-set ranking.
 * Pure functions, no React Native / SQLite.
 */

/** e1RM is only estimated for this inclusive reps range. */
export const E1RM_MAX_REPS = 15

/**
 * Epley estimated one-rep max.
 * e1RM = weight × (1 + reps / 30); for 1 rep returns the weight itself.
 */
export function estimateE1rm (
	weight: number | null | undefined,
	reps: number | null | undefined,
): number | null {
	if (
		weight === null
		|| weight === undefined
		|| !Number.isFinite(weight)
		|| weight <= 0
	) {
		return null
	}
	if (
		reps === null
		|| reps === undefined
		|| !Number.isInteger(reps)
		|| reps < 1
		|| reps > E1RM_MAX_REPS
	) {
		return null
	}
	if (reps === 1) {
		return weight
	}
	return weight * (1 + reps / 30)
}

/** Round e1RM to nearest 0.5 kg for display/storage comparisons. */
export function roundE1rm (value: number): number {
	return Math.round(value * 2) / 2
}

export function formatE1rmKg (value: number): string {
	const rounded = roundE1rm(value)
	if (Number.isInteger(rounded)) {
		return String(rounded)
	}
	return String(rounded).replace('.', ',')
}

/**
 * Weighted set volume: weight × reps.
 * Returns null when the product is not a meaningful kg volume.
 */
export function setVolumeKg (
	weight: number | null | undefined,
	reps: number | null | undefined,
): number | null {
	if (
		weight === null
		|| weight === undefined
		|| !Number.isFinite(weight)
		|| weight <= 0
	) {
		return null
	}
	if (
		reps === null
		|| reps === undefined
		|| !Number.isInteger(reps)
		|| reps <= 0
	) {
		return null
	}
	return weight * reps
}

export type RankableSet = {
	weight: number | null
	reps: number | null
}

/**
 * Compare two weight_reps sets for "best set".
 * Higher e1RM wins; then weight; then reps. Returns >0 if a is better.
 */
export function compareBestWeightSet (a: RankableSet, b: RankableSet): number {
	const e1a = estimateE1rm(a.weight, a.reps)
	const e1b = estimateE1rm(b.weight, b.reps)
	const scoreA = e1a ?? -1
	const scoreB = e1b ?? -1
	if (scoreA !== scoreB) {
		return scoreA - scoreB
	}
	const weightA = a.weight ?? -1
	const weightB = b.weight ?? -1
	if (weightA !== weightB) {
		return weightA - weightB
	}
	return (a.reps ?? -1) - (b.reps ?? -1)
}

export function pickBestWeightSet <T extends RankableSet>(sets: T[]): T | null {
	if (sets.length === 0) {
		return null
	}
	let best = sets[0]!
	for (let index = 1; index < sets.length; index += 1) {
		const candidate = sets[index]!
		if (compareBestWeightSet(candidate, best) > 0) {
			best = candidate
		}
	}
	return best
}

export type ProgressPeriodDays = 30 | 90 | 180 | null

export function periodCutoffIso (
	periodDays: ProgressPeriodDays,
	nowMs = Date.now(),
): string | null {
	if (periodDays === null) {
		return null
	}
	return new Date(nowMs - periodDays * 24 * 60 * 60 * 1000).toISOString()
}

export function formatVolumeKg (value: number): string {
	const rounded = Math.round(value)
	return rounded.toLocaleString('ru-RU')
}
