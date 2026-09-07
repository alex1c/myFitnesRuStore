/**
 * Progress overview — period summary + exercises with completed history.
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
	FlatList,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { ExerciseHistoryListItem } from '@/src/db/repositories/progress-repository'
import type { OverallProgressSummary } from '@/src/db/services/progress-service'
import {
	formatVolumeKg,
	type ProgressPeriodDays,
} from '@/src/features/progress/metrics'
import {
	formatSetCount,
	pluralRu,
} from '@/src/features/templates/summary'
import { useProgressService } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

const PERIODS: { id: ProgressPeriodDays; label: string }[] = [
	{ id: 30, label: '30' },
	{ id: 90, label: '90' },
	{ id: 180, label: '180' },
	{ id: null, label: 'Всё' },
]

export default function ProgressScreen () {
	const palette = useThemeColors()
	const router = useRouter()
	const progress = useProgressService()
	const [period, setPeriod] = useState<ProgressPeriodDays>(30)
	const [summary, setSummary] = useState<OverallProgressSummary | null>(null)
	const [exercises, setExercises] = useState<ExerciseHistoryListItem[]>([])
	const [query, setQuery] = useState('')

	const load = useCallback(async () => {
		const [nextSummary, nextExercises] = await Promise.all([
			progress.getOverallSummary(period),
			progress.listExercisesWithHistory(),
		])
		setSummary(nextSummary)
		setExercises(nextExercises)
	}, [period, progress])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const visible = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return exercises
		}
		return exercises.filter((item) =>
			item.name.toLowerCase().includes(normalized),
		)
	}, [exercises, query])

	const periodLabel =
		period === null ? 'За всё время' : `За последние ${period} дней`

	return (
		<SafeAreaView
			edges={['top']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<FlatList
				data={visible}
				keyExtractor={(item) => item.exerciseId}
				contentContainerStyle={styles.list}
				ListHeaderComponent={
					<View style={styles.header}>
						<AppText variant="title">Прогресс</AppText>

						<View style={styles.periods}>
							{PERIODS.map((item) => (
								<Pressable
									key={String(item.id)}
									onPress={() => setPeriod(item.id)}
									style={[
										styles.periodChip,
										{
											borderColor:
												period === item.id
													? palette.primary
													: palette.border,
											backgroundColor:
												period === item.id
													? palette.primaryMuted
													: palette.surface,
										},
									]}
								>
									<AppText variant="caption">{item.label}</AppText>
								</Pressable>
							))}
						</View>

						{summary && summary.workoutCount === 0 ? (
							<View
								style={[
									styles.empty,
									{
										backgroundColor: palette.surface,
										borderColor: palette.border,
									},
								]}
							>
								<AppText variant="subtitle">
									Прогресс появится после первых тренировок
								</AppText>
								<AppText muted>
									Записывайте подходы — здесь появятся графики и
									рекорды.
								</AppText>
							</View>
						) : summary ? (
							<View
								style={[
									styles.summary,
									{
										backgroundColor: palette.surface,
										borderColor: palette.border,
									},
								]}
							>
								<AppText variant="subtitle">{periodLabel}</AppText>
								<AppText>
									{summary.workoutCount}{' '}
									{pluralRu(
										summary.workoutCount,
										'тренировка',
										'тренировки',
										'тренировок',
									)}
								</AppText>
								<AppText>
									{formatSetCount(summary.completedSetCount)}
								</AppText>
								<AppText>
									{formatVolumeKg(summary.weightedVolumeKg)} кг объёма
								</AppText>
							</View>
						) : (
							<AppText muted>Загрузка…</AppText>
						)}

						<AppText variant="subtitle" style={styles.section}>
							По упражнениям
						</AppText>
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
						{visible.length === 0 && summary && summary.workoutCount > 0 ? (
							<AppText muted>
								Нет упражнений с выполненными подходами.
							</AppText>
						) : null}
					</View>
				}
				ItemSeparatorComponent={() => (
					<View style={{ height: spacing.sm }} />
				)}
				renderItem={({ item }) => (
					<Pressable
						onPress={() =>
							router.push(`/progress/${item.exerciseId}`)
						}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: palette.surface,
								borderColor: palette.border,
								opacity: pressed ? 0.9 : 1,
							},
						]}
					>
						<AppText variant="subtitle">{item.name}</AppText>
						{item.archivedAt ? (
							<AppText variant="caption" muted>
								В архиве
							</AppText>
						) : null}
					</Pressable>
				)}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	list: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xxl,
	},
	header: {
		gap: spacing.sm,
		paddingBottom: spacing.md,
	},
	periods: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	periodChip: {
		minHeight: 36,
		minWidth: 48,
		paddingHorizontal: spacing.sm,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
	summary: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: 4,
	},
	empty: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: spacing.sm,
	},
	section: {
		marginTop: spacing.sm,
	},
	search: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	card: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: 2,
	},
})
