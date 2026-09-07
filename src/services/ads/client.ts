/**
 * Mockable adapter around the Yandex Mobile Ads native SDK.
 */
export type LoadedInterstitialAd = {
	show: () => Promise<void>
	setOnAdShown: (callback: () => void) => void
	setOnAdFailedToShow: (callback: (error?: unknown) => void) => void
	setOnAdDismissed: (callback: () => void) => void
}

export type YandexAdsClient = {
	initialize: () => Promise<void>
	setLocationConsent: (enabled: boolean) => void
	loadInterstitial: (adUnitId: string) => Promise<LoadedInterstitialAd | null>
}

/**
 * Lazy native client — keeps Jest off the native bridge at import time.
 */
export function createYandexAdsClient (): YandexAdsClient {
	return {
		async initialize () {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sdk = require('yandex-mobile-ads') as {
				MobileAds: {
					initialize: () => Promise<void> | void
					setLocationConsent: (value: boolean) => void
				}
			}
			sdk.MobileAds.setLocationConsent(false)
			await Promise.resolve(sdk.MobileAds.initialize())
		},
		setLocationConsent (enabled) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sdk = require('yandex-mobile-ads') as {
				MobileAds: { setLocationConsent: (value: boolean) => void }
			}
			sdk.MobileAds.setLocationConsent(enabled)
		},
		async loadInterstitial (adUnitId) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sdk = require('yandex-mobile-ads') as {
				InterstitialAdLoader: {
					create: () => Promise<{
						loadAd: (params: { adUnitId: string }) => Promise<{
							show: () => Promise<void>
							onAdShown: (() => void) | null
							onAdFailedToShow: ((error?: unknown) => void) | null
							onAdDismissed: (() => void) | null
						}>
					}>
				}
			}
			const loader = await sdk.InterstitialAdLoader.create()
			const ad = await loader.loadAd({ adUnitId })
			return {
				show: () => ad.show(),
				setOnAdShown (callback) {
					ad.onAdShown = callback
				},
				setOnAdFailedToShow (callback) {
					ad.onAdFailedToShow = callback
				},
				setOnAdDismissed (callback) {
					ad.onAdDismissed = callback
				},
			}
		},
	}
}

export type MemoryAdsClient = YandexAdsClient & {
	initialized: boolean
	loadCalls: string[]
	showCalls: number
	nextLoad: LoadedInterstitialAd | null | 'throw'
	failShow: boolean
	createReadyAd: () => LoadedInterstitialAd
}

/** In-memory client for unit tests — no native SDK. */
export function createMemoryAdsClient (): MemoryAdsClient {
	const state = {
		initialized: false,
		loadCalls: [] as string[],
		showCalls: 0,
		nextLoad: null as LoadedInterstitialAd | null | 'throw',
		failShow: false,
	}

	const createReadyAd = (): LoadedInterstitialAd => {
		let adShown: (() => void) | null = null
		let adFailed: ((error?: unknown) => void) | null = null
		let adDismissed: (() => void) | null = null
		return {
			setOnAdShown (callback) {
				adShown = callback
			},
			setOnAdFailedToShow (callback) {
				adFailed = callback
			},
			setOnAdDismissed (callback) {
				adDismissed = callback
			},
			async show () {
				state.showCalls += 1
				if (state.failShow) {
					adFailed?.({ message: 'show failed' })
					return
				}
				adShown?.()
				adDismissed?.()
			},
		}
	}

	return {
		get initialized () {
			return state.initialized
		},
		get loadCalls () {
			return state.loadCalls
		},
		get showCalls () {
			return state.showCalls
		},
		get nextLoad () {
			return state.nextLoad
		},
		set nextLoad (value) {
			state.nextLoad = value
		},
		get failShow () {
			return state.failShow
		},
		set failShow (value) {
			state.failShow = value
		},
		createReadyAd,
		async initialize () {
			state.initialized = true
		},
		setLocationConsent () {
			// Explicitly unused — location not requested for ads.
		},
		async loadInterstitial (adUnitId) {
			state.loadCalls.push(adUnitId)
			if (state.nextLoad === 'throw') {
				throw new Error('load failed')
			}
			if (state.nextLoad) {
				return state.nextLoad
			}
			return createReadyAd()
		},
	}
}
