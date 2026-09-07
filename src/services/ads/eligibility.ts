/**
 * Pure eligibility rules for post-workout interstitial and banners.
 */
import {
	MAX_INTERSTITIALS_PER_SESSION,
	MIN_FINISHED_WORKOUTS_FOR_INTERSTITIAL,
} from './config'

export type PostWorkoutInterstitialContext = {
	/** Absolute guard — never show while an active workout exists. */
	hasActiveWorkout: boolean
	/** Lifetime finished workouts (from DB history). */
	finishedWorkoutCount: number
	/** Completed sets in the workout that just finished. */
	currentWorkoutCompletedSetCount: number
	/** In-memory successful shows in this cold app session. */
	interstitialsShownThisSession: number
	/** Whether a preloaded interstitial is ready. */
	isInterstitialLoaded: boolean
}

export type InterstitialSkipReason =
	| 'active_workout'
	| 'session_cap'
	| 'history_threshold'
	| 'empty_workout'
	| 'not_loaded'
	| 'ok'

export function evaluatePostWorkoutInterstitial (
	ctx: PostWorkoutInterstitialContext,
): { allowed: boolean; reason: InterstitialSkipReason } {
	if (ctx.hasActiveWorkout) {
		return { allowed: false, reason: 'active_workout' }
	}
	if (ctx.interstitialsShownThisSession >= MAX_INTERSTITIALS_PER_SESSION) {
		return { allowed: false, reason: 'session_cap' }
	}
	if (ctx.finishedWorkoutCount < MIN_FINISHED_WORKOUTS_FOR_INTERSTITIAL) {
		return { allowed: false, reason: 'history_threshold' }
	}
	if (ctx.currentWorkoutCompletedSetCount <= 0) {
		return { allowed: false, reason: 'empty_workout' }
	}
	if (!ctx.isInterstitialLoaded) {
		return { allowed: false, reason: 'not_loaded' }
	}
	return { allowed: true, reason: 'ok' }
}

export function canShowPostWorkoutInterstitial (
	ctx: PostWorkoutInterstitialContext,
): boolean {
	return evaluatePostWorkoutInterstitial(ctx).allowed
}

/** Banner is suppressed while any active workout exists. */
export function shouldShowBanner (
	hasActiveWorkout: boolean | null,
): boolean {
	// Unknown state is fail-closed: a query failure must never expose an ad
	// while an active workout might exist.
	return hasActiveWorkout === false
}
