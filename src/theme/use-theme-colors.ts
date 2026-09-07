/**
 * Theme-aware color hook — respects user preference when available.
 */
import { useColorScheme } from 'react-native'

import { colors, type ColorPalette } from '@/src/theme'
import { useThemePreferenceOptional } from '@/src/providers/theme-preference-provider'
import { resolveColorScheme } from '@/src/features/settings/theme-preference'

export function useThemeColors (): ColorPalette {
	const preference = useThemePreferenceOptional()
	const systemScheme = useColorScheme()
	const scheme = preference
		? preference.resolvedScheme
		: resolveColorScheme('system', systemScheme)
	return scheme === 'dark' ? colors.dark : colors.light
}

export function useResolvedColorScheme (): 'light' | 'dark' {
	const preference = useThemePreferenceOptional()
	const systemScheme = useColorScheme()
	if (preference) {
		return preference.resolvedScheme
	}
	return resolveColorScheme('system', systemScheme)
}
