/**
 * Per-exercise progress detail — metrics + chart modes.
 */
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import type {
	ChartMetric,
	ExerciseProgressSummary,
} from '@/src/db/services/progress-service'
import { ProgressLineChart } from '@/src/features/progress/components/progress-line-chart'
import {
	formatE1rmKg,
	formatVolumeKg,
	type ProgressPeriodDays,
} from '@/src/features/progress/metrics'
import { formatDurationClock, formatWeight } from '@/src/features/workout/set-logic'
import { useProgressService } from '@/src/providers/database-provider'
import { radius, spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

const PERIODS: { id: ProgressPeriodDays; label: string }[] = [
	{ id: 30, label: '30' },
	{ id: 90, label: '90' },
	{ id: 180, label: '180' },
	{ id: null, label: 'Всё' },
]

const CHART_MODES: { id: ChartMetric; label: string }[] = [
	{ id: 'weight', label: 'Рабочий вес' },
	{ id: 'e1rm', label: '1ПМ' },
	{ id: 'volume', label: 'Объём' },
]

export default function ExerciseProgressScreen () {
	const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()
	const palette = useThemeColors()
	const progress = useProgressService()
	const [period, setPeriod] = useState<ProgressPeriodDays>(30)
	const [metric, setMetric] = useState<ChartMetric>('weight')
	const [summary, setSummary] = useState<ExerciseProgressSummary | null>(null)

	const load = useCallback(async () => {
		if (!exerciseId) {
			return
		}
		setSummary(await progress.getExerciseSummary(exerciseId, period))
	}, [exerciseId, period, progress])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const chartPoints = useMemo(() => {
		if (!summary) {
			return []
		}
		return summary.series[metric]
	}, [metric, summary])

	if (!summary) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	const isWeight = summary.trackingType === 'weight_reps'

	return (
		<Screen>
			<AppText variant="title">{summary.name}</AppText>
			{summary.archivedAt ? (
				<AppText muted>В архиве</AppText>
			) : null}

			<View style={styles.periods}>
				{PERIODS.map((item) => (
					<Pressable
						key={String(item.id)}
						onPress={() => setPeriod(item.id)}
						style={[
							styles.chip,
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

			{summary.lastResultLabel ? (
				<SurfaceCard>
					<AppText variant="caption" muted>
						Последняя тренировка
					</AppText>
					<AppText>{summary.lastResultLabel}</AppText>
				</SurfaceCard>
			) : null}

			{isWeight ? (
				<>
					{summary.maxWeightKg !== null ? (
						<Metric
							label="Максимальный вес"
							value={`${formatWeight(summary.maxWeightKg)} кг`}
						/>
					) : null}
					{summary.bestSetLabel ? (
						<Metric
							label="Лучший подход"
							value={summary.bestSetLabel}
						/>
					) : null}
					{summary.bestE1rmKg !== null ? (
						<Metric
							label="Расчётный 1ПМ"
							value={`${formatE1rmKg(summary.bestE1rmKg)} кг`}
							hint="Оценка максимального веса на 1 повтор"
						/>
					) : null}
					{summary.volumeKg !== null ? (
						<Metric
							label={
								period === null
									? 'Объём'
									: `Объём за ${period} дней`
							}
							value={`${formatVolumeKg(summary.volumeKg)} кг`}
						/>
					) : null}
				</>
			) : null}

			{summary.trackingType === 'bodyweight_reps'
				&& summary.maxReps !== null ? (
					<Metric
						label="Максимум повторений"
						value={String(summary.maxReps)}
					/>
				) : null}

			{summary.trackingType === 'duration'
				&& summary.maxDurationSeconds !== null ? (
					<Metric
						label="Максимальная длительность"
						value={formatDurationClock(summary.maxDurationSeconds)}
					/>
				) : null}

			{summary.trackingType === 'distance_duration'
				&& summary.maxDistanceKm !== null ? (
					<Metric
						label="Максимальная дистанция"
						value={`${formatWeight(summary.maxDistanceKm)} км`}
					/>
				) : null}

			{isWeight ? (
				<>
					<AppText variant="subtitle">График</AppText>
					<View style={styles.periods}>
						{CHART_MODES.map((item) => (
							<Pressable
								key={item.id}
								onPress={() => setMetric(item.id)}
								style={[
									styles.chip,
									{
										borderColor:
											metric === item.id
												? palette.primary
												: palette.border,
										backgroundColor:
											metric === item.id
												? palette.primaryMuted
												: palette.surface,
									},
								]}
							>
								<AppText variant="caption">{item.label}</AppText>
							</Pressable>
						))}
					</View>
					{chartPoints.length < 2 ? (
						<AppText muted>
							Нужно ещё хотя бы две тренировки для графика.
						</AppText>
					) : (
						<ProgressLineChart points={chartPoints} />
					)}
				</>
			) : null}
		</Screen>
	)
}

function Metric ({
	label,
	value,
	hint,
}: {
	label: string
	value: string
	hint?: string
}) {
	return (
		<SurfaceCard>
			<AppText variant="caption" muted>
				{label}
			</AppText>
			<AppText variant="subtitle">{value}</AppText>
			{hint ? <AppText muted>{hint}</AppText> : null}
		</SurfaceCard>
	)
}

const styles = StyleSheet.create({
	periods: {
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
})
