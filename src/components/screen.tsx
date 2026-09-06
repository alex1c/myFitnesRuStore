/**
 * Shared screen chrome for tab placeholders.
 */
import React from 'react'
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type ScreenProps = ViewProps & {
	children: React.ReactNode
	scroll?: boolean
}

export function Screen ({
	children,
	scroll = true,
	style,
	...rest
}: ScreenProps) {
	const palette = useThemeColors()

	const content = scroll ? (
		<ScrollView
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{children}
		</ScrollView>
	) : (
		<View style={styles.content}>{children}</View>
	)

	return (
		<SafeAreaView
			edges={['top']}
			style={[styles.root, { backgroundColor: palette.background }, style]}
			{...rest}
		>
			{content}
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		paddingBottom: spacing.xxl,
		gap: spacing.md,
	},
})
