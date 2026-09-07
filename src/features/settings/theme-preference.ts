/**
 * Theme preference model — system / light / dark with safe parsing.
 */
export const THEME_PREFERENCE_KEY = 'ui_theme_preference' as const

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export type ResolvedColorScheme = 'light' | 'dark'

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
	system: 'Системная',
	light: 'Светлая',
	dark: 'Тёмная',
}

/** Default on first launch. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

/**
 * Parse a stored preference; invalid values fall back to system.
 */
export function parseThemePreference (raw: unknown): ThemePreference {
	if (raw === 'light' || raw === 'dark' || raw === 'system') {
		return raw
	}
	return DEFAULT_THEME_PREFERENCE
}

/**
 * Resolve the effective light/dark scheme from preference + OS setting.
 */
export function resolveColorScheme (
	preference: ThemePreference,
	systemScheme: string | null | undefined,
): ResolvedColorScheme {
	if (preference === 'light') {
		return 'light'
	}
	if (preference === 'dark') {
		return 'dark'
	}
	return systemScheme === 'dark' ? 'dark' : 'light'
}
