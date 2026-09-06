/**
 * Safely parse user-entered decimal weights.
 * Accepts both comma and point separators used in RU locale input.
 * Invalid input returns null instead of silently becoming NaN/0.
 */

export type ParseDecimalResult =
	| { ok: true; value: number }
	| { ok: false; reason: 'empty' | 'invalid' }

/**
 * Normalize and parse a decimal string from the user.
 * Examples: "12,5" → 12.5, "12.5" → 12.5, "82" → 82
 */
export function parseDecimalInput (raw: string): ParseDecimalResult {
	const trimmed = raw.trim()

	if (trimmed.length === 0) {
		return { ok: false, reason: 'empty' }
	}

	// Disallow spaces and exotic separators early.
	if (/\s/.test(trimmed)) {
		return { ok: false, reason: 'invalid' }
	}

	// Allow optional leading minus for completeness, then digits with one separator.
	const normalized = trimmed.replace(',', '.')

	// Reject multiple separators or trailing/leading junk.
	if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
		return { ok: false, reason: 'invalid' }
	}

	const value = Number(normalized)

	if (!Number.isFinite(value)) {
		return { ok: false, reason: 'invalid' }
	}

	return { ok: true, value }
}

/**
 * Convenience helper when callers need a number or null.
 */
export function parseDecimalOrNull (raw: string): number | null {
	const result = parseDecimalInput(raw)
	return result.ok ? result.value : null
}
