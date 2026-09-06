/**
 * Edit planned sets / reps / rest for one template exercise.
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { Exercise, TemplateExercise } from '@/src/domain/types'
import { REST_PRESETS, SET_PRESETS } from '@/src/features/templates/defaults'
import { validateTemplateExercisePlan } from '@/src/features/templates/form-validation'
import { usesRepTargets } from '@/src/features/templates/summary'
import {
	useExerciseRepository,
	useTemplateRepository,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function EditTemplateExerciseScreen () {
	const { templateExerciseId } = useLocalSearchParams<{
		templateExerciseId: string
	}>()
	const palette = useThemeColors()
	const router = useRouter()
	const templates = useTemplateRepository()
	const exercisesRepo = useExerciseRepository()

	const [row, setRow] = useState<TemplateExercise | null>(null)
	const [exercise, setExercise] = useState<Exercise | null>(null)
	const [plannedSets, setPlannedSets] = useState(3)
	const [customSets, setCustomSets] = useState('')
	const [repsMin, setRepsMin] = useState('8')
	const [repsMax, setRepsMax] = useState('12')
	const [restSeconds, setRestSeconds] = useState(90)
	const [customRest, setCustomRest] = useState('')
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		void (async () => {
			if (!templateExerciseId) {
				return
			}
			const found = await templates.getTemplateExerciseById(
				templateExerciseId,
			)
			if (!found) {
				return
			}
			setRow(found)
			const ex = await exercisesRepo.getById(found.exerciseId)
			setExercise(ex)
			setPlannedSets(found.plannedSets ?? 3)
			setRepsMin(String(found.targetRepsMin ?? 8))
			setRepsMax(String(found.targetRepsMax ?? 12))
			setRestSeconds(found.restSeconds ?? ex?.defaultRestSeconds ?? 90)
		})()
	}, [exercisesRepo, templateExerciseId, templates])

	const showReps = exercise ? usesRepTargets(exercise.trackingType) : true

	const handleSave = async () => {
		if (!row || !exercise) {
			return
		}

		const setsValue =
			customSets.trim().length > 0
				? Number(customSets.trim())
				: plannedSets
		const restValue =
			customRest.trim().length > 0
				? Number(customRest.trim().replace(',', '.'))
				: restSeconds

		const min = showReps ? Number(repsMin) : null
		const max = showReps ? Number(repsMax) : null

		const validation = validateTemplateExercisePlan({
			plannedSets: setsValue,
			targetRepsMin: min,
			targetRepsMax: max,
			restSeconds: restValue,
			usesReps: showReps,
		})

		if (!validation.ok) {
			setError(
				validation.errors.plannedSets ??
					validation.errors.reps ??
					validation.errors.restSeconds ??
					'Проверьте значения',
			)
			return
		}

		setError(null)
		try {
			await templates.updateExercise(row.id, {
				plannedSets: setsValue,
				targetRepsMin: showReps ? min : null,
				targetRepsMax: showReps ? max : null,
				restSeconds: restValue,
			})
			router.back()
		} catch (err) {
			Alert.alert(
				'Не удалось сохранить',
				err instanceof Error ? err.message : 'Попробуйте ещё раз',
			)
		}
	}

	if (!row || !exercise) {
		return (
			<View style={{ padding: spacing.lg }}>
				<AppText muted>Загрузка…</AppText>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				<AppText variant="title">{exercise.name}</AppText>
				{exercise.archivedAt ? (
					<AppText style={{ color: palette.danger }}>
						Упражнение в архиве — можно убрать или заменить в редакторе.
					</AppText>
				) : null}

				<AppText variant="label" muted>
					План подходов
				</AppText>
				<View style={styles.chips}>
					{SET_PRESETS.map((value) => (
						<Chip
							key={value}
							label={String(value)}
							selected={customSets.length === 0 && plannedSets === value}
							onPress={() => {
								setPlannedSets(value)
								setCustomSets('')
							}}
						/>
					))}
					<Chip
						label="Своё"
						selected={customSets.length > 0}
						onPress={() => setCustomSets(String(plannedSets))}
					/>
				</View>
				{customSets.length > 0 ? (
					<TextInput
						value={customSets}
						onChangeText={setCustomSets}
						keyboardType="number-pad"
						style={[
							styles.input,
							{
								color: palette.text,
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
					/>
				) : null}

				{showReps ? (
					<>
						<AppText variant="label" muted>
							Повторения
						</AppText>
						<View style={styles.repsRow}>
							<TextInput
								value={repsMin}
								onChangeText={setRepsMin}
								keyboardType="number-pad"
								style={[
									styles.input,
									styles.repsInput,
									{
										color: palette.text,
										borderColor: palette.border,
										backgroundColor: palette.surface,
									},
								]}
							/>
							<AppText muted>—</AppText>
							<TextInput
								value={repsMax}
								onChangeText={setRepsMax}
								keyboardType="number-pad"
								style={[
									styles.input,
									styles.repsInput,
									{
										color: palette.text,
										borderColor: palette.border,
										backgroundColor: palette.surface,
									},
								]}
							/>
						</View>
					</>
				) : (
					<AppText muted>
						Для этого упражнения повторения не планируются.
					</AppText>
				)}

				<AppText variant="label" muted>
					Отдых
				</AppText>
				<View style={styles.chips}>
					{REST_PRESETS.map((value) => (
						<Chip
							key={value}
							label={value < 60 ? `${value} сек` : `${value / 60} мин`}
							selected={customRest.length === 0 && restSeconds === value}
							onPress={() => {
								setRestSeconds(value)
								setCustomRest('')
							}}
						/>
					))}
					<Chip
						label="Своё"
						selected={customRest.length > 0}
						onPress={() => setCustomRest(String(restSeconds))}
					/>
				</View>
				{customRest.length > 0 ? (
					<TextInput
						value={customRest}
						onChangeText={setCustomRest}
						keyboardType="number-pad"
						placeholder="Секунды"
						placeholderTextColor={palette.textMuted}
						style={[
							styles.input,
							{
								color: palette.text,
								borderColor: palette.border,
								backgroundColor: palette.surface,
							},
						]}
					/>
				) : null}

				{error ? (
					<AppText variant="caption" style={{ color: palette.danger }}>
						{error}
					</AppText>
				) : null}

				<Pressable
					accessibilityRole="button"
					onPress={() => {
						void handleSave()
					}}
					style={({ pressed }) => [
						styles.save,
						{
							backgroundColor: palette.primary,
							opacity: pressed ? 0.88 : 1,
						},
					]}
				>
					<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
						Сохранить
					</AppText>
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

function Chip ({
	label,
	selected,
	onPress,
}: {
	label: string
	selected: boolean
	onPress: () => void
}) {
	const palette = useThemeColors()
	return (
		<Pressable
			onPress={onPress}
			style={[
				styles.chip,
				{
					backgroundColor: selected
						? palette.primaryMuted
						: palette.surfaceElevated,
					borderColor: selected ? palette.primary : palette.border,
				},
			]}
		>
			<AppText
				variant="caption"
				style={{ color: selected ? palette.primary : palette.text }}
			>
				{label}
			</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	content: {
		padding: spacing.lg,
		gap: spacing.sm,
		paddingBottom: spacing.xxl,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minHeight: 40,
		paddingHorizontal: spacing.sm,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	input: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	repsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	repsInput: {
		flex: 1,
	},
	save: {
		marginTop: spacing.lg,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
