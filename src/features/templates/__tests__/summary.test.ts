/**
 * Unit tests for template summary and validation helpers.
 */
import {
	validateTemplateExercisePlan,
	validateTemplateMeta,
} from '@/src/features/templates/form-validation'
import { defaultPlanForExercise } from '@/src/features/templates/defaults'
import {
	formatExerciseCount,
	formatSetCount,
	formatSetsRepsLine,
	formatTemplateSummary,
	totalPlannedSets,
} from '@/src/features/templates/summary'
import type { TemplateExercise } from '@/src/domain/types'

function te (
	partial: Partial<TemplateExercise> & Pick<TemplateExercise, 'id'>,
): TemplateExercise {
	return {
		templateId: 'tpl',
		exerciseId: 'ex',
		position: 0,
		plannedSets: 3,
		targetRepsMin: 8,
		targetRepsMax: 10,
		restSeconds: 90,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...partial,
	}
}

describe('template summary formatting', () => {
	it('uses correct Russian plurals', () => {
		expect(formatExerciseCount(1)).toBe('1 упражнение')
		expect(formatExerciseCount(2)).toBe('2 упражнения')
		expect(formatExerciseCount(5)).toBe('5 упражнений')
		expect(formatSetCount(1)).toBe('1 подход')
		expect(formatSetCount(3)).toBe('3 подхода')
		expect(formatSetCount(11)).toBe('11 подходов')
	})

	it('formats sets × reps and summaries', () => {
		expect(
			formatSetsRepsLine({
				plannedSets: 4,
				targetRepsMin: 8,
				targetRepsMax: 10,
				trackingType: 'weight_reps',
			}),
		).toBe('4 × 8–10')
		expect(
			formatSetsRepsLine({
				plannedSets: 3,
				targetRepsMin: 10,
				targetRepsMax: 10,
				trackingType: 'weight_reps',
			}),
		).toBe('3 × 10')
		expect(
			formatSetsRepsLine({
				plannedSets: 3,
				targetRepsMin: null,
				targetRepsMax: null,
				trackingType: 'duration',
			}),
		).toBe('3 подхода')

		const exercises = [
			te({ id: '1', plannedSets: 4 }),
			te({ id: '2', plannedSets: 3 }),
			te({ id: '3', plannedSets: 3 }),
		]
		expect(totalPlannedSets(exercises)).toBe(10)
		expect(formatTemplateSummary(exercises)).toBe(
			'3 упражнения • 10 подходов',
		)
		expect(formatTemplateSummary([])).toBe('Упражнения не добавлены')
	})
})

describe('template validation and defaults', () => {
	it('rejects whitespace names and invalid plans', () => {
		expect(validateTemplateMeta({ name: '  ' }).ok).toBe(false)
		expect(
			validateTemplateExercisePlan({
				plannedSets: 0,
				targetRepsMin: 8,
				targetRepsMax: 10,
				restSeconds: 90,
				usesReps: true,
			}).ok,
		).toBe(false)
		expect(
			validateTemplateExercisePlan({
				plannedSets: 3,
				targetRepsMin: 12,
				targetRepsMax: 8,
				restSeconds: 90,
				usesReps: true,
			}).ok,
		).toBe(false)
	})

	it('builds sensible defaults by tracking type', () => {
		expect(
			defaultPlanForExercise({
				trackingType: 'weight_reps',
				defaultRestSeconds: 150,
			}),
		).toEqual({
			plannedSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: 150,
		})
		expect(
			defaultPlanForExercise({
				trackingType: 'duration',
				defaultRestSeconds: 45,
			}),
		).toEqual({
			plannedSets: 3,
			targetRepsMin: null,
			targetRepsMax: null,
			restSeconds: 45,
		})
	})
})
