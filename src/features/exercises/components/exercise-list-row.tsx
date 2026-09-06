/**
 * Compact exercise row for library FlatList scanning.
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { Exercise } from '@/src/domain/types'
import {
	equipmentLabel,
	formatRestLabel,
	muscleGroupLabel,
} from '@/src/features/exercises/labels'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	exercise: Exercise
	onPress: (exercise: Exercise) => void
}

export function ExerciseListRow ({ exercise, onPress }: Props) {
	const palette = useThemeColors()

	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => onPress(exercise)}
			style={({ pressed }) => [
				styles.row,
				{
					backgroundColor: palette.surface,
					borderColor: palette.border,
					opacity: pressed ? 0.86 : 1,
				},
			]}
		>
			<View style={styles.main}>
				<View style={styles.titleRow}>
					<AppText variant="subtitle" style={styles.title} numberOfLines={1}>
						{exercise.name}
					</AppText>
					{exercise.isCustom ? (
						<View
							style={[
								styles.badge,
								{ backgroundColor: palette.primaryMuted },
							]}
						>
							<AppText
								variant="label"
								style={{ color: palette.primary }}
							>
								Моё
							</AppText>
						</View>
					) : null}
				</View>
				<AppText variant="caption" muted numberOfLines={1}>
					{muscleGroupLabel(exercise.muscleGroup)}
					{' • '}
					{equipmentLabel(exercise.equipment)}
				</AppText>
			</View>
			<AppText variant="caption" muted>
				Отдых {formatRestLabel(exercise.defaultRestSeconds)}
			</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: {
		minHeight: touchTarget.minHeight + 8,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
	},
	main: {
		flex: 1,
		gap: 2,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	title: {
		flexShrink: 1,
	},
	badge: {
		paddingHorizontal: spacing.xs,
		paddingVertical: 2,
		borderRadius: radius.sm,
	},
})
