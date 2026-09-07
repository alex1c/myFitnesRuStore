/**
 * Best-effort product analytics. Never throws into business flows.
 */
import {
	APPMETRICA_API_KEY,
	APPMETRICA_SESSION_TIMEOUT_SECONDS,
} from './config'
import {
	createAppMetricaClient,
	type AnalyticsClient,
} from './client'
import {
	ANALYTICS_EVENTS,
	type CustomExerciseCreatedParams,
	type RestTimerAdjustedParams,
	type RestTimerStartedParams,
	type SetCompletedParams,
	type TemplateCreatedParams,
	type TemplateDuplicatedParams,
	type WorkoutCompletedParams,
	type WorkoutDiscardedParams,
	type WorkoutStartedParams,
} from './events'
import {
	durationSecondsBetween,
	restDurationBucket,
	safeNonNegativeInt,
	sanitizeAnalyticsParams,
} from './params'

export class AnalyticsService {
	private initialized = false
	private readonly client: AnalyticsClient

	constructor (client?: AnalyticsClient) {
		this.client = client ?? createAppMetricaClient()
	}

	/**
	 * Activate AppMetrica once per JS runtime. Safe to call repeatedly.
	 */
	initialize (): void {
		const globalFlag = globalThis as {
			__moySportzalAnalyticsInitialized?: boolean
		}
		if (this.initialized || globalFlag.__moySportzalAnalyticsInitialized) {
			this.initialized = true
			return
		}
		try {
			this.client.activate({
				apiKey: APPMETRICA_API_KEY,
				sessionTimeout: APPMETRICA_SESSION_TIMEOUT_SECONDS,
				locationTracking: false,
				advIdentifiersTracking: false,
				crashReporting: true,
				logs: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
				statisticsSending: true,
			})
			this.initialized = true
			globalFlag.__moySportzalAnalyticsInitialized = true
		} catch (error) {
			// Avoid retry storms; app continues without analytics.
			this.initialized = true
			console.warn('Analytics initialize failed', error)
		}
	}

	trackWorkoutStarted (params: WorkoutStartedParams): void {
		this.track(ANALYTICS_EVENTS.workoutStarted, {
			source: params.source,
			exercise_count: safeNonNegativeInt(params.exercise_count),
			planned_set_count: safeNonNegativeInt(params.planned_set_count),
		})
	}

	trackWorkoutCompleted (params: WorkoutCompletedParams): void {
		this.track(ANALYTICS_EVENTS.workoutCompleted, {
			duration_seconds: safeNonNegativeInt(params.duration_seconds),
			completed_set_count: safeNonNegativeInt(params.completed_set_count),
			exercise_count: safeNonNegativeInt(params.exercise_count),
		})
	}

	trackWorkoutDiscarded (params: WorkoutDiscardedParams): void {
		this.track(ANALYTICS_EVENTS.workoutDiscarded, {
			duration_seconds: safeNonNegativeInt(params.duration_seconds),
			completed_set_count: safeNonNegativeInt(params.completed_set_count),
		})
	}

	trackSetCompleted (params: SetCompletedParams): void {
		this.track(ANALYTICS_EVENTS.setCompleted, {
			tracking_type: params.tracking_type,
			set_type: params.set_type,
		})
	}

	trackRestTimerStarted (restSeconds: number): void {
		const payload: RestTimerStartedParams = {
			duration_bucket: restDurationBucket(restSeconds),
		}
		this.track(ANALYTICS_EVENTS.restTimerStarted, payload)
	}

	trackRestTimerSkipped (): void {
		this.track(ANALYTICS_EVENTS.restTimerSkipped)
	}

	trackRestTimerAdjusted (direction: RestTimerAdjustedParams['direction']): void {
		this.track(ANALYTICS_EVENTS.restTimerAdjusted, { direction })
	}

	trackTemplateCreated (params: TemplateCreatedParams): void {
		this.track(ANALYTICS_EVENTS.templateCreated, {
			exercise_count: safeNonNegativeInt(params.exercise_count),
		})
	}

	trackTemplateDuplicated (params: TemplateDuplicatedParams): void {
		this.track(ANALYTICS_EVENTS.templateDuplicated, {
			exercise_count: safeNonNegativeInt(params.exercise_count),
		})
	}

	trackCustomExerciseCreated (params: CustomExerciseCreatedParams): void {
		const payload: CustomExerciseCreatedParams = {
			tracking_type: params.tracking_type,
		}
		if (params.equipment_category) {
			payload.equipment_category = params.equipment_category
		}
		this.track(ANALYTICS_EVENTS.customExerciseCreated, payload)
	}

	trackBackupCreated (): void {
		this.track(ANALYTICS_EVENTS.backupCreated)
	}

	trackRestoreCompleted (): void {
		this.track(ANALYTICS_EVENTS.restoreCompleted)
	}

	trackCsvExported (): void {
		this.track(ANALYTICS_EVENTS.csvExported)
	}

	/** Test helper — whether initialize already ran. */
	isInitialized (): boolean {
		return this.initialized
	}

	private track (
		name: string,
		params?: Record<string, string | number | boolean>,
	): void {
		try {
			const safe = sanitizeAnalyticsParams(params)
			this.client.reportEvent(name, safe)
		} catch (error) {
			console.warn('Analytics track failed', name, error)
		}
	}
}

/** Process-wide singleton used by services/UI. */
export const analytics = new AnalyticsService()

export function initializeAnalytics (): void {
	analytics.initialize()
}

export { durationSecondsBetween, restDurationBucket, safeNonNegativeInt }
