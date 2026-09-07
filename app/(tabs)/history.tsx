/**
 * History — completed workouts list (FlatList, newest first).
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { Workout } from '@/src/domain/types'
import { AppBannerSlot } from '@/src/features/ads/app-banner-slot'
import {
	formatExerciseCount,
	formatSetCount,
} from '@/src/features/templates/summary'
import { formatHistoryDate } from '@/src/features/workout/history-format'
import { formatWorkoutDuration } from '@/src/features/workout/set-logic'
import { useWorkoutService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type HistoryItem = {
	workout: Workout
	exerciseCount: number
	completedSetCount: number
}

export default function HistoryScreen () {
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()
	const [items, setItems] = useState<HistoryItem[]>([])

	const load = useCallback(async () => {
		setItems(await workouts.getHistorySummaries())
	}, [workouts])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	return (
		<SafeAreaView
			edges={['top']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<AppText variant="title" style={styles.title}>
				История
			</AppText>
			<FlatList
				data={items}
				keyExtractor={(item) => item.workout.id}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => (
					<View style={{ height: spacing.sm }} />
				)}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="subtitle">Пока нет тренировок</AppText>
						<AppText muted>
							Завершённые тренировки появятся здесь.
						</AppText>
					</View>
				}
				ListFooterComponent={<AppBannerSlot />}
				renderItem={({ item }) => (
					<Pressable
						onPress={() =>
							router.push(`/workout/history/${item.workout.id}`)
						}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: palette.surface,
								borderColor: palette.border,
								opacity: pressed ? 0.88 : 1,
							},
						]}
					>
						<AppText variant="caption" muted>
							{formatHistoryDate(
								item.workout.finishedAt ?? item.workout.startedAt,
							)}
						</AppText>
						<AppText variant="subtitle">{item.workout.name}</AppText>
						<AppText muted>
							{item.workout.finishedAt
								? formatWorkoutDuration(
									item.workout.startedAt,
									item.workout.finishedAt,
								)
								: '—'}
							{' • '}
							{formatSetCount(item.completedSetCount)}
							{' • '}
							{formatExerciseCount(item.exerciseCount)}
						</AppText>
					</Pressable>
				)}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	title: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		paddingBottom: spacing.sm,
	},
	list: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xxl,
		flexGrow: 1,
	},
	empty: {
		marginTop: spacing.xl,
		gap: spacing.sm,
	},
	card: {
		minHeight: touchTarget.minHeight + 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: 4,
	},
})
