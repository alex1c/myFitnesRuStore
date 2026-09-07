/**
 * Tiny schematic of a set row — previous result vs today's inputs.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { radius, spacing, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export function SetLoggingMockup () {
	const palette = useThemeColors()

	return (
		<View
			accessibilityLabel="Пример строки подхода: прошлый результат 80 на 10, сегодня 82,5 на 10"
			style={[
				styles.wrap,
				{
					backgroundColor: palette.surfaceElevated,
					borderColor: palette.border,
				},
			]}
		>
			<View style={styles.header}>
				<AppText variant="caption" muted style={styles.prevCol}>
					Прошлый
				</AppText>
				<AppText variant="caption" muted style={styles.field}>
					кг
				</AppText>
				<AppText variant="caption" muted style={styles.field}>
					Повт.
				</AppText>
				<AppText variant="caption" muted style={styles.check}>
					✓
				</AppText>
			</View>
			<View style={styles.row}>
				<AppText style={[styles.prevCol, { color: palette.textMuted }]}>
					80×10
				</AppText>
				<View
					style={[
						styles.inputLook,
						{
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
				>
					<AppText>82,5</AppText>
				</View>
				<View
					style={[
						styles.inputLook,
						{
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
				>
					<AppText>10</AppText>
				</View>
				<View
					style={[
						styles.checkBtn,
						{ backgroundColor: palette.primary },
					]}
				>
					<AppText style={{ color: palette.onPrimary, ...typography.subtitle }}>
						✓
					</AppText>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		padding: spacing.sm,
		gap: spacing.xs,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	prevCol: {
		flex: 1.1,
		minWidth: 56,
	},
	field: {
		flex: 1,
		textAlign: 'center',
	},
	check: {
		width: 44,
		textAlign: 'center',
	},
	inputLook: {
		flex: 1,
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xs,
	},
	checkBtn: {
		width: 44,
		minHeight: 40,
		borderRadius: radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
