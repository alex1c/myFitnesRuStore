/**
 * Post-finish workout summary.
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import type { WorkoutDetail } from '@/src/domain/types'
import { formatWorkoutDuration } from '@/src/features/workout/set-logic'
import {
	formatExerciseCount,
	formatSetCount,
} from '@/src/features/templates/summary'
import { useWorkoutService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function WorkoutSummaryScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()
	const [detail, setDetail] = useState<WorkoutDetail | null>(null)

	useEffect(() => {
		void (async () => {
			if (!id) {
				return
			}
			setDetail(await workouts.getDetail(id))
		})()
	}, [id, workouts])

	const completedSets = useMemo(() => {
		if (!detail) {
			return 0
		}
		return detail.exercises.reduce(
			(sum, block) =>
				sum + block.sets.filter((set) => set.completedAt).length,
			0,
		)
	}, [detail])

	if (!detail || !detail.workout.finishedAt) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	return (
		<Screen>
			<AppText variant="title">Тренировка завершена</AppText>
			<AppText variant="subtitle">{detail.workout.name}</AppText>
			<AppText muted>
				{formatWorkoutDuration(
					detail.workout.startedAt,
					detail.workout.finishedAt,
				)}
			</AppText>
			<AppText>
				{formatSetCount(completedSets)}
			</AppText>
			<AppText>
				{formatExerciseCount(detail.exercises.length)}
			</AppText>

			<Pressable
				onPress={() => router.replace('/')}
				style={[styles.primary, { backgroundColor: palette.primary }]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					Готово
				</AppText>
			</Pressable>
			<Pressable
				onPress={() => router.replace(`/workout/history/${detail.workout.id}`)}
				style={[styles.secondary, { borderColor: palette.border }]}
			>
				<AppText>Открыть тренировку</AppText>
			</Pressable>
		</Screen>
	)
}

const styles = StyleSheet.create({
	primary: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.md,
	},
	secondary: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
