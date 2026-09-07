/**
 * Centralized Yandex Mobile Ads unit IDs.
 * Production IDs only for release; official demo IDs for __DEV__ loads.
 */
export const PRODUCTION_BANNER_AD_UNIT_ID = 'R-M-19996564-1' as const
export const PRODUCTION_INTERSTITIAL_AD_UNIT_ID = 'R-M-19996564-2' as const

/** Official Yandex demo units — development only. */
export const DEMO_BANNER_AD_UNIT_ID = 'demo-banner-yandex' as const
export const DEMO_INTERSTITIAL_AD_UNIT_ID = 'demo-interstitial-yandex' as const

/**
 * Unused in 1.0 — kept documented so they are not accidentally wired.
 * Do not export getters that return these for show paths.
 */
export const UNUSED_AD_UNIT_IDS = {
	rewarded: 'R-M-19996564-3',
	appOpen: 'R-M-19996564-4',
	feed: 'R-M-19996564-5',
	native: 'R-M-19996564-6',
} as const

export const MIN_FINISHED_WORKOUTS_FOR_INTERSTITIAL = 3
export const MAX_INTERSTITIALS_PER_SESSION = 1

/** Safety timeout so navigation never hangs on a stuck SDK callback. */
export const INTERSTITIAL_SHOW_TIMEOUT_MS = 8_000

export function getBannerAdUnitId (): string {
	return typeof __DEV__ !== 'undefined' && __DEV__
		? DEMO_BANNER_AD_UNIT_ID
		: PRODUCTION_BANNER_AD_UNIT_ID
}

export function getInterstitialAdUnitId (): string {
	return typeof __DEV__ !== 'undefined' && __DEV__
		? DEMO_INTERSTITIAL_AD_UNIT_ID
		: PRODUCTION_INTERSTITIAL_AD_UNIT_ID
}

/** Production path IDs — used by release config assertions. */
export function getProductionAdUnitIds () {
	return {
		bannerId: PRODUCTION_BANNER_AD_UNIT_ID,
		interstitialId: PRODUCTION_INTERSTITIAL_AD_UNIT_ID,
	}
}
