/**
 * Form validation for exercise create/edit.
 */
import { validateExerciseForm } from '@/src/features/exercises/form-validation'

describe('validateExerciseForm', () => {
	it('requires a non-empty name', () => {
		const result = validateExerciseForm({
			name: '   ',
			muscleGroup: 'chest',
			equipment: 'barbell',
			trackingType: 'weight_reps',
			defaultRestSeconds: 90,
			weightStepRaw: '2,5',
			notes: '',
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors.name).toBeTruthy()
		}
	})

	it('parses decimal comma weight steps', () => {
		const result = validateExerciseForm({
			name: 'Жим',
			muscleGroup: 'chest',
			equipment: 'dumbbell',
			trackingType: 'weight_reps',
			defaultRestSeconds: 90,
			weightStepRaw: '1,25',
			notes: '',
		})
		expect(result).toEqual({ ok: true, weightStep: 1.25 })
	})

	it('skips weight step for duration tracking', () => {
		const result = validateExerciseForm({
			name: 'Планка',
			muscleGroup: 'core',
			equipment: 'bodyweight',
			trackingType: 'duration',
			defaultRestSeconds: 45,
			weightStepRaw: 'abc',
			notes: '',
		})
		expect(result).toEqual({ ok: true, weightStep: null })
	})
})
