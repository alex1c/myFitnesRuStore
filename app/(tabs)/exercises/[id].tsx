/**
 * Exercise detail — catalog info + personal settings, no fake stats.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import type { Exercise } from '@/src/domain/types'
import {
	equipmentLabel,
	formatRestLabel,
	muscleGroupLabel,
	trackingTypeLabel,
	usesWeightStep,
} from '@/src/features/exercises/labels'
import { useExerciseRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function ExerciseDetailScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const exercises = useExerciseRepository()
	const [exercise, setExercise] = useState<Exercise | null>(null)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		if (!id) {
			setError('Упражнение не найдено')
			return
		}
		const row = await exercises.getById(id)
		if (!row) {
			setError('Упражнение не найдено')
			setExercise(null)
			return
		}
		setError(null)
		setExercise(row)
	}, [exercises, id])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleArchive = () => {
		if (!exercise) {
			return
		}
		Alert.alert(
			'Архивировать упражнение?',
			'Оно исчезнет из списка, но останется в архиве.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'В архив',
					style: 'destructive',
					onPress: () => {
						void (async () => {
							try {
								await exercises.archive(exercise.id)
								router.replace('/exercises')
							} catch {
								Alert.alert(
									'Не удалось архивировать',
									'Попробуйте ещё раз.',
								)
							}
						})()
					},
				},
			],
		)
	}

	if (error) {
		return (
			<Screen>
				<AppText variant="title">{error}</AppText>
			</Screen>
		)
	}

	if (!exercise) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	return (
		<Screen>
			<View style={styles.titleBlock}>
				<AppText variant="title">{exercise.name}</AppText>
				{exercise.isCustom ? (
					<View
						style={[
							styles.badge,
							{ backgroundColor: palette.primaryMuted },
						]}
					>
						<AppText variant="label" style={{ color: palette.primary }}>
							Моё
						</AppText>
					</View>
				) : null}
			</View>

			<SurfaceCard>
				<DetailLine label="Группа" value={muscleGroupLabel(exercise.muscleGroup)} />
				<DetailLine
					label="Оборудование"
					value={equipmentLabel(exercise.equipment)}
				/>
				<DetailLine
					label="Тип учёта"
					value={trackingTypeLabel(exercise.trackingType)}
				/>
				<DetailLine
					label="Стандартный отдых"
					value={formatRestLabel(exercise.defaultRestSeconds)}
				/>
				{usesWeightStep(exercise.trackingType) ? (
					<DetailLine
						label="Шаг веса"
						value={
							exercise.weightStep === null
								? 'Не задан'
								: String(exercise.weightStep).replace('.', ',')
						}
					/>
				) : null}
				{exercise.notes ? (
					<DetailLine label="Заметка" value={exercise.notes} />
				) : null}
			</SurfaceCard>

			<Pressable
				accessibilityRole="button"
				onPress={() => router.push(`/exercises/edit/${exercise.id}`)}
				style={({ pressed }) => [
					styles.primaryButton,
					{
						backgroundColor: palette.primary,
						opacity: pressed ? 0.88 : 1,
					},
				]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					{exercise.isCustom ? 'Изменить' : 'Настроить для себя'}
				</AppText>
			</Pressable>

			{exercise.isCustom ? (
				<Pressable
					accessibilityRole="button"
					onPress={handleArchive}
					style={({ pressed }) => [
						styles.secondaryButton,
						{
							borderColor: palette.danger,
							opacity: pressed ? 0.85 : 1,
						},
					]}
				>
					<AppText style={{ color: palette.danger }}>
						Архивировать
					</AppText>
				</Pressable>
			) : null}
		</Screen>
	)
}

function DetailLine ({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.line}>
			<AppText variant="caption" muted>
				{label}
			</AppText>
			<AppText>{value}</AppText>
		</View>
	)
}

const styles = StyleSheet.create({
	titleBlock: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flexWrap: 'wrap',
	},
	badge: {
		paddingHorizontal: spacing.xs,
		paddingVertical: 2,
		borderRadius: radius.sm,
	},
	line: {
		gap: 2,
	},
	primaryButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
