/**
 * Template detail / summary with Start workout action.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import { ActiveWorkoutExistsError } from '@/src/db'
import type { Exercise, TemplateExercise, WorkoutTemplate } from '@/src/domain/types'
import {
	formatDetailExerciseLine,
	formatTemplateSummary,
	usesRepTargets,
} from '@/src/features/templates/summary'
import {
	useExerciseRepository,
	useTemplateRepository,
	useWorkoutService,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Row = {
	item: TemplateExercise
	exercise: Exercise | null
}

export default function TemplateDetailScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const templates = useTemplateRepository()
	const exercisesRepo = useExerciseRepository()
	const workouts = useWorkoutService()
	const [template, setTemplate] = useState<WorkoutTemplate | null>(null)
	const [rows, setRows] = useState<Row[]>([])

	const load = useCallback(async () => {
		if (!id) {
			return
		}
		const detail = await templates.getDetail(id)
		if (!detail) {
			setTemplate(null)
			setRows([])
			return
		}
		setTemplate(detail.template)
		const hydrated = await Promise.all(
			detail.exercises.map(async (item) => ({
				item,
				exercise: await exercisesRepo.getById(item.exerciseId),
			})),
		)
		setRows(hydrated)
	}, [exercisesRepo, id, templates])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleDuplicate = () => {
		if (!template) {
			return
		}
		void (async () => {
			try {
				const copy = await templates.duplicate(template.id)
				router.replace(`/templates/${copy.id}`)
			} catch {
				Alert.alert('Не удалось дублировать', 'Попробуйте ещё раз.')
			}
		})()
	}

	const handleArchive = () => {
		if (!template) {
			return
		}
		Alert.alert(
			'Архивировать тренировку?',
			'Она исчезнет с экрана «Сегодня», но останется в архиве.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'В архив',
					style: 'destructive',
					onPress: () => {
						void (async () => {
							try {
								await templates.archive(template.id)
								router.replace('/')
							} catch {
								Alert.alert('Не удалось архивировать', 'Попробуйте ещё раз.')
							}
						})()
					},
				},
			],
		)
	}

	const handleStart = () => {
		if (!template) {
			return
		}
		if (rows.length === 0) {
			Alert.alert(
				'Добавьте упражнения',
				'Сначала соберите шаблон в редакторе.',
			)
			return
		}
		void (async () => {
			try {
				const detail = await workouts.startFromTemplate(template.id)
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
										.then(() =>
											workouts.startFromTemplate(template.id),
										)
										.then((detail) =>
											router.push(`/workout/${detail.workout.id}`),
										)
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
		})()
	}

	if (!template) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	return (
		<Screen>
			<AppText variant="title">{template.name}</AppText>
			{template.description ? (
				<AppText muted>{template.description}</AppText>
			) : null}
			<AppText variant="subtitle">
				{formatTemplateSummary(rows.map((row) => row.item))}
			</AppText>

			<SurfaceCard>
				{rows.length === 0 ? (
					<AppText muted>
						Упражнения ещё не добавлены. Откройте редактор, чтобы собрать
						тренировку.
					</AppText>
				) : (
					rows.map((row, index) => {
						const trackingType =
							row.exercise?.trackingType ?? 'weight_reps'
						return (
							<AppText key={row.item.id}>
								{formatDetailExerciseLine({
									index: index + 1,
									name: row.exercise?.name ?? 'Упражнение',
									plannedSets: row.item.plannedSets,
									targetRepsMin: usesRepTargets(trackingType)
										? row.item.targetRepsMin
										: null,
									targetRepsMax: usesRepTargets(trackingType)
										? row.item.targetRepsMax
										: null,
									trackingType,
								})}
								{row.exercise?.archivedAt
									? ' (в архиве)'
									: ''}
							</AppText>
						)
					})
				)}
			</SurfaceCard>

			<Pressable
				accessibilityRole="button"
				onPress={handleStart}
				style={({ pressed }) => [
					styles.primary,
					{
						backgroundColor: palette.primary,
						opacity: pressed ? 0.88 : 1,
					},
				]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					Начать
				</AppText>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				onPress={() => router.push(`/templates/edit/${template.id}`)}
				style={[styles.secondaryFull, { borderColor: palette.border }]}
			>
				<AppText>Редактировать</AppText>
			</Pressable>

			<View style={styles.rowActions}>
				<Pressable
					accessibilityRole="button"
					onPress={handleDuplicate}
					style={[styles.secondary, { borderColor: palette.border }]}
				>
					<AppText>Дублировать</AppText>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					onPress={handleArchive}
					style={[styles.secondary, { borderColor: palette.danger }]}
				>
					<AppText style={{ color: palette.danger }}>Архивировать</AppText>
				</Pressable>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	primary: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryFull: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowActions: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	secondary: {
		flex: 1,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
