/**
 * Thin AppMetrica SDK adapter — isolate native module from app code.
 */
import type { AnalyticsParams } from './events'

export type AnalyticsActivateConfig = {
	apiKey: string
	sessionTimeout?: number
	locationTracking?: boolean
	advIdentifiersTracking?: boolean
	crashReporting?: boolean
	logs?: boolean
	statisticsSending?: boolean
}

export type AnalyticsClient = {
	activate: (config: AnalyticsActivateConfig) => void
	reportEvent: (eventName: string, params?: AnalyticsParams) => void
}

/**
 * Lazy native client so Jest can mock the package without native bridges.
 */
export function createAppMetricaClient (): AnalyticsClient {
	return {
		activate (config) {
			// Dynamic require keeps module init off the critical import path.
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const AppMetrica = require('@appmetrica/react-native-analytics')
				.default as {
				activate: (config: AnalyticsActivateConfig) => void
				reportEvent: (
					eventName: string,
					params?: Record<string, unknown>,
				) => void
			}
			AppMetrica.activate(config)
		},
		reportEvent (eventName, params) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const AppMetrica = require('@appmetrica/react-native-analytics')
				.default as {
				reportEvent: (
					eventName: string,
					params?: Record<string, unknown>,
				) => void
			}
			AppMetrica.reportEvent(eventName, params)
		},
	}
}

/** In-memory client for unit tests. */
export function createMemoryAnalyticsClient (): AnalyticsClient & {
	activations: AnalyticsActivateConfig[]
	events: { name: string; params?: AnalyticsParams }[]
} {
	const activations: AnalyticsActivateConfig[] = []
	const events: { name: string; params?: AnalyticsParams }[] = []
	return {
		activations,
		events,
		activate (config) {
			activations.push(config)
		},
		reportEvent (name, params) {
			events.push({ name, params })
		},
	}
}
