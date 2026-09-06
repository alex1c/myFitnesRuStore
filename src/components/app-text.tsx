/**
 * Typography helpers bound to theme tokens.
 */
import React from 'react'
import { Text as RNText, StyleSheet, type TextProps } from 'react-native'

import { typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Variant = 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label'

type AppTextProps = TextProps & {
	variant?: Variant
	muted?: boolean
}

export function AppText ({
	variant = 'body',
	muted = false,
	style,
	...rest
}: AppTextProps) {
	const palette = useThemeColors()
	const color = muted ? palette.textMuted : palette.text

	return (
		<RNText
			style={[typography[variant], { color }, styles.base, style]}
			{...rest}
		/>
	)
}

const styles = StyleSheet.create({
	base: {
		includeFontPadding: false,
	},
})
