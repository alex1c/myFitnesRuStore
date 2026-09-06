/**
 * Domain runtime validation tests.
 */
import { SET_TYPES, TRACKING_TYPES } from '@/src/domain/constants'
import {
	assertSetType,
	assertTrackingType,
	isSetType,
	isTrackingType,
} from '@/src/domain/validation'

describe('domain tracking and set types', () => {
	it('accepts all defined tracking types', () => {
		for (const value of TRACKING_TYPES) {
			expect(isTrackingType(value)).toBe(true)
			expect(assertTrackingType(value)).toBe(value)
		}
	})

	it('rejects unknown tracking types', () => {
		expect(isTrackingType('reps_only')).toBe(false)
		expect(isTrackingType(null)).toBe(false)
		expect(() => assertTrackingType('nope')).toThrow(/Invalid tracking type/)
	})

	it('accepts all defined set types', () => {
		for (const value of SET_TYPES) {
			expect(isSetType(value)).toBe(true)
			expect(assertSetType(value)).toBe(value)
		}
	})

	it('rejects unknown set types', () => {
		expect(isSetType('amrap')).toBe(false)
		expect(() => assertSetType('amrap')).toThrow(/Invalid set type/)
	})
})
