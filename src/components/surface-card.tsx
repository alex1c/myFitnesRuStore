/**
 * Soft surface panel used on placeholder screens.
 */
import React from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'

import { radius, spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = ViewProps & {
	children: React.ReactNode
}

export function SurfaceCard ({ children, style, ...rest }: Props) {
	const palette = useThemeColors()

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: palette.surface,
					borderColor: palette.border,
				},
				style,
			]}
			{...rest}
		>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.lg,
		gap: spacing.sm,
	},
})
