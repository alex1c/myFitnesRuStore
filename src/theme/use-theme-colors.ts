/**
 * Theme-aware color hook built on design tokens (not scattered hex values).
 */
import { useColorScheme } from 'react-native'

import { colors, type ColorPalette } from '@/src/theme'

export function useThemeColors (): ColorPalette {
	const scheme = useColorScheme()
	return scheme === 'dark' ? colors.dark : colors.light
}
