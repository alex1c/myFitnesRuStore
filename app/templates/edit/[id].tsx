/**
 * Template editor: ordered exercises, planning fields, reorder up/down.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
	Alert,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import type { Exercise, TemplateExercise, WorkoutTemplate } from '@/src/domain/types'
import { validateTemplateMeta } from '@/src/features/templates/form-validation'
import { formatTemplateExerciseSubtitle } from '@/src/features/templates/summary'
import {
	useExerciseRepository,
	useTemplateRepository,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Row = {
	item: TemplateExercise
	exercise: Exercise | null
}

export default function TemplateEditorScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const templates = useTemplateRepository()
	const exercisesRepo = useExerciseRepository()

	const [template, setTemplate] = useState<WorkoutTemplate | null>(null)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [rows, setRows] = useState<Row[]>([])
	const [nameError, setNameError] = useState<string | null>(null)

	const load = useCallback(async () => {
		if (!id) {
			return
		}
		const detail = await templates.getDetail(id)
		if (!detail) {
			setTemplate(null)
			return
		}
		setTemplate(detail.template)
		setName(detail.template.name)
		setDescription(detail.template.description ?? '')
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

	const saveMeta = async () => {
		if (!template) {
			return
		}
		const result = validateTemplateMeta({ name, description })
		if (!result.ok) {
			setNameError(result.errors.name ?? 'Проверьте название')
			return
		}
		setNameError(null)
		await templates.update(template.id, {
			name: result.name,
			description: result.description,
		})
		await load()
	}

	const handleRemove = (row: Row) => {
		Alert.alert(
			'Убрать из тренировки?',
			row.exercise?.name ?? 'Упражнение останется в библиотеке.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Убрать',
					style: 'destructive',
					onPress: () => {
						void (async () => {
							await templates.removeExercise(row.item.id)
							await load()
						})()
					},
				},
			],
		)
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
			<AppText variant="label" muted>
				Название
			</AppText>
			<TextInput
				value={name}
				onChangeText={setName}
				onBlur={() => {
					void saveMeta()
				}}
				style={[
					styles.input,
					{
						color: palette.text,
						borderColor: nameError ? palette.danger : palette.border,
						backgroundColor: palette.surface,
					},
				]}
			/>
			{nameError ? (
				<AppText variant="caption" style={{ color: palette.danger }}>
					{nameError}
				</AppText>
			) : null}

			<AppText variant="label" muted>
				Описание
			</AppText>
			<TextInput
				value={description}
				onChangeText={setDescription}
				onBlur={() => {
					void saveMeta()
				}}
				placeholder="Необязательно"
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

			{rows.length === 0 ? (
				<AppText muted>
					Добавьте хотя бы одно упражнение, чтобы тренировка была готова к
					использованию.
				</AppText>
			) : null}

			<View style={styles.list}>
				{rows.map((row, index) => {
					const trackingType = row.exercise?.trackingType ?? 'weight_reps'
					const isArchived = Boolean(row.exercise?.archivedAt)
					return (
						<View
							key={row.item.id}
							style={[
								styles.row,
								{
									backgroundColor: palette.surface,
									borderColor: palette.border,
								},
							]}
						>
							<Pressable
								onPress={() =>
									router.push(
										`/templates/edit-exercise/${row.item.id}`,
									)
								}
								style={styles.rowMain}
							>
								<AppText variant="subtitle" numberOfLines={1}>
									{row.exercise?.name ?? 'Упражнение'}
								</AppText>
								<AppText variant="caption" muted>
									{formatTemplateExerciseSubtitle({
										plannedSets: row.item.plannedSets,
										targetRepsMin: row.item.targetRepsMin,
										targetRepsMax: row.item.targetRepsMax,
										restSeconds: row.item.restSeconds,
										trackingType,
									})}
								</AppText>
								{isArchived ? (
									<AppText
										variant="caption"
										style={{ color: palette.danger }}
									>
										Упражнение в архиве
									</AppText>
								) : null}
							</Pressable>
							<View style={styles.rowActions}>
								<IconButton
									label="↑"
									disabled={index === 0}
									onPress={() => {
										void templates
											.moveExercise(row.item.id, 'up')
											.then(load)
									}}
								/>
								<IconButton
									label="↓"
									disabled={index === rows.length - 1}
									onPress={() => {
										void templates
											.moveExercise(row.item.id, 'down')
											.then(load)
									}}
								/>
								<IconButton
									label="✕"
									onPress={() => handleRemove(row)}
								/>
							</View>
						</View>
					)
				})}
			</View>

			<Pressable
				accessibilityRole="button"
				onPress={() =>
					router.push(`/templates/add-exercise/${template.id}`)
				}
				style={({ pressed }) => [
					styles.addButton,
					{
						backgroundColor: palette.primary,
						opacity: pressed ? 0.88 : 1,
					},
				]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					+ Добавить упражнение
				</AppText>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				onPress={() => router.replace(`/templates/${template.id}`)}
				style={styles.doneLink}
			>
				<AppText style={{ color: palette.primary }}>Готово</AppText>
			</Pressable>
		</Screen>
	)
}

function IconButton ({
	label,
	onPress,
	disabled,
}: {
	label: string
	onPress: () => void
	disabled?: boolean
}) {
	const palette = useThemeColors()
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			style={[
				styles.iconButton,
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
	input: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	list: {
		gap: spacing.sm,
	},
	row: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		padding: spacing.md,
		gap: spacing.sm,
	},
	rowMain: {
		gap: 2,
	},
	rowActions: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	iconButton: {
		minWidth: touchTarget.minWidth,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.sm,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneLink: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
