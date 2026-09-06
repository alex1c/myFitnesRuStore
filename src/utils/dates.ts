/**
 * Stable ISO-8601 UTC timestamps for SQLite storage.
 * Never store localized display strings as primary date data.
 */

export function nowIso (): string {
	return new Date().toISOString()
}

export function toIso (date: Date): string {
	return date.toISOString()
}
