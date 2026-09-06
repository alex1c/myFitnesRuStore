/**
 * Compact editable set row for the active workout screen.
 */
import React, { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { Exercise, WorkoutSet } from '@/src/domain/types'
import {
	formatWeight,
	previousSetLabel,
} from '@/src/features/workout/set-logic'
import {
	SET_TYPE_SHORT,
	weightFieldLabel,
} from '@/src/features/workout/labels'
import { parseDecimalInput } from '@/src/utils/parse-decimal'
import { radius, spacing, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	index: number
	set: WorkoutSet
	previous: WorkoutSet | undefined
	exercise: Exercise | null
	onComplete: (setId: string, values: {
		weight: number | null
		reps: number | null
		durationSeconds: number | null
		distance: number | null
	}) => Promise<void>
	onUncomplete: (setId: string) => Promise<void>
	onSaveDraft: (setId: string, values: {
		weight: number | null
		reps: number | null
		durationSeconds: number | null
		distance: number | null
	}) => Promise<void>
	onChangeType: (setId: string) => void
}

export function WorkoutSetRow ({
	index,
	set,
	previous,
	exercise,
	onComplete,
	onUncomplete,
	onSaveDraft,
	onChangeType,
}: Props) {
	const palette = useThemeColors()
	const tracking = exercise?.trackingType ?? 'weight_reps'
	const step = exercise?.weightStep && exercise.weightStep > 0
		? exercise.weightStep
		: 2.5

	const [weightText, setWeightText] = useState(
		set.weight === null ? '' : formatWeight(set.weight),
	)
	const [repsText, setRepsText] = useState(
		set.reps === null ? '' : String(set.reps),
	)
	const [durationText, setDurationText] = useState(
		set.durationSeconds === null ? '' : String(set.durationSeconds),
	)
	const [distanceText, setDistanceText] = useState(
		set.distance === null ? '' : formatWeight(set.distance),
	)
	const [busy, setBusy] = useState(false)
	// Sync draft fields when the persisted set row changes (reload / autofill).
	const [syncedSet, setSyncedSet] = useState(set)
	if (
		set.id !== syncedSet.id
		|| set.weight !== syncedSet.weight
		|| set.reps !== syncedSet.reps
		|| set.durationSeconds !== syncedSet.durationSeconds
		|| set.distance !== syncedSet.distance
	) {
		setSyncedSet(set)
		setWeightText(set.weight === null ? '' : formatWeight(set.weight))
		setRepsText(set.reps === null ? '' : String(set.reps))
		setDurationText(
			set.durationSeconds === null ? '' : String(set.durationSeconds),
		)
		setDistanceText(
			set.distance === null ? '' : formatWeight(set.distance),
		)
	}

	const parseValues = () => {
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

		return { weight, reps, durationSeconds, distance }
	}

	const showWeight =
		tracking === 'weight_reps' ||
		tracking === 'assisted_reps' ||
		tracking === 'bodyweight_reps'
	const showReps =
		tracking === 'weight_reps' ||
		tracking === 'bodyweight_reps' ||
		tracking === 'assisted_reps'
	const showDuration =
		tracking === 'duration' || tracking === 'distance_duration'
	const showDistance = tracking === 'distance_duration'

	const adjustWeight = (delta: number) => {
		const current =
			weightText.trim().length === 0
				? 0
				: parseDecimalInput(weightText).ok
					? (parseDecimalInput(weightText) as { ok: true; value: number }).value
					: 0
		const next = Math.max(0, Math.round((current + delta) * 100) / 100)
		setWeightText(formatWeight(next))
	}

	const adjustReps = (delta: number) => {
		const current = repsText.trim() ? Number(repsText) : 0
		const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta)
		setRepsText(String(next))
	}

	const handleComplete = async () => {
		if (busy) {
			return
		}
		setBusy(true)
		try {
			if (set.completedAt) {
				await onUncomplete(set.id)
				return
			}
			const values = parseValues()
			await onComplete(set.id, values)
		} catch (error) {
			throw error
		} finally {
			setBusy(false)
		}
	}

	const handleBlurSave = async () => {
		if (set.completedAt || busy) {
			return
		}
		try {
			const values = parseValues()
			await onSaveDraft(set.id, values)
		} catch {
			// Draft save failures stay local until complete retry.
		}
	}

	return (
		<View
			style={[
				styles.row,
				{
					backgroundColor: set.completedAt
						? palette.primaryMuted
						: palette.surfaceElevated,
					borderColor: palette.border,
				},
			]}
		>
			<Pressable onPress={() => onChangeType(set.id)} style={styles.index}>
				<AppText variant="caption">
					{index + 1}
					{set.setType !== 'working'
						? ` ${SET_TYPE_SHORT[set.setType]}`
						: ''}
				</AppText>
			</Pressable>
			<AppText variant="caption" muted style={styles.prev}>
				{previousSetLabel(previous)}
			</AppText>

			{showWeight ? (
				<View style={styles.metric}>
					<Pressable onPress={() => adjustWeight(-step)} style={styles.step}>
						<AppText>−</AppText>
					</Pressable>
					<TextInput
						value={weightText}
						onChangeText={setWeightText}
						onBlur={() => {
							void handleBlurSave()
						}}
						keyboardType="decimal-pad"
						editable={!set.completedAt}
						style={[
							styles.input,
							{ color: palette.text, borderColor: palette.border },
						]}
						placeholder={weightFieldLabel(tracking)}
						placeholderTextColor={palette.textMuted}
					/>
					<Pressable onPress={() => adjustWeight(step)} style={styles.step}>
						<AppText>+</AppText>
					</Pressable>
				</View>
			) : null}

			{showReps ? (
				<View style={styles.metric}>
					<Pressable onPress={() => adjustReps(-1)} style={styles.step}>
						<AppText>−</AppText>
					</Pressable>
					<TextInput
						value={repsText}
						onChangeText={setRepsText}
						onBlur={() => {
							void handleBlurSave()
						}}
						keyboardType="number-pad"
						editable={!set.completedAt}
						style={[
							styles.input,
							{ color: palette.text, borderColor: palette.border },
						]}
						placeholder="повт"
						placeholderTextColor={palette.textMuted}
					/>
					<Pressable onPress={() => adjustReps(1)} style={styles.step}>
						<AppText>+</AppText>
					</Pressable>
				</View>
			) : null}

			{showDuration ? (
				<TextInput
					value={durationText}
					onChangeText={setDurationText}
					onBlur={() => {
						void handleBlurSave()
					}}
					keyboardType="number-pad"
					editable={!set.completedAt}
					style={[
						styles.input,
						styles.wideInput,
						{ color: palette.text, borderColor: palette.border },
					]}
					placeholder="сек"
					placeholderTextColor={palette.textMuted}
				/>
			) : null}

			{showDistance ? (
				<TextInput
					value={distanceText}
					onChangeText={setDistanceText}
					onBlur={() => {
						void handleBlurSave()
					}}
					keyboardType="decimal-pad"
					editable={!set.completedAt}
					style={[
						styles.input,
						styles.wideInput,
						{ color: palette.text, borderColor: palette.border },
					]}
					placeholder="км"
					placeholderTextColor={palette.textMuted}
				/>
			) : null}

			<Pressable
				accessibilityRole="button"
				onPress={() => {
					void handleComplete().catch((error: unknown) => {
						const message =
							error instanceof Error ? error.message : 'Не удалось сохранить'
						// Parent should also catch; local no-op if thrown through.
						console.warn(message)
					})
				}}
				style={[
					styles.check,
					{
						backgroundColor: set.completedAt
							? palette.success
							: palette.surface,
						borderColor: set.completedAt ? palette.success : palette.border,
					},
				]}
			>
				<AppText style={{ color: set.completedAt ? '#fff' : palette.text }}>
					{set.completedAt ? '✓' : '○'}
				</AppText>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.sm,
		paddingHorizontal: spacing.xs,
		paddingVertical: spacing.xs,
		minHeight: 48,
	},
	index: {
		width: 28,
		alignItems: 'center',
	},
	prev: {
		width: 56,
	},
	metric: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 2,
	},
	step: {
		minWidth: 32,
		minHeight: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	input: {
		flex: 1,
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.sm,
		paddingHorizontal: spacing.xs,
		textAlign: 'center',
		...typography.body,
	},
	wideInput: {
		minWidth: 64,
		flex: 1,
	},
	check: {
		minWidth: 44,
		minHeight: 44,
		borderRadius: radius.sm,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
