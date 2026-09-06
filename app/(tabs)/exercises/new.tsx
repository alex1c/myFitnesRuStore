/**
 * Create a custom exercise.
 */
import { useRouter } from 'expo-router'
import React from 'react'
import { Alert } from 'react-native'

import { ExerciseForm } from '@/src/features/exercises/components/exercise-form'
import { useExerciseRepository } from '@/src/providers/database-provider'

export default function NewExerciseScreen () {
	const exercises = useExerciseRepository()
	const router = useRouter()

	return (
		<ExerciseForm
			submitLabel="Сохранить"
			onSubmit={async (values) => {
				try {
					const created = await exercises.create({
						name: values.name,
						muscleGroup: values.muscleGroup,
						equipment: values.equipment,
						trackingType: values.trackingType,
						defaultRestSeconds: values.defaultRestSeconds,
						weightStep: values.weightStep,
						notes: values.notes,
						category:
							values.muscleGroup === 'cardio' ? 'cardio' : 'strength',
						isCustom: true,
					})
					router.replace(`/exercises/${created.id}`)
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: 'Не удалось сохранить упражнение'
					Alert.alert('Проверьте данные', message)
				}
			}}
		/>
	)
}
