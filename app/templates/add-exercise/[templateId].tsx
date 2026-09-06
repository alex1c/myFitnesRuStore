/**
 * Exercise picker for a template — reuses Phase 1 search/filter.
 * Supports adding several exercises in a row without leaving the screen.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
	Alert,
	FlatList,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { Exercise } from '@/src/domain/types'
import { ExerciseListRow } from '@/src/features/exercises/components/exercise-list-row'
import {
	MORE_FILTERS,
	PRIMARY_FILTERS,
	filterExercises,
	type ExerciseFilterId,
} from '@/src/features/exercises/search-exercises'
import { defaultPlanForExercise } from '@/src/features/templates/defaults'
import {
	useExerciseRepository,
	useTemplateRepository,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function AddExerciseToTemplateScreen () {
	const { templateId } = useLocalSearchParams<{ templateId: string }>()
	const palette = useThemeColors()
	const router = useRouter()
	const exercisesRepo = useExerciseRepository()
	const templates = useTemplateRepository()

	const [items, setItems] = useState<Exercise[]>([])
	const [query, setQuery] = useState('')
	const [filter, setFilter] = useState<ExerciseFilterId>('all')
	const [addedCount, setAddedCount] = useState(0)

	const load = useCallback(async () => {
		const list = await exercisesRepo.list()
		setItems(list)
	}, [exercisesRepo])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const visible = useMemo(
		() => filterExercises(items, { query, filter }),
		[items, query, filter],
	)

	const addExercise = async (exercise: Exercise) => {
		if (!templateId) {
			return
		}

		const occurrences = await templates.countExerciseOccurrences(
			templateId,
			exercise.id,
		)

		const proceed = async () => {
			const defaults = defaultPlanForExercise(exercise)
			await templates.addExercise({
				templateId,
				exerciseId: exercise.id,
				plannedSets: defaults.plannedSets,
				targetRepsMin: defaults.targetRepsMin,
				targetRepsMax: defaults.targetRepsMax,
				restSeconds: defaults.restSeconds,
			})
			setAddedCount((count) => count + 1)
		}

		if (occurrences > 0) {
			Alert.alert(
				'Это упражнение уже есть в тренировке.',
				'Добавить ещё раз?',
				[
					{ text: 'Отмена', style: 'cancel' },
					{
						text: 'Добавить ещё раз',
						onPress: () => {
							void proceed().catch(() => {
								Alert.alert('Не удалось добавить', 'Попробуйте ещё раз.')
							})
						},
					},
				],
			)
			return
		}

		try {
			await proceed()
		} catch {
			Alert.alert('Не удалось добавить', 'Попробуйте ещё раз.')
		}
	}

	return (
		<SafeAreaView
			edges={['bottom']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<View style={styles.header}>
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Поиск упражнения"
					placeholderTextColor={palette.textMuted}
					style={[
						styles.search,
						{
							color: palette.text,
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
					autoCorrect={false}
					returnKeyType="search"
				/>
				<View style={styles.filters}>
					{PRIMARY_FILTERS.map((item) => (
						<Pressable
							key={item.id}
							onPress={() => setFilter(item.id)}
							style={[
								styles.chip,
								{
									backgroundColor:
										filter === item.id
											? palette.primaryMuted
											: palette.surface,
									borderColor:
										filter === item.id
											? palette.primary
											: palette.border,
								},
							]}
						>
							<AppText
								variant="caption"
								style={{
									color:
										filter === item.id
											? palette.primary
											: palette.text,
								}}
							>
								{item.label}
							</AppText>
						</Pressable>
					))}
					{MORE_FILTERS.map((item) => (
						<Pressable
							key={item.id}
							onPress={() => setFilter(item.id)}
							style={[
								styles.chip,
								{
									backgroundColor:
										filter === item.id
											? palette.primaryMuted
											: palette.surface,
									borderColor:
										filter === item.id
											? palette.primary
											: palette.border,
								},
							]}
						>
							<AppText
								variant="caption"
								style={{
									color:
										filter === item.id
											? palette.primary
											: palette.text,
								}}
							>
								{item.label}
							</AppText>
						</Pressable>
					))}
				</View>
				<Pressable
					onPress={() => router.push('/exercises/new')}
					style={styles.createLink}
				>
					<AppText style={{ color: palette.primary }}>
						+ Своё упражнение
					</AppText>
				</Pressable>
				{addedCount > 0 ? (
					<AppText muted>
						Добавлено: {addedCount}. Можно выбрать ещё или вернуться
						назад.
					</AppText>
				) : null}
			</View>

			<FlatList
				data={visible}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					<AppText muted style={styles.empty}>
						Ничего не найдено
					</AppText>
				}
				renderItem={({ item }) => (
					<ExerciseListRow
						exercise={item}
						onPress={(exercise) => {
							void addExercise(exercise)
						}}
					/>
				)}
			/>

			<Pressable
				accessibilityRole="button"
				onPress={() => router.back()}
				style={[
					styles.done,
					{ backgroundColor: palette.primary },
				]}
			>
				<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
					Готово
				</AppText>
			</Pressable>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	header: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.md,
		gap: spacing.sm,
	},
	search: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	filters: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minHeight: 36,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	createLink: {
		minHeight: 40,
		justifyContent: 'center',
	},
	list: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.lg,
		flexGrow: 1,
	},
	empty: {
		marginTop: spacing.xl,
		textAlign: 'center',
	},
	done: {
		marginHorizontal: spacing.lg,
		marginBottom: spacing.lg,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
