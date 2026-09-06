/**
 * Workout business logic — start, previous results, autofill, finish, discard.
 * Testable without React Native UI.
 */
import type {
	Exercise,
	UpdateSetInput,
	Workout,
	WorkoutDetail,
	WorkoutExerciseWithSets,
	WorkoutSet,
} from '@/src/domain/types'
import { DEFAULT_SET_TYPE } from '@/src/domain/constants'
import { usesRepTargets } from '@/src/features/templates/summary'
import type { AppDatabase } from '../client'
import { ExerciseRepository } from '../repositories/exercise-repository'
import { WorkoutTemplateRepository } from '../repositories/workout-template-repository'
import { WorkoutRepository } from '../repositories/workout-repository'
import { nowIso } from '@/src/utils/dates'
import {
	buildAutofillValues,
	validateSetCompletion,
} from '@/src/features/workout/set-logic'

export class ActiveWorkoutExistsError extends Error {
	constructor (public readonly activeWorkout: Workout) {
		super('ACTIVE_WORKOUT_EXISTS')
		this.name = 'ActiveWorkoutExistsError'
	}
}

export class WorkoutService {
	readonly workouts: WorkoutRepository
	readonly exercises: ExerciseRepository
	readonly templates: WorkoutTemplateRepository

	constructor (private readonly db: AppDatabase) {
		this.workouts = new WorkoutRepository(db)
		this.exercises = new ExerciseRepository(db)
		this.templates = new WorkoutTemplateRepository(db)
	}

	async getActiveDetail (): Promise<WorkoutDetail | null> {
		const active = await this.workouts.getActiveWorkout()
		if (!active) {
			return null
		}
		return this.getDetail(active.id)
	}

	async getDetail (workoutId: string): Promise<WorkoutDetail | null> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout) {
			return null
		}

		const workoutExercises =
			await this.workouts.listWorkoutExercises(workoutId)
		const exercises: WorkoutExerciseWithSets[] = []

		for (const workoutExercise of workoutExercises) {
			const exercise = await this.exercises.getById(
				workoutExercise.exerciseId,
			)
			const sets = await this.workouts.listSets(workoutExercise.id)
			const previousSets = await this.workouts.findPreviousCompletedSets(
				workoutExercise.exerciseId,
				workout.startedAt,
			)
			exercises.push({
				workoutExercise,
				exercise,
				sets,
				previousSets,
			})
		}

		return { workout, exercises }
	}

	async startFromTemplate (templateId: string): Promise<WorkoutDetail> {
		const detail = await this.templates.getDetail(templateId)
		if (!detail) {
			throw new Error('Шаблон не найден')
		}

		let workoutId = ''
		await this.db.withTransactionAsync(async () => {
			await this.ensureNoActiveWorkout()
			const workout = await this.workouts.createWorkout({
				name: detail.template.name,
				templateId: detail.template.id,
			})
			workoutId = workout.id

			for (const templateExercise of detail.exercises) {
				const exercise = await this.exercises.getById(
					templateExercise.exerciseId,
				)
				const workoutExercise = await this.workouts.addWorkoutExercise({
					workoutId: workout.id,
					exerciseId: templateExercise.exerciseId,
				})

				const previous = await this.workouts.findPreviousCompletedSets(
					templateExercise.exerciseId,
					workout.startedAt,
				)
				const planned = Math.max(templateExercise.plannedSets ?? 3, 1)

				for (let index = 0; index < planned; index += 1) {
					const autofill = buildAutofillValues({
						trackingType: exercise?.trackingType ?? 'weight_reps',
						currentCompletedSets: [],
						previousSets: previous,
						nextIndex: index,
					})
					await this.workouts.createSet({
						workoutExerciseId: workoutExercise.id,
						position: index,
						setType: DEFAULT_SET_TYPE,
						...autofill,
						completedAt: null,
					})
				}
			}
		})

		const created = await this.getDetail(workoutId)
		if (!created) {
			throw new Error('Не удалось открыть тренировку')
		}
		return created
	}

	async startQuickWorkout (
		name = 'Свободная тренировка',
	): Promise<WorkoutDetail> {
		let workoutId = ''
		await this.db.withTransactionAsync(async () => {
			await this.ensureNoActiveWorkout()
			const workout = await this.workouts.createWorkout({ name })
			workoutId = workout.id
		})
		const detail = await this.getDetail(workoutId)
		if (!detail) {
			throw new Error('Не удалось открыть тренировку')
		}
		return detail
	}

	async addExerciseToWorkout (
		workoutId: string,
		exerciseId: string,
	): Promise<WorkoutExerciseWithSets> {
		const workout = await this.requireActive(workoutId)
		const exercise = await this.exercises.getById(exerciseId)
		if (!exercise || exercise.archivedAt) {
			throw new Error('Упражнение недоступно')
		}

		let workoutExercise!: Awaited<
			ReturnType<WorkoutRepository['addWorkoutExercise']>
		>
		let previous: WorkoutSet[] = []
		await this.db.withTransactionAsync(async () => {
			workoutExercise = await this.workouts.addWorkoutExercise({
				workoutId,
				exerciseId,
			})
			previous = await this.workouts.findPreviousCompletedSets(
				exerciseId,
				workout.startedAt,
			)
			const autofill = buildAutofillValues({
				trackingType: exercise.trackingType,
				currentCompletedSets: [],
				previousSets: previous,
				nextIndex: 0,
			})
			await this.workouts.createSet({
				workoutExerciseId: workoutExercise.id,
				position: 0,
				setType: DEFAULT_SET_TYPE,
				...autofill,
				completedAt: null,
			})
		})
		const sets = await this.workouts.listSets(workoutExercise.id)
		return {
			workoutExercise,
			exercise,
			sets,
			previousSets: previous,
		}
	}

	async removeExerciseFromWorkout (
		workoutExerciseId: string,
		options?: { force?: boolean },
	): Promise<void> {
		const we = await this.workouts.getWorkoutExerciseById(workoutExerciseId)
		if (!we) {
			throw new Error('Упражнение в тренировке не найдено')
		}
		await this.requireActive(we.workoutId)

		const completed =
			await this.workouts.countCompletedSetsForExercise(workoutExerciseId)
		if (completed > 0 && !options?.force) {
			throw new Error('HAS_COMPLETED_SETS')
		}

		await this.workouts.deleteWorkoutExercise(workoutExerciseId)
	}

	/**
	 * Replace exercise only when there are no completed sets.
	 * Otherwise add the new exercise below and leave the old one.
	 */
	async replaceOrAddExercise (
		workoutExerciseId: string,
		newExerciseId: string,
	): Promise<{ mode: 'replaced' | 'added'; detail: WorkoutDetail }> {
		const we = await this.workouts.getWorkoutExerciseById(workoutExerciseId)
		if (!we) {
			throw new Error('Упражнение в тренировке не найдено')
		}
		await this.requireActive(we.workoutId)

		const newExercise = await this.exercises.getById(newExerciseId)
		if (!newExercise || newExercise.archivedAt) {
			throw new Error('Упражнение недоступно')
		}

		const completed =
			await this.workouts.countCompletedSetsForExercise(workoutExerciseId)

		if (completed === 0) {
			await this.workouts.updateWorkoutExercise(workoutExerciseId, {
				exerciseId: newExerciseId,
			})
			const sets = await this.workouts.listSets(workoutExerciseId)
			const previous = await this.workouts.findPreviousCompletedSets(
				newExerciseId,
				(await this.workouts.getWorkoutById(we.workoutId))!.startedAt,
			)
			// Refresh draft autofill for first incomplete set if needed
			for (let index = 0; index < sets.length; index += 1) {
				const set = sets[index]
				if (!set || set.completedAt) {
					continue
				}
				const autofill = buildAutofillValues({
					trackingType: newExercise.trackingType,
					currentCompletedSets: sets.filter((item) => item.completedAt),
					previousSets: previous,
					nextIndex: index,
				})
				await this.workouts.updateSet(set.id, autofill)
			}
			const detail = await this.getDetail(we.workoutId)
			return { mode: 'replaced', detail: detail! }
		}

		await this.addExerciseToWorkout(we.workoutId, newExerciseId)
		const detail = await this.getDetail(we.workoutId)
		return { mode: 'added', detail: detail! }
	}

	async moveExercise (
		workoutExerciseId: string,
		direction: 'up' | 'down',
	): Promise<WorkoutDetail> {
		const we = await this.workouts.getWorkoutExerciseById(workoutExerciseId)
		if (!we) {
			throw new Error('Упражнение в тренировке не найдено')
		}
		await this.requireActive(we.workoutId)

		const list = await this.workouts.listWorkoutExercises(we.workoutId)
		const index = list.findIndex((item) => item.id === workoutExerciseId)
		const swapWith = direction === 'up' ? index - 1 : index + 1
		if (index < 0 || swapWith < 0 || swapWith >= list.length) {
			return (await this.getDetail(we.workoutId))!
		}

		const ordered = list.map((item) => item.id)
		const current = ordered[index]
		const other = ordered[swapWith]
		if (!current || !other) {
			return (await this.getDetail(we.workoutId))!
		}
		ordered[index] = other
		ordered[swapWith] = current
		await this.workouts.reorderWorkoutExercises(we.workoutId, ordered)
		return (await this.getDetail(we.workoutId))!
	}

	async updateExerciseNotes (
		workoutExerciseId: string,
		notes: string | null,
	): Promise<void> {
		const we = await this.workouts.getWorkoutExerciseById(workoutExerciseId)
		if (!we) {
			throw new Error('Упражнение в тренировке не найдено')
		}
		await this.requireActive(we.workoutId)
		await this.workouts.updateWorkoutExercise(workoutExerciseId, { notes })
	}

	async addSet (workoutExerciseId: string): Promise<WorkoutSet> {
		const we = await this.workouts.getWorkoutExerciseById(workoutExerciseId)
		if (!we) {
			throw new Error('Упражнение в тренировке не найдено')
		}
		const workout = await this.requireActive(we.workoutId)
		const exercise = await this.exercises.getById(we.exerciseId)
		const sets = await this.workouts.listSets(workoutExerciseId)
		const previous = await this.workouts.findPreviousCompletedSets(
			we.exerciseId,
			workout.startedAt,
		)
		const nextIndex = sets.length
		const autofill = buildAutofillValues({
			trackingType: exercise?.trackingType ?? 'weight_reps',
			currentCompletedSets: sets.filter((item) => item.completedAt),
			previousSets: previous,
			nextIndex,
		})

		return this.workouts.createSet({
			workoutExerciseId,
			position: nextIndex,
			setType: DEFAULT_SET_TYPE,
			...autofill,
			completedAt: null,
		})
	}

	async updateSetValues (
		setId: string,
		input: UpdateSetInput,
	): Promise<WorkoutSet> {
		const set = await this.workouts.getSetById(setId)
		if (!set) {
			throw new Error('Подход не найден')
		}
		const we = await this.workouts.getWorkoutExerciseById(
			set.workoutExerciseId,
		)
		if (!we) {
			throw new Error('Упражнение не найдено')
		}
		await this.requireActive(we.workoutId)
		return this.workouts.updateSet(setId, input)
	}

	async completeSet (
		setId: string,
		values?: UpdateSetInput,
	): Promise<WorkoutSet> {
		const set = await this.workouts.getSetById(setId)
		if (!set) {
			throw new Error('Подход не найден')
		}
		const we = await this.workouts.getWorkoutExerciseById(
			set.workoutExerciseId,
		)
		if (!we) {
			throw new Error('Упражнение не найдено')
		}
		await this.requireActive(we.workoutId)
		const exercise = await this.exercises.getById(we.exerciseId)

		const next = {
			...set,
			...values,
		}
		validateSetCompletion({
			trackingType: exercise?.trackingType ?? 'weight_reps',
			weight: next.weight ?? null,
			reps: next.reps ?? null,
			durationSeconds: next.durationSeconds ?? null,
			distance: next.distance ?? null,
		})

		return this.workouts.updateSet(setId, {
			...values,
			completedAt: nowIso(),
		})
	}

	async uncompleteSet (setId: string): Promise<WorkoutSet> {
		const set = await this.workouts.getSetById(setId)
		if (!set) {
			throw new Error('Подход не найден')
		}
		const we = await this.workouts.getWorkoutExerciseById(
			set.workoutExerciseId,
		)
		if (!we) {
			throw new Error('Упражнение не найдено')
		}
		await this.requireActive(we.workoutId)
		return this.workouts.updateSet(setId, { completedAt: null })
	}

	async removeSet (setId: string): Promise<void> {
		const set = await this.workouts.getSetById(setId)
		if (!set) {
			throw new Error('Подход не найден')
		}
		const we = await this.workouts.getWorkoutExerciseById(
			set.workoutExerciseId,
		)
		if (!we) {
			throw new Error('Упражнение не найдено')
		}
		await this.requireActive(we.workoutId)
		await this.workouts.deleteSet(setId)
	}

	async finishWorkout (workoutId: string): Promise<WorkoutDetail> {
		await this.requireActive(workoutId)
		await this.workouts.updateWorkout(workoutId, {
			finishedAt: nowIso(),
		})
		const detail = await this.getDetail(workoutId)
		if (!detail) {
			throw new Error('Тренировка не найдена')
		}
		return detail
	}

	async discardWorkout (workoutId: string): Promise<void> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout) {
			throw new Error('Тренировка не найдена')
		}
		if (workout.finishedAt) {
			throw new Error('Нельзя отменить завершённую тренировку')
		}
		await this.workouts.deleteWorkout(workoutId)
	}

	async getHistorySummaries (): Promise<{
		workout: Workout
		exerciseCount: number
		completedSetCount: number
	}[]> {
		const workouts = await this.workouts.listCompleted()
		const result = []
		for (const workout of workouts) {
			const exercises = await this.workouts.listWorkoutExercises(workout.id)
			const completedSetCount =
				await this.workouts.countCompletedSetsInWorkout(workout.id)
			result.push({
				workout,
				exerciseCount: exercises.length,
				completedSetCount,
			})
		}
		return result
	}

	private async ensureNoActiveWorkout (): Promise<void> {
		const active = await this.workouts.getActiveWorkout()
		if (active) {
			throw new ActiveWorkoutExistsError(active)
		}
	}

	private async requireActive (workoutId: string): Promise<Workout> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout) {
			throw new Error('Тренировка не найдена')
		}
		if (workout.finishedAt) {
			throw new Error('Тренировка уже завершена')
		}
		return workout
	}
}

export function createWorkoutService (db: AppDatabase): WorkoutService {
	return new WorkoutService(db)
}

/** Whether tracking type needs reps for completion UX. */
export function exerciseUsesReps (exercise: Exercise | null): boolean {
	if (!exercise) {
		return true
	}
	return usesRepTargets(exercise.trackingType)
}
