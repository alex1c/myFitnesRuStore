/**
 * Pure rules for the Today first-use help card.
 */
export type OnboardingHelpVisibilityInput = {
	/** User tapped «Скрыть» (persisted). */
	dismissed: boolean
	/** Active workout must keep Today focused on resume. */
	hasActiveWorkout: boolean
	/** Lifetime finished workouts from history (also covers restore). */
	finishedWorkoutCount: number
}

/**
 * Show the compact first-use card only for brand-new users
 * who have not dismissed it and have no active session.
 */
export function shouldShowOnboardingHelpCard (
	input: OnboardingHelpVisibilityInput,
): boolean {
	if (input.dismissed) {
		return false
	}
	if (input.hasActiveWorkout) {
		return false
	}
	if (input.finishedWorkoutCount > 0) {
		return false
	}
	return true
}
