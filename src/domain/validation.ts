/**
 * Lightweight runtime guards for domain unions stored as TEXT in SQLite.
 */
import { SET_TYPES, TRACKING_TYPES } from './constants'
import type { SetType, TrackingType } from './types'

export function isTrackingType (value: unknown): value is TrackingType {
	return (
		typeof value === 'string' &&
		(TRACKING_TYPES as readonly string[]).includes(value)
	)
}

export function isSetType (value: unknown): value is SetType {
	return (
		typeof value === 'string' &&
		(SET_TYPES as readonly string[]).includes(value)
	)
}

export function assertTrackingType (value: unknown): TrackingType {
	if (!isTrackingType(value)) {
		throw new Error(`Invalid tracking type: ${String(value)}`)
	}
	return value
}

export function assertSetType (value: unknown): SetType {
	if (!isSetType(value)) {
		throw new Error(`Invalid set type: ${String(value)}`)
	}
	return value
}
