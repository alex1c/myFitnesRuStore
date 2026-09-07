/**
 * Best-effort Yandex Mobile Ads monetization.
 * Interstitial is restricted to post-summary exit only.
 */
import {
	INTERSTITIAL_SHOW_TIMEOUT_MS,
	MAX_INTERSTITIALS_PER_SESSION,
	getInterstitialAdUnitId,
} from './config'
import {
	createYandexAdsClient,
	type LoadedInterstitialAd,
	type YandexAdsClient,
} from './client'
import {
	canShowPostWorkoutInterstitial,
	evaluatePostWorkoutInterstitial,
	shouldShowBanner,
	type PostWorkoutInterstitialContext,
} from './eligibility'

export type PostWorkoutInterstitialDeps = {
	currentWorkoutCompletedSetCount: number
	getActiveWorkout: () => Promise<{ id: string } | null>
	countFinishedWorkouts: () => Promise<number>
}

export type InterstitialShowResult = 'shown' | 'skipped' | 'failed'

export class AdService {
	private initStarted = false
	private initialized = false
	private loadingInterstitial = false
	private loadedAd: LoadedInterstitialAd | null = null
	/** Successful shows in this cold JS session (not persisted). */
	private interstitialsShownThisSession = 0
	private readonly client: YandexAdsClient

	constructor (client?: YandexAdsClient) {
		this.client = client ?? createYandexAdsClient()
	}

	/**
	 * Initialize SDK once. Failure never blocks app bootstrap.
	 */
	async initialize (): Promise<void> {
		const globalFlag = globalThis as {
			__moySportzalAdsInitialized?: boolean
		}
		if (globalFlag.__moySportzalAdsInitialized) {
			this.initStarted = true
			this.initialized = true
			return
		}
		if (this.initStarted) {
			return
		}
		this.initStarted = true
		try {
			this.client.setLocationConsent(false)
			await this.client.initialize()
			this.initialized = true
			globalFlag.__moySportzalAdsInitialized = true
			void this.preloadInterstitial()
		} catch (error) {
			this.initialized = false
			// Allow a later retry after a transient failure.
			this.initStarted = false
			console.warn('Ads initialize failed', error)
		}
	}

	isInitialized (): boolean {
		return this.initialized
	}

	getInterstitialsShownThisSession (): number {
		return this.interstitialsShownThisSession
	}

	isInterstitialLoaded (): boolean {
		return this.loadedAd !== null
	}

	shouldShowBanner (hasActiveWorkout: boolean): boolean {
		return shouldShowBanner(hasActiveWorkout)
	}

	/**
	 * Preload interstitial while idle. Never shows automatically.
	 */
	async preloadInterstitial (): Promise<void> {
		if (this.loadingInterstitial || this.loadedAd) {
			return
		}
		if (
			this.interstitialsShownThisSession >= MAX_INTERSTITIALS_PER_SESSION
		) {
			// Still preload for a future cold session after show — allowed by policy.
			// Skip only while a show is already consumed AND we keep the slot empty.
		}
		this.loadingInterstitial = true
		try {
			const ad = await this.client.loadInterstitial(
				getInterstitialAdUnitId(),
			)
			this.loadedAd = ad
		} catch (error) {
			this.loadedAd = null
			console.warn('Ads interstitial preload failed', error)
		} finally {
			this.loadingInterstitial = false
		}
	}

	/**
	 * Pure eligibility check from a provided snapshot.
	 */
	canShowPostWorkoutInterstitial (
		ctx: PostWorkoutInterstitialContext,
	): boolean {
		return canShowPostWorkoutInterstitial(ctx)
	}

	/**
	 * Only permitted interstitial entry point: after summary "Готово".
	 * Re-checks all guards so a mistaken UI call still cannot show mid-workout.
	 */
	async showPostWorkoutInterstitial (
		deps: PostWorkoutInterstitialDeps,
	): Promise<InterstitialShowResult> {
		try {
			const [active, finishedWorkoutCount] = await Promise.all([
				deps.getActiveWorkout(),
				deps.countFinishedWorkouts(),
			])

			const evaluation = evaluatePostWorkoutInterstitial({
				hasActiveWorkout: active !== null,
				finishedWorkoutCount,
				currentWorkoutCompletedSetCount:
					deps.currentWorkoutCompletedSetCount,
				interstitialsShownThisSession: this.interstitialsShownThisSession,
				isInterstitialLoaded: this.loadedAd !== null,
			})

			if (!evaluation.allowed) {
				return 'skipped'
			}

			const ad = this.loadedAd
			if (!ad) {
				return 'skipped'
			}
			// Consume loaded slot before show so we never double-show the same object.
			this.loadedAd = null

			const result = await this.presentInterstitial(ad)
			if (result === 'shown') {
				this.interstitialsShownThisSession += 1
			}
			// Preload for a later cold session (session cap still blocks a second show).
			void this.preloadInterstitial()
			return result
		} catch (error) {
			console.warn('Ads showPostWorkoutInterstitial failed', error)
			return 'failed'
		}
	}

	/** Test helper — reset in-memory session state without touching native SDK. */
	resetSessionForTests (): void {
		this.interstitialsShownThisSession = 0
		this.loadedAd = null
		this.loadingInterstitial = false
		this.initStarted = false
		this.initialized = false
		const globalFlag = globalThis as {
			__moySportzalAdsInitialized?: boolean
		}
		delete globalFlag.__moySportzalAdsInitialized
	}

	private presentInterstitial (
		ad: LoadedInterstitialAd,
	): Promise<'shown' | 'failed'> {
		return new Promise((resolve) => {
			let settled = false
			let didShow = false

			const finish = (result: 'shown' | 'failed') => {
				if (settled) {
					return
				}
				settled = true
				clearTimeout(timer)
				resolve(result)
			}

			const timer = setTimeout(() => {
				finish(didShow ? 'shown' : 'failed')
			}, INTERSTITIAL_SHOW_TIMEOUT_MS)

			ad.setOnAdShown(() => {
				didShow = true
			})
			ad.setOnAdFailedToShow(() => {
				finish('failed')
			})
			ad.setOnAdDismissed(() => {
				finish(didShow ? 'shown' : 'failed')
			})

			void ad.show().catch(() => {
				finish('failed')
			})
		})
	}
}

/** Process-wide singleton used by UI. */
export const ads = new AdService()

export function initializeAds (): void {
	void ads.initialize()
}

export {
	canShowPostWorkoutInterstitial,
	evaluatePostWorkoutInterstitial,
	shouldShowBanner,
}
