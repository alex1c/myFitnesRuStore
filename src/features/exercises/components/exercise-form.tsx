/**
 * Shared create/edit form for custom exercises (and settings for built-ins).
 */
import React, { useMemo, useState } from 'react'
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { Equipment, MuscleGroup, TrackingType } from '@/src/domain/types'
import {
	REST_PRESETS,
	WEIGHT_STEP_PRESETS,
	validateExerciseForm,
	type ExerciseFormErrors,
} from '@/src/features/exercises/form-validation'
import {
	EQUIPMENT_LABELS,
	MUSCLE_GROUP_LABELS,
	TRACKING_TYPE_LABELS,
	usesWeightStep,
} from '@/src/features/exercises/labels'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export type ExerciseFormSubmit = {
	name: string
	muscleGroup: MuscleGroup
	equipment: Equipment
	trackingType: TrackingType
	defaultRestSeconds: number
	weightStep: number | null
	notes: string | null
}

type Props = {
	initial?: Partial<ExerciseFormSubmit> & { weightStepRaw?: string }
	/** When true, lock identity fields (built-in exercises). */
	lockIdentity?: boolean
	submitLabel: string
	onSubmit: (values: ExerciseFormSubmit) => Promise<void> | void
}

const MUSCLE_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS) as [
	MuscleGroup,
	string,
][]
const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS) as [
	Equipment,
	string,
][]
const TRACKING_OPTIONS = Object.entries(TRACKING_TYPE_LABELS) as [
	TrackingType,
	string,
][]

function formatStep (value: number | null | undefined): string {
	if (value === null || value === undefined) {
		return ''
	}
	return String(value).replace('.', ',')
}

export function ExerciseForm ({
	initial,
	lockIdentity = false,
	submitLabel,
	onSubmit,
}: Props) {
	const palette = useThemeColors()
	const [name, setName] = useState(initial?.name ?? '')
	const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(
		(initial?.muscleGroup as MuscleGroup) ?? 'chest',
	)
	const [equipment, setEquipment] = useState<Equipment>(
		(initial?.equipment as Equipment) ?? 'barbell',
	)
	const [trackingType, setTrackingType] = useState<TrackingType>(
		initial?.trackingType ?? 'weight_reps',
	)
	const [restSeconds, setRestSeconds] = useState(
		initial?.defaultRestSeconds ?? 90,
	)
	const [customRest, setCustomRest] = useState('')
	const [weightStepRaw, setWeightStepRaw] = useState(
		initial?.weightStepRaw ?? formatStep(initial?.weightStep ?? 2.5),
	)
	const [notes, setNotes] = useState(initial?.notes ?? '')
	const [errors, setErrors] = useState<ExerciseFormErrors>({})
	const [isSaving, setIsSaving] = useState(false)

	const showWeightStep = usesWeightStep(trackingType)

	const restIsCustom = useMemo(
		() => !(REST_PRESETS as readonly number[]).includes(restSeconds),
		[restSeconds],
	)

	const handleSubmit = async () => {
		const resolvedRest =
			customRest.trim().length > 0
				? Number(customRest.trim().replace(',', '.'))
				: restSeconds

		const result = validateExerciseForm({
			name,
			muscleGroup,
			equipment,
			trackingType,
			defaultRestSeconds: resolvedRest,
			weightStepRaw: showWeightStep ? weightStepRaw : '',
			notes,
		})

		if (!result.ok) {
			setErrors(result.errors)
			return
		}

		setErrors({})
		setIsSaving(true)
		try {
			await onSubmit({
				name: name.trim().replace(/\s+/g, ' '),
				muscleGroup,
				equipment,
				trackingType,
				defaultRestSeconds: resolvedRest,
				weightStep: result.weightStep,
				notes: notes.trim() ? notes.trim() : null,
			})
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			keyboardVerticalOffset={88}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				{!lockIdentity ? (
					<>
						<FieldLabel>Название</FieldLabel>
						<TextInput
							value={name}
							onChangeText={setName}
							placeholder="Например, жим гантелей"
							placeholderTextColor={palette.textMuted}
							style={[
								styles.input,
								{
									color: palette.text,
									borderColor: errors.name
										? palette.danger
										: palette.border,
									backgroundColor: palette.surface,
								},
							]}
							maxLength={80}
							returnKeyType="next"
						/>
						{errors.name ? (
							<AppText variant="caption" style={{ color: palette.danger }}>
								{errors.name}
							</AppText>
						) : null}

						<FieldLabel>Группа мышц</FieldLabel>
						<ChipGrid
							options={MUSCLE_OPTIONS.map(([id, label]) => ({
								id,
								label,
							}))}
							selected={muscleGroup}
							onSelect={setMuscleGroup}
						/>

						<FieldLabel>Оборудование</FieldLabel>
						<ChipGrid
							options={EQUIPMENT_OPTIONS.map(([id, label]) => ({
								id,
								label,
							}))}
							selected={equipment}
							onSelect={setEquipment}
						/>

						<FieldLabel>Тип учёта</FieldLabel>
						<ChipGrid
							options={TRACKING_OPTIONS.map(([id, label]) => ({
								id,
								label,
							}))}
							selected={trackingType}
							onSelect={(value) => setTrackingType(value)}
						/>
					</>
				) : (
					<AppText muted>
						Для встроенного упражнения можно изменить отдых, шаг веса и
						заметку. Название и тип учёта остаются из библиотеки.
					</AppText>
				)}

				<FieldLabel>Отдых</FieldLabel>
				<View style={styles.chipWrap}>
					{REST_PRESETS.map((value) => (
						<SelectChip
							key={value}
							label={value < 60 ? `${value} сек` : `${value / 60} мин`}
							selected={!restIsCustom && restSeconds === value}
							onPress={() => {
								setRestSeconds(value)
								setCustomRest('')
							}}
						/>
					))}
					<SelectChip
						label="Своё"
						selected={restIsCustom || customRest.length > 0}
						onPress={() => {
							setCustomRest(String(restSeconds))
						}}
					/>
				</View>
				{restIsCustom || customRest.length > 0 ? (
					<TextInput
						value={customRest}
						onChangeText={setCustomRest}
						keyboardType="number-pad"
						placeholder="Секунды, например 100"
						placeholderTextColor={palette.textMuted}
						style={[
							styles.input,
							{
								color: palette.text,
								borderColor: errors.rest
									? palette.danger
									: palette.border,
								backgroundColor: palette.surface,
							},
						]}
					/>
				) : null}
				{errors.rest ? (
					<AppText variant="caption" style={{ color: palette.danger }}>
						{errors.rest}
					</AppText>
				) : null}

				{showWeightStep ? (
					<>
						<FieldLabel>Шаг веса</FieldLabel>
						<View style={styles.chipWrap}>
							{WEIGHT_STEP_PRESETS.map((value) => (
								<SelectChip
									key={value}
									label={value}
									selected={weightStepRaw === value}
									onPress={() => setWeightStepRaw(value)}
								/>
							))}
						</View>
						<TextInput
							value={weightStepRaw}
							onChangeText={setWeightStepRaw}
							keyboardType="decimal-pad"
							placeholder="Например 1,25"
							placeholderTextColor={palette.textMuted}
							style={[
								styles.input,
								{
									color: palette.text,
									borderColor: errors.weightStep
										? palette.danger
										: palette.border,
									backgroundColor: palette.surface,
								},
							]}
						/>
						{errors.weightStep ? (
							<AppText
								variant="caption"
								style={{ color: palette.danger }}
							>
								{errors.weightStep}
							</AppText>
						) : null}
					</>
				) : null}

				<FieldLabel>Заметка</FieldLabel>
				<TextInput
					value={notes}
					onChangeText={setNotes}
					placeholder="Например: сиденье 4, спинка 2"
					placeholderTextColor={palette.textMuted}
					multiline
					style={[
						styles.input,
						styles.notes,
						{
							color: palette.text,
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
				/>

				<Pressable
					accessibilityRole="button"
					disabled={isSaving}
					onPress={() => {
						void handleSubmit()
					}}
					style={({ pressed }) => [
						styles.submit,
						{
							backgroundColor: palette.primary,
							opacity: pressed || isSaving ? 0.85 : 1,
						},
					]}
				>
					<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
						{isSaving ? 'Сохранение…' : submitLabel}
					</AppText>
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

function FieldLabel ({ children }: { children: React.ReactNode }) {
	return (
		<AppText variant="label" muted style={styles.fieldLabel}>
			{children}
		</AppText>
	)
}

function ChipGrid<T extends string> ({
	options,
	selected,
	onSelect,
}: {
	options: { id: T; label: string }[]
	selected: T
	onSelect: (id: T) => void
}) {
	return (
		<View style={styles.chipWrap}>
			{options.map((option) => (
				<SelectChip
					key={option.id}
					label={option.label}
					selected={selected === option.id}
					onPress={() => onSelect(option.id)}
				/>
			))}
		</View>
	)
}

function SelectChip ({
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
			accessibilityRole="button"
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
	fieldLabel: {
		marginTop: spacing.sm,
	},
	input: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	notes: {
		minHeight: 96,
		textAlignVertical: 'top',
		paddingTop: spacing.sm,
	},
	chipWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minHeight: 40,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	submit: {
		marginTop: spacing.lg,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
