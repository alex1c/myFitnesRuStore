/**
 * Production AppMetrica API key for «Мой спортзал».
 * Client-side analytics key (not a secret), kept in one place only.
 */
export const APPMETRICA_API_KEY =
	'a32d999f-baf6-47ee-bb66-ba951790be65' as const

/**
 * Inactivity session timeout (seconds). Gym workouts commonly pause
 * during rest / between exercises for many minutes.
 */
export const APPMETRICA_SESSION_TIMEOUT_SECONDS = 1800
