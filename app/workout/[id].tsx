/**
 * Active workout screen — compact set logging with previous results.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Alert,
	AppState,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { SetType, WorkoutDetail } from '@/src/domain/types'
import { SET_TYPES } from '@/src/domain/constants'
import { formatRestLabel } from '@/src/features/exercises/labels'
import { formatElapsed } from '@/src/features/workout/set-logic'
import { SET_TYPE_LABELS } from '@/src/features/workout/labels'
import { WorkoutSetRow } from '@/src/features/workout/components/workout-set-row'
import { RestTimerPanel } from '@/src/features/workout/components/rest-timer-panel'
import { PersonalRecordBanner } from '@/src/features/progress/components/personal-record-banner'
import type { PersonalRecordEvent } from '@/src/db/services/progress-service'
import { formatSetCount } from '@/src/features/templates/summary'
import { useWorkoutService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function ActiveWorkoutScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()
	const [detail, setDetail] = useState<WorkoutDetail | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [recordBanner, setRecordBanner] = useState<PersonalRecordEvent | null>(
		null,
	)

	const load = useCallback(async () => {
		if (!id) {
			return
		}
		await workouts.restTimer.reconcileWorkout(id)
		const next = await workouts.getDetail(id)
		setDetail(next)
	}, [id, workouts])

	useFocusEffect(
		useCallback(() => {
			void load()
			const subscription = AppState.addEventListener('change', (state) => {
				if (state === 'active') {
					void load()
				}
			})
			return () => subscription.remove()
		}, [load]),
	)

	const completedCount = useMemo(() => {
		if (!detail) {
			return 0
		}
		return detail.exercises.reduce(
			(sum, block) =>
				sum + block.sets.filter((set) => set.completedAt).length,
			0,
		)
	}, [detail])

	const showError = useCallback((message: string) => {
		setError(message)
		Alert.alert('Не удалось сохранить', message)
	}, [])

	const maybeAskNotificationPermission = useCallback(() => {
		if (!workouts.restTimer.consumePermissionPromptNeeded()) {
			return
		}
		Alert.alert(
			'Уведомления об отдыхе',
			'Разрешите уведомления об окончании отдыха. На Android также разрешите точные будильники в системных настройках, чтобы сигнал приходил вовремя при заблокированном экране. Без этого Android может задерживать уведомление.',
			[
				{ text: 'Не сейчас', style: 'cancel' },
				{
					text: 'Разрешить',
					onPress: () => {
						void workouts.restTimer.requestNotificationPermission().catch((error: unknown) => {
							showError(error instanceof Error ? error.message : 'Не удалось открыть настройки уведомлений')
						})
					},
				},
			],
		)
	}, [showError, workouts])

	const handleComplete = async (
		setId: string,
		values: {
			weight: number | null
			reps: number | null
			durationSeconds: number | null
			distance: number | null
		},
	) => {
		try {
			const result = await workouts.completeSet(setId, values)
			setError(null)
			const celebrated = result.records.find((item) => item.celebrate)
			setRecordBanner(celebrated ?? null)
			await load()
			maybeAskNotificationPermission()
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Попробуйте ещё раз')
			throw err
		}
	}

	const refreshRestFromWorkout = useCallback(async () => {
		if (!id) {
			return
		}
		const next = await workouts.getDetail(id)
		setDetail(next)
	}, [id, workouts])

	const handleRestExpired = useCallback(() => {
		// Clear persisted timer + notification; delay UI refresh so
		// the panel can briefly show «Отдых закончен».
		void workouts.restTimer.skip(id!).then(() => {
			setTimeout(() => {
				void refreshRestFromWorkout()
			}, 1800)
		})
	}, [id, refreshRestFromWorkout, workouts])

	if (!detail || detail.workout.finishedAt) {
		return (
			<SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
				<AppText muted style={{ padding: spacing.lg }}>
					{detail?.workout.finishedAt
						? 'Тренировка уже завершена'
						: 'Загрузка…'}
				</AppText>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView
			edges={['bottom']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<KeyboardAvoidingView
				style={styles.flex}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				{/* Timer lives in an isolated subtree so set rows are not re-rendered every tick. */}
				<WorkoutHeader
					name={detail.workout.name}
					startedAt={detail.workout.startedAt}
					completedCount={completedCount}
					error={error}
				/>

				{recordBanner ? (
					<PersonalRecordBanner
						event={recordBanner}
						onDismiss={() => setRecordBanner(null)}
					/>
				) : null}

				{detail.workout.restEndsAt ? (
					<RestTimerPanel
						endsAt={detail.workout.restEndsAt}
						onAdd15={() => {
							void workouts.restTimer
								.add15(detail.workout.id)
								.then(refreshRestFromWorkout)
						}}
						onMinus15={() => {
							void workouts.restTimer
								.minus15(detail.workout.id)
								.then(refreshRestFromWorkout)
						}}
						onSkip={() => {
							void workouts.restTimer
								.skip(detail.workout.id)
								.then(refreshRestFromWorkout)
						}}
						onExpired={handleRestExpired}
					/>
				) : null}

				<FlatList
					data={detail.exercises}
					keyExtractor={(item) => item.workoutExercise.id}
					contentContainerStyle={styles.list}
					keyboardShouldPersistTaps="handled"
					ListEmptyComponent={
						<AppText muted>
							Добавьте упражнение, чтобы начать подходы.
						</AppText>
					}
					renderItem={({ item, index }) => (
						<View
							style={[
								styles.block,
								{
									backgroundColor: palette.surface,
									borderColor: palette.border,
								},
							]}
						>
							<View style={styles.blockHeader}>
								<View style={styles.blockTitle}>
									<AppText variant="subtitle" numberOfLines={2}>
										{item.exercise?.name ?? 'Упражнение'}
									</AppText>
									<AppText variant="caption" muted>
										Отдых{' '}
										{formatRestLabel(
											item.workoutExercise.restSeconds
												?? item.exercise?.defaultRestSeconds
												?? 90,
										)}
										{item.exercise?.archivedAt
											? ' • в архиве'
											: ''}
									</AppText>
								</View>
								<View style={styles.blockActions}>
									<SmallButton
										label="↑"
										accessibilityLabel="Переместить упражнение вверх"
										disabled={index === 0}
										onPress={() => {
											void workouts
												.moveExercise(item.workoutExercise.id, 'up')
												.then(setDetail)
										}}
									/>
									<SmallButton
										label="↓"
										accessibilityLabel="Переместить упражнение вниз"
										disabled={index === detail.exercises.length - 1}
										onPress={() => {
											void workouts
												.moveExercise(item.workoutExercise.id, 'down')
												.then(setDetail)
										}}
									/>
								</View>
							</View>

							<TextInput
								defaultValue={item.workoutExercise.notes ?? ''}
								placeholder="Заметка к упражнению"
								placeholderTextColor={palette.textMuted}
								onEndEditing={(event) => {
									const text = event.nativeEvent.text.trim()
									void workouts.updateExerciseNotes(
										item.workoutExercise.id,
										text.length > 0 ? text : null,
									)
								}}
								style={[
									styles.note,
									{
										color: palette.text,
										borderColor: palette.border,
										backgroundColor: palette.surfaceElevated,
									},
								]}
							/>

							<View style={styles.sets}>
								{item.sets.map((set, setIndex) => (
									<WorkoutSetRow
										key={set.id}
										index={setIndex}
										set={set}
										previous={item.previousSets[setIndex]}
										exercise={item.exercise}
										onComplete={handleComplete}
										onUncomplete={async (setId) => {
											await workouts.uncompleteSet(setId)
											await load()
										}}
										onSaveDraft={async (setId, values) => {
											await workouts.updateSetValues(setId, values)
										}}
										onChangeType={(setId) => {
											const buttons: {
												text: string
												style?: 'cancel' | 'destructive'
												onPress?: () => void
											}[] = SET_TYPES.map((type) => ({
												text: SET_TYPE_LABELS[type as SetType],
												onPress: () => {
													void workouts
														.updateSetValues(setId, {
															setType: type as SetType,
														})
														.then(load)
												},
											}))
											buttons.push({ text: 'Отмена', style: 'cancel' })
											Alert.alert('Тип подхода', undefined, buttons)
										}}
									/>
								))}
							</View>

							<Pressable
								onPress={() => {
									void workouts.addSet(item.workoutExercise.id).then(load)
								}}
								style={styles.addSet}
							>
								<AppText style={{ color: palette.primary }}>
									+ Подход
								</AppText>
							</Pressable>

							<View style={styles.exerciseActions}>
								<Pressable
									onPress={() =>
										router.push({
											pathname: '/workout/add-exercise/[workoutId]',
											params: {
												workoutId: detail.workout.id,
												replaceWorkoutExerciseId:
													item.workoutExercise.id,
											},
										})
									}
								>
									<AppText
										variant="caption"
										style={{ color: palette.primary }}
									>
										Заменить упражнение
									</AppText>
								</Pressable>
								<Pressable
									onPress={() => {
										const completed = item.sets.some(
											(set) => set.completedAt,
										)
										Alert.alert(
											'Убрать упражнение?',
											completed
												? 'Есть выполненные подходы. Удаление необратимо.'
												: 'Упражнение будет убрано из этой тренировки.',
											[
												{ text: 'Отмена', style: 'cancel' },
												{
													text: 'Убрать',
													style: 'destructive',
													onPress: () => {
														void workouts
															.removeExerciseFromWorkout(
																item.workoutExercise.id,
																{ force: completed },
															)
															.then(load)
															.catch((err: unknown) => {
																showError(
																	err instanceof Error
																		? err.message
																		: 'Ошибка',
																)
															})
													},
												},
											],
										)
									}}
								>
									<AppText
										variant="caption"
										style={{ color: palette.danger }}
									>
										Убрать упражнение
									</AppText>
								</Pressable>
							</View>
						</View>
					)}
				/>

				<View style={styles.footer}>
					<Pressable
						onPress={() =>
							router.push(`/workout/add-exercise/${detail.workout.id}`)
						}
						style={[styles.secondaryBtn, { borderColor: palette.border }]}
					>
						<AppText>+ Упражнение</AppText>
					</Pressable>
					<Pressable
						onPress={() => {
							Alert.alert(
								'Завершить тренировку?',
								'Незаполненные подходы не будут сохранены как выполненные.',
								[
									{ text: 'Отмена', style: 'cancel' },
									{
										text: 'Завершить',
										onPress: () => {
											void workouts
												.finishWorkout(detail.workout.id)
												.then(() => {
													router.replace(
														`/workout/summary/${detail.workout.id}`,
													)
												})
												.catch((err: unknown) => {
													showError(
														err instanceof Error
															? err.message
															: 'Ошибка',
													)
												})
										},
									},
								],
							)
						}}
						style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
					>
						<AppText
							variant="subtitle"
							style={{ color: palette.onPrimary }}
						>
							Завершить
						</AppText>
					</Pressable>
				</View>

				<Pressable
					onPress={() => {
						Alert.alert(
							'Отменить тренировку?',
							'Текущая тренировка и записанные подходы будут удалены.',
							[
								{ text: 'Продолжить тренировку', style: 'cancel' },
								{
									text: 'Отменить тренировку',
									style: 'destructive',
									onPress: () => {
										void workouts
											.discardWorkout(detail.workout.id)
											.then(() => router.replace('/'))
									},
								},
							],
						)
					}}
					style={styles.discard}
				>
					<AppText variant="caption" style={{ color: palette.danger }}>
						Отменить тренировку
					</AppText>
				</Pressable>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

/**
 * Isolated header: elapsed timer ticks without re-rendering exercise rows.
 */
function WorkoutHeader ({
	name,
	startedAt,
	completedCount,
	error,
}: {
	name: string
	startedAt: string
	completedCount: number
	error: string | null
}) {
	const palette = useThemeColors()
	const [now, setNow] = useState(0)

	useEffect(() => {
		const tick = () => setNow(Date.now())
		tick()
		const timer = setInterval(tick, 1000)
		return () => clearInterval(timer)
	}, [])

	return (
		<View style={styles.header}>
			<AppText variant="title" numberOfLines={2}>
				{name}
			</AppText>
			<AppText muted>
				{formatElapsed(startedAt, now)}
				{' • '}
				{formatSetCount(completedCount)}
			</AppText>
			{error ? (
				<AppText variant="caption" style={{ color: palette.danger }}>
					{error}
				</AppText>
			) : null}
		</View>
	)
}

function SmallButton ({
	label,
	onPress,
	disabled,
	accessibilityLabel,
}: {
	label: string
	onPress: () => void
	disabled?: boolean
	accessibilityLabel: string
}) {
	const palette = useThemeColors()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled: Boolean(disabled) }}
			disabled={disabled}
			onPress={onPress}
			style={[
				styles.smallBtn,
				{
					borderColor: palette.border,
					opacity: disabled ? 0.35 : 1,
				},
			]}
		>
			<AppText>{label}</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	flex: { flex: 1 },
	header: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		gap: spacing.xs,
	},
	list: {
		padding: spacing.lg,
		gap: spacing.md,
		paddingBottom: spacing.xxl,
	},
	block: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	blockHeader: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	blockTitle: {
		flex: 1,
		gap: 2,
	},
	blockActions: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	smallBtn: {
		minWidth: 40,
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	note: {
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.sm,
		paddingHorizontal: spacing.sm,
		...typography.caption,
	},
	sets: {
		gap: spacing.xs,
	},
	addSet: {
		minHeight: 40,
		justifyContent: 'center',
	},
	exerciseActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: spacing.md,
		paddingTop: spacing.xs,
	},
	footer: {
		flexDirection: 'row',
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
	},
	secondaryBtn: {
		flex: 1,
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryBtn: {
		flex: 1,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	discard: {
		alignItems: 'center',
		paddingBottom: spacing.md,
		minHeight: 40,
		justifyContent: 'center',
	},
})
