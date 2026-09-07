/**
 * Public ads barrel for app code.
 */
export {
	ads,
	AdService,
	initializeAds,
	canShowPostWorkoutInterstitial,
	evaluatePostWorkoutInterstitial,
	shouldShowBanner,
	type InterstitialShowResult,
	type PostWorkoutInterstitialDeps,
} from './ad-service'
export {
	createMemoryAdsClient,
	createYandexAdsClient,
	type LoadedInterstitialAd,
	type MemoryAdsClient,
	type YandexAdsClient,
} from './client'
export {
	DEMO_BANNER_AD_UNIT_ID,
	DEMO_INTERSTITIAL_AD_UNIT_ID,
	MAX_INTERSTITIALS_PER_SESSION,
	MIN_FINISHED_WORKOUTS_FOR_INTERSTITIAL,
	PRODUCTION_BANNER_AD_UNIT_ID,
	PRODUCTION_INTERSTITIAL_AD_UNIT_ID,
	UNUSED_AD_UNIT_IDS,
	getBannerAdUnitId,
	getInterstitialAdUnitId,
	getProductionAdUnitIds,
} from './config'
export type {
	InterstitialSkipReason,
	PostWorkoutInterstitialContext,
} from './eligibility'
