/**
 * Unit tests for decimal input parsing (RU comma + point).
 */
import {
	parseDecimalInput,
	parseDecimalOrNull,
} from '@/src/utils/parse-decimal'

describe('parseDecimalInput', () => {
	it('parses comma decimals', () => {
		expect(parseDecimalInput('12,5')).toEqual({ ok: true, value: 12.5 })
		expect(parseDecimalInput('17,5')).toEqual({ ok: true, value: 17.5 })
		expect(parseDecimalInput('82,5')).toEqual({ ok: true, value: 82.5 })
	})

	it('parses point decimals', () => {
		expect(parseDecimalInput('12.5')).toEqual({ ok: true, value: 12.5 })
		expect(parseDecimalInput('0.25')).toEqual({ ok: true, value: 0.25 })
	})

	it('parses integers', () => {
		expect(parseDecimalInput('100')).toEqual({ ok: true, value: 100 })
		expect(parseDecimalInput('0')).toEqual({ ok: true, value: 0 })
	})

	it('rejects empty input', () => {
		expect(parseDecimalInput('')).toEqual({ ok: false, reason: 'empty' })
		expect(parseDecimalInput('   ')).toEqual({ ok: false, reason: 'empty' })
	})

	it('rejects invalid numeric values without silent coercion', () => {
		expect(parseDecimalInput('12,5,5')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput('12.5.1')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput('abc')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput('12kg')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput('12 5')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput(',5')).toEqual({
			ok: false,
			reason: 'invalid',
		})
		expect(parseDecimalInput('12,')).toEqual({
			ok: false,
			reason: 'invalid',
		})
	})

	it('exposes null helper for invalid values', () => {
		expect(parseDecimalOrNull('12,5')).toBe(12.5)
		expect(parseDecimalOrNull('bad')).toBeNull()
	})
})
