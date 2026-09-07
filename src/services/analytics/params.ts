/**
 * Pure helpers for analytics parameter sanitization and buckets.
 */
import type {
	AnalyticsParams,
	AnalyticsPrimitive,
	RestDurationBucket,
} from './events'
import { FORBIDDEN_ANALYTICS_KEYS } from './events'

export function restDurationBucket (seconds: number): RestDurationBucket {
	const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
	if (value <= 60) {
		return 'lte60'
	}
	if (value <= 90) {
		return '61-90'
	}
	if (value <= 120) {
		return '91-120'
	}
	if (value <= 180) {
		return '121-180'
	}
	return 'gt180'
}

export function safeNonNegativeInt (value: number): number {
	if (!Number.isFinite(value)) {
		return 0
	}
	return Math.max(0, Math.floor(value))
}

export function durationSecondsBetween (
	startedAtIso: string,
	endedAtMs = Date.now(),
): number {
	const started = Date.parse(startedAtIso)
	if (!Number.isFinite(started)) {
		return 0
	}
	return safeNonNegativeInt((endedAtMs - started) / 1000)
}

/**
 * Strip forbidden keys and non-primitive values from a params object.
 */
export function sanitizeAnalyticsParams (
	params: AnalyticsParams | undefined,
): AnalyticsParams | undefined {
	if (!params) {
		return undefined
	}
	const forbidden = new Set<string>(FORBIDDEN_ANALYTICS_KEYS)
	const result: AnalyticsParams = {}
	for (const [key, value] of Object.entries(params)) {
		if (forbidden.has(key)) {
			continue
		}
		if (!isAnalyticsPrimitive(value)) {
			continue
		}
		result[key] = value
	}
	return result
}

function isAnalyticsPrimitive (value: unknown): value is AnalyticsPrimitive {
	return (
		typeof value === 'string'
		|| typeof value === 'number'
		|| typeof value === 'boolean'
	)
}

export function assertNoForbiddenKeys (params: AnalyticsParams): void {
	for (const key of Object.keys(params)) {
		if ((FORBIDDEN_ANALYTICS_KEYS as readonly string[]).includes(key)) {
			throw new Error(`Forbidden analytics key: ${key}`)
		}
	}
}
