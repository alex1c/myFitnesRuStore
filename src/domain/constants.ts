/**
 * Runtime-allowed domain values used by validation helpers and tests.
 */
import type { SetType, TrackingType } from './types'

export const TRACKING_TYPES: readonly TrackingType[] = [
	'weight_reps',
	'bodyweight_reps',
	'assisted_reps',
	'duration',
	'distance_duration',
] as const

export const SET_TYPES: readonly SetType[] = [
	'warmup',
	'working',
	'drop',
	'failure',
] as const

/** Default set role when the caller does not specify one. */
export const DEFAULT_SET_TYPE: SetType = 'working'
