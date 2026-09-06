/**
 * Add or replace exercise in an active workout (reuses Phase 1 search).
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
	PRIMARY_FILTERS,
	filterExercises,
	type ExerciseFilterId,
} from '@/src/features/exercises/search-exercises'
import {
	useExerciseRepository,
	useWorkoutService,
} from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function AddExerciseToWorkoutScreen () {
	const { workoutId, replaceWorkoutExerciseId } = useLocalSearchParams<{
		workoutId: string
		replaceWorkoutExerciseId?: string
	}>()
	const palette = useThemeColors()
	const router = useRouter()
	const exercisesRepo = useExerciseRepository()
	const workouts = useWorkoutService()
	const [items, setItems] = useState<Exercise[]>([])
	const [query, setQuery] = useState('')
	const [filter, setFilter] = useState<ExerciseFilterId>('all')
	const isReplace = Boolean(replaceWorkoutExerciseId)

	const load = useCallback(async () => {
		setItems(await exercisesRepo.list())
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

	const handlePick = (exercise: Exercise) => {
		if (!workoutId) {
			return
		}

		const action = isReplace && replaceWorkoutExerciseId
			? workouts.replaceOrAddExercise(
				replaceWorkoutExerciseId,
				exercise.id,
			)
			: workouts
				.addExerciseToWorkout(workoutId, exercise.id)
				.then((detail) => ({ mode: 'added' as const, detail }))

		void action
			.then((result) => {
				if (result.mode === 'added' && isReplace) {
					Alert.alert(
						'Упражнение добавлено рядом',
						'По старому упражнению уже есть выполненные подходы — оно сохранено.',
					)
				}
				router.back()
			})
			.catch((err: unknown) => {
				Alert.alert(
					isReplace ? 'Не удалось заменить' : 'Не удалось добавить',
					err instanceof Error ? err.message : 'Попробуйте ещё раз',
				)
			})
	}

	return (
		<SafeAreaView
			edges={['bottom']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<View style={styles.header}>
				{isReplace ? (
					<AppText muted>
						Выберите замену. Если есть выполненные подходы — новое
						упражнение добавится рядом.
					</AppText>
				) : null}
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
							<AppText variant="caption">{item.label}</AppText>
						</Pressable>
					))}
				</View>
			</View>
			<FlatList
				data={visible}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => (
					<View style={{ height: spacing.xs }} />
				)}
				renderItem={({ item }) => (
					<ExerciseListRow
						exercise={item}
						onPress={handlePick}
					/>
				)}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	header: {
		padding: spacing.lg,
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
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	list: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xxl,
	},
})
