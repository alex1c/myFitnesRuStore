/**
 * Completed workout history detail — view, edit notes/sets, repeat, delete.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
	Alert,
	Pressable,
	StyleSheet,
	TextInput,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import { ActiveWorkoutExistsError } from '@/src/db'
import type { WorkoutDetail } from '@/src/domain/types'
import {
	formatExerciseCount,
	formatSetCount,
} from '@/src/features/templates/summary'
import {
	formatCompletedSetDisplay,
	formatHistoryDateTime,
	formatWorkoutDurationClock,
} from '@/src/features/workout/history-format'
import { formatWorkoutDuration } from '@/src/features/workout/set-logic'
import { useWorkoutService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function HistoryDetailScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()
	const [detail, setDetail] = useState<WorkoutDetail | null>(null)

	const load = useCallback(async () => {
		if (!id) {
			return
		}
		setDetail(await workouts.getDetail(id))
	}, [id, workouts])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleRepeat = () => {
		if (!detail) {
			return
		}
		void (async () => {
			try {
				const created = await workouts.repeatWorkout(detail.workout.id)
				router.replace(`/workout/${created.workout.id}`)
			} catch (error) {
				if (error instanceof ActiveWorkoutExistsError) {
					Alert.alert(
						'Уже есть активная тренировка',
						error.activeWorkout.name,
						[
							{
								text: 'Продолжить текущую',
								onPress: () =>
									router.push(`/workout/${error.activeWorkout.id}`),
							},
							{
								text: 'Завершить текущую',
								onPress: () => {
									void workouts
										.finishWorkout(error.activeWorkout.id)
										.then(() =>
											workouts.repeatWorkout(detail.workout.id),
										)
										.then((created) =>
											router.replace(`/workout/${created.workout.id}`),
										)
										.catch((err: unknown) => {
											Alert.alert(
												'Ошибка',
												err instanceof Error
													? err.message
													: 'Попробуйте ещё раз',
											)
										})
								},
							},
							{ text: 'Отмена', style: 'cancel' },
						],
					)
					return
				}
				Alert.alert(
					'Не удалось повторить',
					error instanceof Error ? error.message : 'Попробуйте ещё раз',
				)
			}
		})()
	}

	const handleDelete = () => {
		if (!detail) {
			return
		}
		Alert.alert(
			'Удалить тренировку?',
			'Тренировка и все записанные подходы будут удалены без возможности восстановления.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Удалить тренировку',
					style: 'destructive',
					onPress: () => {
						void workouts
							.deleteCompletedWorkout(detail.workout.id)
							.then(() => router.replace('/(tabs)/history'))
							.catch((err: unknown) => {
								Alert.alert(
									'Не удалось удалить',
									err instanceof Error
										? err.message
										: 'Попробуйте ещё раз',
								)
							})
					},
				},
			],
		)
	}

	if (!detail || !detail.workout.finishedAt) {
		return (
			<Screen>
				<AppText muted>
					{detail && !detail.workout.finishedAt
						? 'Тренировка ещё не завершена'
						: 'Загрузка…'}
				</AppText>
			</Screen>
		)
	}

	const completedCount = detail.exercises.reduce(
		(sum, block) =>
			sum + block.sets.filter((set) => set.completedAt).length,
		0,
	)
	const exerciseWithSets = detail.exercises.filter((block) =>
		block.sets.some((set) => set.completedAt),
	).length

	return (
		<Screen>
			<AppText variant="title">{detail.workout.name}</AppText>
			<AppText muted>
				{formatHistoryDateTime(detail.workout.finishedAt)}
			</AppText>
			<AppText muted>
				{formatWorkoutDuration(
					detail.workout.startedAt,
					detail.workout.finishedAt,
				)}
				{' • '}
				{formatWorkoutDurationClock(
					detail.workout.startedAt,
					detail.workout.finishedAt,
				)}
			</AppText>
			<AppText muted>
				{formatSetCount(completedCount)}
				{' • '}
				{formatExerciseCount(exerciseWithSets)}
			</AppText>

			<AppText variant="caption" muted>
				Заметка к тренировке
			</AppText>
			<TextInput
				defaultValue={detail.workout.notes ?? ''}
				placeholder="Например: хорошая тренировка"
				placeholderTextColor={palette.textMuted}
				multiline
				onEndEditing={(event) => {
					const text = event.nativeEvent.text.trim()
					void workouts
						.updateWorkoutNotes(
							detail.workout.id,
							text.length > 0 ? text : null,
						)
						.catch(() => {
							Alert.alert('Не удалось сохранить заметку')
						})
				}}
				style={[
					styles.notes,
					{
						color: palette.text,
						borderColor: palette.border,
						backgroundColor: palette.surface,
					},
				]}
			/>

			{detail.exercises.map((block) => {
				const completed = block.sets.filter((set) => set.completedAt)
				const tracking = block.exercise?.trackingType ?? 'weight_reps'
				return (
					<SurfaceCard key={block.workoutExercise.id}>
						<AppText variant="subtitle">
							{block.exercise?.name ?? 'Упражнение'}
							{block.exercise?.archivedAt ? ' (архив)' : ''}
						</AppText>
						{block.workoutExercise.notes ? (
							<AppText muted>{block.workoutExercise.notes}</AppText>
						) : null}
						{completed.length === 0 ? (
							<AppText muted>Нет выполненных подходов</AppText>
						) : (
							completed.map((set, index) => (
								<Pressable
									key={set.id}
									onPress={() =>
										router.push(
											`/workout/history/edit-set/${set.id}`,
										)
									}
									style={styles.setRow}
								>
									<AppText>
										{index + 1}.{' '}
										{formatCompletedSetDisplay(set, tracking)}
									</AppText>
									<AppText
										variant="caption"
										style={{ color: palette.primary }}
									>
										Изменить
									</AppText>
								</Pressable>
							))
						)}
					</SurfaceCard>
				)
			})}

			<Pressable
				onPress={handleRepeat}
				style={[styles.primary, { backgroundColor: palette.primary }]}
			>
				<AppText
					variant="subtitle"
					style={{ color: palette.onPrimary }}
				>
					Повторить тренировку
				</AppText>
			</Pressable>

			<Pressable onPress={handleDelete} style={styles.delete}>
				<AppText style={{ color: palette.danger }}>
					Удалить тренировку
				</AppText>
			</Pressable>
		</Screen>
	)
}

const styles = StyleSheet.create({
	notes: {
		minHeight: 72,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		padding: spacing.md,
		textAlignVertical: 'top',
		...typography.body,
	},
	setRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: spacing.sm,
		minHeight: 40,
		paddingVertical: 4,
	},
	primary: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.md,
	},
	delete: {
		minHeight: touchTarget.minHeight,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
