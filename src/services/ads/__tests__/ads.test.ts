/**
 * Ads eligibility, session cap, and safety guards.
 */
import {
	AdService,
	createMemoryAdsClient,
	evaluatePostWorkoutInterstitial,
	getProductionAdUnitIds,
	PRODUCTION_BANNER_AD_UNIT_ID,
	PRODUCTION_INTERSTITIAL_AD_UNIT_ID,
	shouldShowBanner,
	UNUSED_AD_UNIT_IDS,
} from '@/src/services/ads'

function eligibleContext (
	overrides: Partial<Parameters<typeof evaluatePostWorkoutInterstitial>[0]> = {},
) {
	return {
		hasActiveWorkout: false,
		finishedWorkoutCount: 3,
		currentWorkoutCompletedSetCount: 5,
		interstitialsShownThisSession: 0,
		isInterstitialLoaded: true,
		...overrides,
	}
}

describe('banner suppression', () => {
	it('allows banner when there is no active workout', () => {
		expect(shouldShowBanner(false)).toBe(true)
	})

	it('hides banner when an active workout exists', () => {
		expect(shouldShowBanner(true)).toBe(false)
	})

	it('hides banner when active-workout state is unknown', () => {
		expect(shouldShowBanner(null)).toBe(false)
	})
})

describe('post-workout interstitial eligibility', () => {
	it('rejects when finished workout count is below 3', () => {
		const result = evaluatePostWorkoutInterstitial(
			eligibleContext({ finishedWorkoutCount: 2 }),
		)
		expect(result.allowed).toBe(false)
		expect(result.reason).toBe('history_threshold')
	})

	it('allows when finished workout count is 3+', () => {
		const result = evaluatePostWorkoutInterstitial(eligibleContext())
		expect(result.allowed).toBe(true)
	})

	it('rejects empty workouts with zero completed sets', () => {
		const result = evaluatePostWorkoutInterstitial(
			eligibleContext({ currentWorkoutCompletedSetCount: 0 }),
		)
		expect(result.allowed).toBe(false)
		expect(result.reason).toBe('empty_workout')
	})

	it('rejects when an active workout exists', () => {
		const result = evaluatePostWorkoutInterstitial(
			eligibleContext({ hasActiveWorkout: true }),
		)
		expect(result.allowed).toBe(false)
		expect(result.reason).toBe('active_workout')
	})

	it('rejects when already shown this session', () => {
		const result = evaluatePostWorkoutInterstitial(
			eligibleContext({ interstitialsShownThisSession: 1 }),
		)
		expect(result.allowed).toBe(false)
		expect(result.reason).toBe('session_cap')
	})

	it('rejects when ad is not loaded', () => {
		const result = evaluatePostWorkoutInterstitial(
			eligibleContext({ isInterstitialLoaded: false }),
		)
		expect(result.allowed).toBe(false)
		expect(result.reason).toBe('not_loaded')
	})
})

describe('AdService showPostWorkoutInterstitial', () => {
	beforeEach(() => {
		const globalFlag = globalThis as {
			__moySportzalAdsInitialized?: boolean
		}
		delete globalFlag.__moySportzalAdsInitialized
	})

	async function readyService () {
		const client = createMemoryAdsClient()
		const service = new AdService(client)
		await service.initialize()
		await service.preloadInterstitial()
		return { client, service }
	}

	it('does not call SDK show when ad is not loaded', async () => {
		const client = createMemoryAdsClient()
		const service = new AdService(client)
		// No initialize/preload → nothing loaded.
		const result = await service.showPostWorkoutInterstitial({
			currentWorkoutCompletedSetCount: 3,
			getActiveWorkout: async () => null,
			countFinishedWorkouts: async () => 5,
		})
		expect(result).toBe('skipped')
		expect(client.showCalls).toBe(0)
	})

	it('shows once then session-caps the second request', async () => {
		const { client, service } = await readyService()
		const deps = {
			currentWorkoutCompletedSetCount: 4,
			getActiveWorkout: async () => null,
			countFinishedWorkouts: async () => 4,
		}

		const first = await service.showPostWorkoutInterstitial(deps)
		expect(first).toBe('shown')
		expect(client.showCalls).toBe(1)
		expect(service.getInterstitialsShownThisSession()).toBe(1)

		// Wait for post-show preload to settle.
		await service.preloadInterstitial()
		const second = await service.showPostWorkoutInterstitial(deps)
		expect(second).toBe('skipped')
		expect(client.showCalls).toBe(1)
	})

	it('never invokes SDK show while an active workout exists', async () => {
		const { client, service } = await readyService()
		const result = await service.showPostWorkoutInterstitial({
			currentWorkoutCompletedSetCount: 10,
			getActiveWorkout: async () => ({ id: 'active-1' }),
			countFinishedWorkouts: async () => 10,
		})
		expect(result).toBe('skipped')
		expect(client.showCalls).toBe(0)
	})

	it('continues as failed without consuming session cap on show failure', async () => {
		const client = createMemoryAdsClient()
		client.failShow = true
		const service = new AdService(client)
		await service.initialize()
		await service.preloadInterstitial()

		const result = await service.showPostWorkoutInterstitial({
			currentWorkoutCompletedSetCount: 2,
			getActiveWorkout: async () => null,
			countFinishedWorkouts: async () => 3,
		})
		expect(result).toBe('failed')
		expect(service.getInterstitialsShownThisSession()).toBe(0)
		expect(client.showCalls).toBe(1)

		// Cap not consumed — a later successful show is still allowed.
		client.failShow = false
		await service.preloadInterstitial()
		const retry = await service.showPostWorkoutInterstitial({
			currentWorkoutCompletedSetCount: 2,
			getActiveWorkout: async () => null,
			countFinishedWorkouts: async () => 3,
		})
		expect(retry).toBe('shown')
		expect(service.getInterstitialsShownThisSession()).toBe(1)
	})

	it('isolates initialize failure from callers', async () => {
		const client = createMemoryAdsClient()
		client.initialize = async () => {
			throw new Error('sdk down')
		}
		const service = new AdService(client)
		await expect(service.initialize()).resolves.toBeUndefined()
		expect(service.isInitialized()).toBe(false)
	})
})

describe('production ad unit config', () => {
	it('locks production banner and interstitial IDs', () => {
		const ids = getProductionAdUnitIds()
		expect(ids.bannerId).toBe('R-M-19996564-1')
		expect(ids.interstitialId).toBe('R-M-19996564-2')
		expect(PRODUCTION_BANNER_AD_UNIT_ID).toBe('R-M-19996564-1')
		expect(PRODUCTION_INTERSTITIAL_AD_UNIT_ID).toBe('R-M-19996564-2')
	})

	it('does not wire unused app-open / rewarded / feed / native units', () => {
		expect(UNUSED_AD_UNIT_IDS.appOpen).toBe('R-M-19996564-4')
		expect(UNUSED_AD_UNIT_IDS.rewarded).toBe('R-M-19996564-3')
		expect(UNUSED_AD_UNIT_IDS.feed).toBe('R-M-19996564-5')
		expect(UNUSED_AD_UNIT_IDS.native).toBe('R-M-19996564-6')
		expect(PRODUCTION_INTERSTITIAL_AD_UNIT_ID).not.toBe(
			UNUSED_AD_UNIT_IDS.appOpen,
		)
	})
})

describe('ads must stay out of finishWorkout path', () => {
	it('workout service module source does not reference ads', () => {
		// Static guard: finishWorkout must remain free of monetization hooks.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const fs = require('node:fs') as typeof import('node:fs')
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const path = require('node:path') as typeof import('node:path')
		const file = path.join(
			process.cwd(),
			'src/db/services/workout-service.ts',
		)
		const source = fs.readFileSync(file, 'utf8')
		expect(source).not.toMatch(
			/showPostWorkoutInterstitial|services\/ads|yandex-mobile-ads/,
		)
		expect(source).toMatch(/async finishWorkout/)
	})
})
