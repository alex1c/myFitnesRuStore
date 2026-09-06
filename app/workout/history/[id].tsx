/**
 * Read-only completed workout history detail.
 */
import { useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import type { WorkoutDetail } from '@/src/domain/types'
import {
	formatWeight,
	formatWorkoutDuration,
	previousSetLabel,
} from '@/src/features/workout/set-logic'
import {
	formatExerciseCount,
	formatSetCount,
} from '@/src/features/templates/summary'
import { useWorkoutService } from '@/src/providers/database-provider'

export default function HistoryDetailScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const workouts = useWorkoutService()
	const [detail, setDetail] = useState<WorkoutDetail | null>(null)

	useEffect(() => {
		void (async () => {
			if (!id) {
				return
			}
			setDetail(await workouts.getDetail(id))
		})()
	}, [id, workouts])

	if (!detail) {
		return (
			<Screen>
				<AppText muted>Загрузка…</AppText>
			</Screen>
		)
	}

	const completedCount = detail.exercises.reduce(
		(sum, block) =>
			sum + block.sets.filter((set) => set.completedAt).length,
		0,
	)

	return (
		<Screen>
			<AppText variant="title">{detail.workout.name}</AppText>
			{detail.workout.finishedAt ? (
				<AppText muted>
					{formatWorkoutDuration(
						detail.workout.startedAt,
						detail.workout.finishedAt,
					)}
					{' • '}
					{formatSetCount(completedCount)}
					{' • '}
					{formatExerciseCount(detail.exercises.length)}
				</AppText>
			) : null}

			{detail.exercises.map((block) => {
				const completed = block.sets.filter((set) => set.completedAt)
				return (
					<SurfaceCard key={block.workoutExercise.id}>
						<AppText variant="subtitle">
							{block.exercise?.name ?? 'Упражнение'}
						</AppText>
						{completed.length === 0 ? (
							<AppText muted>Нет выполненных подходов</AppText>
						) : (
							completed.map((set) => (
								<AppText key={set.id}>
									{set.weight !== null && set.reps !== null
										? `${formatWeight(set.weight)} × ${set.reps}`
										: previousSetLabel(set)}
								</AppText>
							))
						)}
						{block.workoutExercise.notes ? (
							<AppText muted>{block.workoutExercise.notes}</AppText>
						) : null}
					</SurfaceCard>
				)
			})}
		</Screen>
	)
}
