/**
 * Archived custom exercises with restore actions.
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { Exercise } from '@/src/domain/types'
import { ExerciseListRow } from '@/src/features/exercises/components/exercise-list-row'
import { useExerciseRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function ArchiveScreen () {
	const palette = useThemeColors()
	const exercises = useExerciseRepository()
	const router = useRouter()
	const [items, setItems] = useState<Exercise[]>([])

	const load = useCallback(async () => {
		setItems(await exercises.listArchived())
	}, [exercises])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleRestore = (exercise: Exercise) => {
		Alert.alert(
			'Восстановить упражнение?',
			`«${exercise.name}» снова появится в списке.`,
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Восстановить',
					onPress: () => {
						void (async () => {
							try {
								await exercises.restore(exercise.id)
								await load()
							} catch {
								Alert.alert(
									'Не удалось восстановить',
									'Попробуйте ещё раз.',
								)
							}
						})()
					},
				},
			],
		)
	}

	return (
		<SafeAreaView
			edges={['bottom']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<FlatList
				data={items}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.content}
				ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="title">В архиве пока нет упражнений</AppText>
						<AppText muted>
							Сюда попадают ваши упражнения, которые вы убрали из основного
							списка.
						</AppText>
					</View>
				}
				renderItem={({ item }) => (
					<View style={styles.item}>
						<ExerciseListRow
							exercise={item}
							onPress={() => router.push(`/exercises/${item.id}`)}
						/>
						<Pressable
							accessibilityRole="button"
							onPress={() => handleRestore(item)}
							style={({ pressed }) => [
								styles.restore,
								{
									borderColor: palette.primary,
									opacity: pressed ? 0.85 : 1,
								},
							]}
						>
							<AppText style={{ color: palette.primary }}>
								Восстановить
							</AppText>
						</Pressable>
					</View>
				)}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	content: {
		padding: spacing.lg,
		flexGrow: 1,
		paddingBottom: spacing.xxl,
	},
	empty: {
		marginTop: spacing.xl,
		gap: spacing.sm,
	},
	item: {
		gap: spacing.xs,
	},
	restore: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
