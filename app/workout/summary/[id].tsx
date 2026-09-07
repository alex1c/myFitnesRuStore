/**
 * Post-finish workout summary with volume and PR count.
 * Interstitial (if eligible) runs only after the user taps Готово.
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import type { WorkoutDetail } from '@/src/domain/types'
import { formatVolumeKg, setVolumeKg } from '@/src/features/progress/metrics'
import { formatWorkoutDuration } from '@/src/features/workout/set-logic'
import {
	formatExerciseCount,
	formatSetCount,
} from '@/src/features/templates/summary'
import { useWorkoutService } from '@/src/providers/database-provider'
import { ads } from '@/src/services/ads'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function WorkoutSummaryScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()
	const [detail, setDetail] = useState<WorkoutDetail | null>(null)
	const [recordCount, setRecordCount] = useState(0)
	const [isExiting, setIsExiting] = useState(false)

	useEffect(() => {
		void (async () => {
			if (!id) {
				return
			}
			const next = await workouts.getDetail(id)
			setDetail(next)
			if (next?.workout.finishedAt) {
				setRecordCount(
					await workouts.progress.countCelebratedRecordsInWorkout(id),
				)
			}
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

	const volumeKg = useMemo(() => {
		if (!detail) {
			return 0
		}
		return detail.exercises.reduce((sum, block) => {
			if (block.exercise?.trackingType !== 'weight_reps') {
				return sum
			}
			return (
				sum
				+ block.sets.reduce((inner, set) => {
					if (!set.completedAt) {
						return inner
					}
					return inner + (setVolumeKg(set.weight, set.reps) ?? 0)
				}, 0)
			)
		}, 0)
	}, [detail])

	const exerciseWithSets = useMemo(() => {
		if (!detail) {
			return 0
		}
		return detail.exercises.filter((block) =>
			block.sets.some((set) => set.completedAt),
		).length
	}, [detail])

	const handleDone = useCallback(async () => {
		if (isExiting) {
			return
		}
		setIsExiting(true)
		try {
			// Ad show is best-effort and never blocks leaving the summary.
			await ads.showPostWorkoutInterstitial({
				currentWorkoutCompletedSetCount: completedSets,
				getActiveWorkout: () => workouts.workouts.getActiveWorkout(),
				countFinishedWorkouts: () =>
					workouts.progress.countFinishedWorkouts(null),
			})
		} catch {
			// Ignore — navigation always proceeds.
		} finally {
			router.replace('/')
		}
	}, [completedSets, isExiting, router, workouts])

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
			<AppText>{formatSetCount(completedSets)}</AppText>
			<AppText>{formatExerciseCount(exerciseWithSets)}</AppText>
			{volumeKg > 0 ? (
				<AppText>{formatVolumeKg(volumeKg)} кг</AppText>
			) : null}
			{recordCount > 0 ? (
				<AppText>🏆 {recordCount}{' '}
					{recordCount === 1
						? 'рекорд'
						: recordCount < 5
							? 'рекорда'
							: 'рекордов'}
				</AppText>
			) : null}

			<Pressable
				disabled={isExiting}
				onPress={() => {
					void handleDone()
				}}
				style={[styles.primary, { backgroundColor: palette.primary }]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					Готово
				</AppText>
			</Pressable>
			<Pressable
				disabled={isExiting}
				onPress={() =>
					router.replace(`/workout/history/${detail.workout.id}`)
				}
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
