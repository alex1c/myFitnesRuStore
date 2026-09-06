/**
 * Compact template card for Today and archive lists.
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { formatTemplateSummary } from '@/src/features/templates/summary'
import type { TemplateExercise, WorkoutTemplate } from '@/src/domain/types'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	template: WorkoutTemplate
	exercises: TemplateExercise[]
	onPress: () => void
}

export function TemplateListCard ({ template, exercises, onPress }: Props) {
	const palette = useThemeColors()

	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: palette.surface,
					borderColor: palette.border,
					opacity: pressed ? 0.88 : 1,
				},
			]}
		>
			<View style={styles.text}>
				<AppText variant="subtitle" numberOfLines={1}>
					{template.name}
				</AppText>
				<AppText variant="caption" muted numberOfLines={1}>
					{formatTemplateSummary(exercises)}
				</AppText>
			</View>
			<AppText variant="caption" style={{ color: palette.primary }}>
				Открыть
			</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: {
		minHeight: touchTarget.minHeight + 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
	},
	text: {
		flex: 1,
		gap: 2,
	},
})
