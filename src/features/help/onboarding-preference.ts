/**
 * Onboarding help-card dismissal preference (app_meta).
 */
export const ONBOARDING_HELP_DISMISSED_KEY = 'onboarding_help_dismissed' as const

/**
 * Parse stored dismissal flag. Invalid / missing → not dismissed.
 */
export function parseOnboardingHelpDismissed (raw: unknown): boolean {
	if (raw === true || raw === 1) {
		return true
	}
	if (typeof raw === 'string') {
		const normalized = raw.trim().toLowerCase()
		return normalized === 'true' || normalized === '1' || normalized === 'yes'
	}
	return false
}

export function serializeOnboardingHelpDismissed (dismissed: boolean): string {
	return dismissed ? 'true' : 'false'
}
