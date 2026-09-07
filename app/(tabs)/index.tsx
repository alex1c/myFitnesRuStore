/**
 * Сегодня — active workout resume + templates + quick start.
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { AppBannerSlot } from '@/src/features/ads/app-banner-slot'
import type { TemplateExercise, Workout, WorkoutTemplate } from '@/src/domain/types'
import { ActiveWorkoutExistsError, PreferencesService } from '@/src/db'
import { shouldShowOnboardingHelpCard } from '@/src/features/help/onboarding-visibility'
import { TemplateListCard } from '@/src/features/templates/components/template-list-card'
import { formatSetCount } from '@/src/features/templates/summary'
import {
	formatActiveWorkoutDuration,
} from '@/src/features/workout/set-logic'
import {
	useDatabase,
	useTemplateRepository,
	useWorkoutService,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type TemplateCardData = {
	template: WorkoutTemplate
	exercises: TemplateExercise[]
}

export default function TodayScreen () {
	const palette = useThemeColors()
	const router = useRouter()
	const { db } = useDatabase()
	const templates = useTemplateRepository()
	const workouts = useWorkoutService()
	const [cards, setCards] = useState<TemplateCardData[]>([])
	const [active, setActive] = useState<Workout | null>(null)
	const [activeCompletedSets, setActiveCompletedSets] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [showHelpCard, setShowHelpCard] = useState(false)

	const load = useCallback(async () => {
		setIsLoading(true)
		try {
			const activeWorkout = await workouts.workouts.getActiveWorkout()
			setActive(activeWorkout)
			if (activeWorkout) {
				const count =
					await workouts.workouts.countCompletedSetsInWorkout(
						activeWorkout.id,
					)
				setActiveCompletedSets(count)
			} else {
				setActiveCompletedSets(0)
			}
			const list = await templates.list()
			const withExercises = await Promise.all(
				list.map(async (template) => ({
					template,
					exercises: await templates.listExercises(template.id),
				})),
			)
			setCards(withExercises)

			const prefs = new PreferencesService(db)
			const [dismissed, finishedWorkoutCount] = await Promise.all([
				prefs.isOnboardingHelpDismissed(),
				workouts.progress.countFinishedWorkouts(null),
			])
			setShowHelpCard(
				shouldShowOnboardingHelpCard({
					dismissed,
					hasActiveWorkout: activeWorkout !== null,
					finishedWorkoutCount,
				}),
			)
		} finally {
			setIsLoading(false)
		}
	}, [db, templates, workouts])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleDismissHelp = useCallback(async () => {
		const prefs = new PreferencesService(db)
		await prefs.setOnboardingHelpDismissed(true)
		setShowHelpCard(false)
	}, [db])

	const startWithGuard = async (action: () => Promise<{ workout: { id: string } }>) => {
		try {
			const detail = await action()
			router.push(`/workout/${detail.workout.id}`)
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
									.then(() => action())
									.then((detail) =>
										router.push(`/workout/${detail.workout.id}`),
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
				'Не удалось начать',
				error instanceof Error ? error.message : 'Попробуйте ещё раз',
			)
		}
	}

	return (
		<Screen>
			<AppText variant="title">Сегодня</AppText>

			{isLoading ? (
				<AppText muted>Загрузка…</AppText>
			) : (
				<>
					{showHelpCard ? (
						<View
							style={[
								styles.helpCard,
								{
									backgroundColor: palette.surface,
									borderColor: palette.border,
								},
							]}
						>
							<AppText variant="subtitle">Первый раз здесь?</AppText>
							<AppText muted>
								Покажем, как провести первую тренировку.
							</AppText>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Как пользоваться"
								onPress={() => router.push('/help/how-to-use')}
								style={[
									styles.primaryButton,
									{ backgroundColor: palette.primary },
								]}
							>
								<AppText
									variant="subtitle"
									style={{ color: palette.onPrimary }}
								>
									Как пользоваться
								</AppText>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Скрыть подсказку"
								onPress={() => {
									void handleDismissHelp()
								}}
								style={styles.dismissLink}
							>
								<AppText
									variant="caption"
									style={{ color: palette.primary }}
								>
									Скрыть
								</AppText>
							</Pressable>
						</View>
					) : null}

					{active ? (
						<View
							style={[
								styles.activeCard,
								{
									backgroundColor: palette.primaryMuted,
									borderColor: palette.primary,
								},
							]}
						>
							<AppText variant="caption" muted>
								Текущая тренировка
							</AppText>
							<AppText variant="title" numberOfLines={2}>
								{active.name}
							</AppText>
							<AppText muted>
								{formatActiveWorkoutDuration(active.startedAt)}
								{' • '}
								{formatSetCount(activeCompletedSets)}
							</AppText>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Продолжить тренировку"
								onPress={() => router.push(`/workout/${active.id}`)}
								style={[
									styles.primaryButton,
									{ backgroundColor: palette.primary },
								]}
							>
								<AppText
									variant="subtitle"
									style={{ color: palette.onPrimary }}
								>
									Продолжить
								</AppText>
							</Pressable>
						</View>
					) : null}

					{cards.length === 0 && !active ? (
						<View
							style={[
								styles.empty,
								{
									backgroundColor: palette.surface,
									borderColor: palette.border,
								},
							]}
						>
							<AppText variant="title">Создайте первую тренировку</AppText>
							<AppText muted>
								Добавьте упражнения и сохраните удобный шаблон для зала.
							</AppText>
							<Pressable
								onPress={() => router.push('/templates/new')}
								style={[
									styles.primaryButton,
									{ backgroundColor: palette.primary },
								]}
							>
								<AppText
									variant="subtitle"
									style={{ color: palette.onPrimary }}
								>
									Создать тренировку
								</AppText>
							</Pressable>
						</View>
					) : (
						<>
							{cards.length > 0 ? (
								<>
									<AppText variant="subtitle">Мои тренировки</AppText>
									<View style={styles.list}>
										{cards.map(({ template, exercises }) => (
											<View key={template.id} style={styles.cardWrap}>
												<TemplateListCard
													template={template}
													exercises={exercises}
													onPress={() =>
														router.push(`/templates/${template.id}`)
													}
												/>
												<Pressable
													onPress={() => {
														void startWithGuard(() =>
															workouts.startFromTemplate(template.id),
														)
													}}
													style={[
														styles.startBtn,
														{ backgroundColor: palette.primary },
													]}
												>
													<AppText
														style={{ color: palette.onPrimary }}
													>
														Начать
													</AppText>
												</Pressable>
											</View>
										))}
									</View>
								</>
							) : null}

							<Pressable
								onPress={() => router.push('/templates/new')}
								style={[
									styles.secondaryButton,
									{ borderColor: palette.border },
								]}
							>
								<AppText>+ Новая тренировка</AppText>
							</Pressable>
						</>
					)}

					<Pressable
						onPress={() => {
							void startWithGuard(() => workouts.startQuickWorkout())
						}}
						style={[
							styles.secondaryButton,
							{ borderColor: palette.primary },
						]}
					>
						<AppText style={{ color: palette.primary }}>
							Быстрая тренировка
						</AppText>
					</Pressable>

					<Pressable
						onPress={() => router.push('/templates/archive')}
						style={styles.archiveLink}
					>
						<AppText variant="caption" style={{ color: palette.primary }}>
							Архив тренировок
						</AppText>
					</Pressable>

					{/* Suppress while loading or active workout — keep logging UX clean. */}
					<AppBannerSlot suppress={isLoading || !!active} />
				</>
			)}
		</Screen>
	)
}

const styles = StyleSheet.create({
	helpCard: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	dismissLink: {
		alignSelf: 'flex-start',
		minHeight: 40,
		justifyContent: 'center',
	},
	activeCard: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	empty: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	list: {
		gap: spacing.sm,
	},
	cardWrap: {
		gap: spacing.xs,
	},
	startBtn: {
		minHeight: 44,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	secondaryButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
	archiveLink: {
		alignSelf: 'flex-start',
		minHeight: 40,
		justifyContent: 'center',
	},
})
