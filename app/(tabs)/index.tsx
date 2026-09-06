/**
 * Сегодня — start screen with template cards (no active workout yet).
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import type { TemplateExercise, WorkoutTemplate } from '@/src/domain/types'
import { TemplateListCard } from '@/src/features/templates/components/template-list-card'
import { useTemplateRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type TemplateCardData = {
	template: WorkoutTemplate
	exercises: TemplateExercise[]
}

export default function TodayScreen () {
	const palette = useThemeColors()
	const router = useRouter()
	const templates = useTemplateRepository()
	const [cards, setCards] = useState<TemplateCardData[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const load = useCallback(async () => {
		setIsLoading(true)
		try {
			const list = await templates.list()
			const withExercises = await Promise.all(
				list.map(async (template) => ({
					template,
					exercises: await templates.listExercises(template.id),
				})),
			)
			setCards(withExercises)
		} finally {
			setIsLoading(false)
		}
	}, [templates])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const openCreate = () => {
		router.push('/templates/new')
	}

	return (
		<Screen>
			<AppText variant="title">Сегодня</AppText>

			{isLoading ? (
				<AppText muted>Загрузка…</AppText>
			) : cards.length === 0 ? (
				<View
					style={[
						styles.empty,
						{
							backgroundColor: palette.surface,
							borderColor: palette.border,
						},
					]}
				>
					<AppText variant="title">Создайте первую тренировку</AppText>
					<AppText muted>
						Добавьте упражнения и сохраните удобный шаблон для зала.
					</AppText>
					<Pressable
						accessibilityRole="button"
						onPress={openCreate}
						style={({ pressed }) => [
							styles.primaryButton,
							{
								backgroundColor: palette.primary,
								opacity: pressed ? 0.88 : 1,
							},
						]}
					>
						<AppText
							variant="subtitle"
							style={{ color: palette.onPrimary }}
						>
							Создать тренировку
						</AppText>
					</Pressable>
				</View>
			) : (
				<>
					<AppText variant="subtitle">Мои тренировки</AppText>
					<View style={styles.list}>
						{cards.map(({ template, exercises }) => (
							<TemplateListCard
								key={template.id}
								template={template}
								exercises={exercises}
								onPress={() => router.push(`/templates/${template.id}`)}
							/>
						))}
					</View>
					<Pressable
						accessibilityRole="button"
						onPress={openCreate}
						style={({ pressed }) => [
							styles.primaryButton,
							{
								backgroundColor: palette.primary,
								opacity: pressed ? 0.88 : 1,
							},
						]}
					>
						<AppText
							variant="subtitle"
							style={{ color: palette.onPrimary }}
						>
							+ Новая тренировка
						</AppText>
					</Pressable>
				</>
			)}

			<Pressable
				accessibilityRole="button"
				onPress={() => router.push('/templates/archive')}
				style={styles.archiveLink}
			>
				<AppText variant="caption" style={{ color: palette.primary }}>
					Архив тренировок
				</AppText>
			</Pressable>
		</Screen>
	)
}

const styles = StyleSheet.create({
	empty: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	list: {
		gap: spacing.sm,
	},
	primaryButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	archiveLink: {
		alignSelf: 'flex-start',
		minHeight: 40,
		justifyContent: 'center',
	},
})
