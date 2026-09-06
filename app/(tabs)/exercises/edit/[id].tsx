/**
 * Edit custom exercise or personalize built-in settings.
 */
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { Equipment, Exercise, MuscleGroup } from '@/src/domain/types'
import { ExerciseForm } from '@/src/features/exercises/components/exercise-form'
import { useExerciseRepository } from '@/src/providers/database-provider'
import { spacing } from '@/src/theme'

function asMuscleGroup (value: string): MuscleGroup {
	return value as MuscleGroup
}

function asEquipment (value: string): Equipment {
	return value as Equipment
}

export default function EditExerciseScreen () {
	const { id } = useLocalSearchParams<{ id: string }>()
	const exercises = useExerciseRepository()
	const router = useRouter()
	const [exercise, setExercise] = useState<Exercise | null>(null)

	useEffect(() => {
		void (async () => {
			if (!id) {
				return
			}
			const row = await exercises.getById(id)
			setExercise(row)
		})()
	}, [exercises, id])

	if (!exercise) {
		return (
			<View style={{ padding: spacing.lg }}>
				<AppText muted>Загрузка…</AppText>
			</View>
		)
	}

	return (
		<ExerciseForm
			lockIdentity={!exercise.isCustom}
			initial={{
				name: exercise.name,
				muscleGroup: asMuscleGroup(exercise.muscleGroup),
				equipment: asEquipment(exercise.equipment),
				trackingType: exercise.trackingType,
				defaultRestSeconds: exercise.defaultRestSeconds,
				weightStep: exercise.weightStep,
				notes: exercise.notes,
			}}
			submitLabel="Сохранить изменения"
			onSubmit={async (values) => {
				try {
					await exercises.update(exercise.id, {
						name: values.name,
						muscleGroup: values.muscleGroup,
						equipment: values.equipment,
						trackingType: values.trackingType,
						defaultRestSeconds: values.defaultRestSeconds,
						weightStep: values.weightStep,
						notes: values.notes,
						category:
							values.muscleGroup === 'cardio' ? 'cardio' : 'strength',
					})
					router.back()
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: 'Не удалось сохранить изменения'
					Alert.alert('Проверьте данные', message)
				}
			}}
		/>
	)
}
