/**
 * Archived workout templates with restore.
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { TemplateExercise, WorkoutTemplate } from '@/src/domain/types'
import { TemplateListCard } from '@/src/features/templates/components/template-list-card'
import { useTemplateRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Card = {
	template: WorkoutTemplate
	exercises: TemplateExercise[]
}

export default function TemplatesArchiveScreen () {
	const palette = useThemeColors()
	const templates = useTemplateRepository()
	const router = useRouter()
	const [cards, setCards] = useState<Card[]>([])

	const load = useCallback(async () => {
		const list = await templates.listArchived()
		const withExercises = await Promise.all(
			list.map(async (template) => ({
				template,
				exercises: await templates.listExercises(template.id),
			})),
		)
		setCards(withExercises)
	}, [templates])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const handleRestore = (template: WorkoutTemplate) => {
		Alert.alert(
			'Восстановить тренировку?',
			`«${template.name}» снова появится на экране «Сегодня».`,
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Восстановить',
					onPress: () => {
						void (async () => {
							try {
								await templates.restore(template.id)
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
				data={cards}
				keyExtractor={(item) => item.template.id}
				contentContainerStyle={styles.content}
				ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="title">В архиве пока нет тренировок</AppText>
						<AppText muted>
							Сюда попадают шаблоны, которые вы убрали с экрана «Сегодня».
						</AppText>
					</View>
				}
				renderItem={({ item }) => (
					<View style={styles.item}>
						<TemplateListCard
							template={item.template}
							exercises={item.exercises}
							onPress={() => router.push(`/templates/${item.template.id}`)}
						/>
						<Pressable
							accessibilityRole="button"
							onPress={() => handleRestore(item.template)}
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
