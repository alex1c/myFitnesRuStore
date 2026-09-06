/**
 * Edit a completed historical set (preserves completed_at).
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
	Alert,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import type { SetType, TrackingType, WorkoutSet } from '@/src/domain/types'
import { SET_TYPES } from '@/src/domain/constants'
import { SET_TYPE_LABELS, weightFieldLabel } from '@/src/features/workout/labels'
import { formatWeight } from '@/src/features/workout/set-logic'
import { parseDecimalInput } from '@/src/utils/parse-decimal'
import { useWorkoutService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function EditHistorySetScreen () {
	const { setId } = useLocalSearchParams<{ setId: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const workouts = useWorkoutService()

	const [set, setSet] = useState<WorkoutSet | null>(null)
	const [tracking, setTracking] = useState<TrackingType>('weight_reps')
	const [exerciseName, setExerciseName] = useState('Подход')
	const [weightText, setWeightText] = useState('')
	const [repsText, setRepsText] = useState('')
	const [durationText, setDurationText] = useState('')
	const [distanceText, setDistanceText] = useState('')
	const [setType, setSetType] = useState<SetType>('working')
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		void (async () => {
			if (!setId) {
				return
			}
			const row = await workouts.workouts.getSetById(setId)
			if (!row) {
				Alert.alert('Подход не найден')
				router.back()
				return
			}
			const we = await workouts.workouts.getWorkoutExerciseById(
				row.workoutExerciseId,
			)
			const exercise = we
				? await workouts.exercises.getById(we.exerciseId)
				: null
			setSet(row)
			setTracking(exercise?.trackingType ?? 'weight_reps')
			setExerciseName(exercise?.name ?? 'Подход')
			setWeightText(row.weight === null ? '' : formatWeight(row.weight))
			setRepsText(row.reps === null ? '' : String(row.reps))
			setDurationText(
				row.durationSeconds === null ? '' : String(row.durationSeconds),
			)
			setDistanceText(
				row.distance === null ? '' : formatWeight(row.distance),
			)
			setSetType(row.setType)
		})()
	}, [router, setId, workouts])

	const fields = useMemo(() => {
		const showWeight =
			tracking === 'weight_reps'
			|| tracking === 'assisted_reps'
			|| tracking === 'bodyweight_reps'
		const showReps =
			tracking === 'weight_reps'
			|| tracking === 'bodyweight_reps'
			|| tracking === 'assisted_reps'
		const showDuration =
			tracking === 'duration' || tracking === 'distance_duration'
		const showDistance = tracking === 'distance_duration'
		return { showWeight, showReps, showDuration, showDistance }
	}, [tracking])

	const handleSave = async () => {
		if (!set || busy) {
			return
		}
		setBusy(true)
		try {
			let weight: number | null = null
			if (weightText.trim()) {
				const parsed = parseDecimalInput(weightText)
				if (!parsed.ok) {
					throw new Error('Некорректный вес')
				}
				weight = parsed.value
			}

			let reps: number | null = null
			if (repsText.trim()) {
				const value = Number(repsText.trim())
				if (!Number.isInteger(value)) {
					throw new Error('Некорректные повторения')
				}
				reps = value
			}

			let durationSeconds: number | null = null
			if (durationText.trim()) {
				const value = Number(durationText.trim())
				if (!Number.isFinite(value)) {
					throw new Error('Некорректная длительность')
				}
				durationSeconds = value
			}

			let distance: number | null = null
			if (distanceText.trim()) {
				const parsed = parseDecimalInput(distanceText)
				if (!parsed.ok) {
					throw new Error('Некорректное расстояние')
				}
				distance = parsed.value
			}

			await workouts.updateCompletedSet(set.id, {
				weight: fields.showWeight ? weight : null,
				reps: fields.showReps ? reps : null,
				durationSeconds: fields.showDuration ? durationSeconds : null,
				distance: fields.showDistance ? distance : null,
				setType,
			})
			router.back()
		} catch (error) {
			Alert.alert(
				'Не удалось сохранить',
				error instanceof Error ? error.message : 'Попробуйте ещё раз',
			)
		} finally {
			setBusy(false)
		}
	}

	if (!set) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	return (
		<Screen>
			<AppText variant="title">{exerciseName}</AppText>
			<AppText muted>Исправление выполненного подхода</AppText>

			{fields.showWeight ? (
				<Field
					label={weightFieldLabel(tracking)}
					value={weightText}
					onChangeText={setWeightText}
					keyboardType="decimal-pad"
				/>
			) : null}
			{fields.showReps ? (
				<Field
					label="Повторения"
					value={repsText}
					onChangeText={setRepsText}
					keyboardType="number-pad"
				/>
			) : null}
			{fields.showDuration ? (
				<Field
					label="Секунды"
					value={durationText}
					onChangeText={setDurationText}
					keyboardType="number-pad"
				/>
			) : null}
			{fields.showDistance ? (
				<Field
					label="Расстояние, км"
					value={distanceText}
					onChangeText={setDistanceText}
					keyboardType="decimal-pad"
				/>
			) : null}

			<AppText variant="caption" muted>
				Тип подхода
			</AppText>
			<View style={styles.types}>
				{SET_TYPES.map((type) => (
					<Pressable
						key={type}
						onPress={() => setSetType(type)}
						style={[
							styles.typeChip,
							{
								borderColor:
									setType === type
										? palette.primary
										: palette.border,
								backgroundColor:
									setType === type
										? palette.primaryMuted
										: palette.surface,
							},
						]}
					>
						<AppText variant="caption">
							{SET_TYPE_LABELS[type]}
						</AppText>
					</Pressable>
				))}
			</View>

			<Pressable
				onPress={() => {
					void handleSave()
				}}
				disabled={busy}
				style={[styles.save, { backgroundColor: palette.primary }]}
			>
				<AppText
					variant="subtitle"
					style={{ color: palette.onPrimary }}
				>
					Сохранить
				</AppText>
			</Pressable>
		</Screen>
	)
}

function Field ({
	label,
	value,
	onChangeText,
	keyboardType,
}: {
	label: string
	value: string
	onChangeText: (text: string) => void
	keyboardType: 'decimal-pad' | 'number-pad'
}) {
	const palette = useThemeColors()
	return (
		<View style={styles.field}>
			<AppText variant="caption" muted>
				{label}
			</AppText>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				keyboardType={keyboardType}
				style={[
					styles.input,
					{
						color: palette.text,
						borderColor: palette.border,
						backgroundColor: palette.surface,
					},
				]}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	field: {
		gap: spacing.xs,
	},
	input: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	types: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	typeChip: {
		minHeight: 36,
		paddingHorizontal: spacing.sm,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	save: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.md,
	},
})
