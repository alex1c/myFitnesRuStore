/**
 * Active workout service tests — start, sets, previous, finish, discard.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import {
	ActiveWorkoutExistsError,
	WorkoutService,
} from '@/src/db/services/workout-service'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	return {
		db,
		service: new WorkoutService(db),
		exercises: new ExerciseRepository(db),
		templates: new WorkoutTemplateRepository(db),
	}
}

describe('start workout', () => {
	it('starts from template and blocks a second active workout', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 10,
			restSeconds: 120,
		})

		const first = await service.startFromTemplate(template.id)
		expect(first.workout.finishedAt).toBeNull()
		expect(first.workout.templateId).toBe(template.id)
		expect(first.exercises).toHaveLength(1)
		expect(first.exercises[0]?.sets).toHaveLength(3)
		expect(first.exercises[0]?.sets.every((set) => !set.completedAt)).toBe(
			true,
		)

		await expect(service.startQuickWorkout()).rejects.toBeInstanceOf(
			ActiveWorkoutExistsError,
		)

		await db.closeAsync()
	})

	it('keeps active workout independent from later template edits', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Спина' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_pull_up',
			plannedSets: 2,
		})

		const active = await service.startFromTemplate(template.id)
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_seated_cable_row',
			plannedSets: 3,
		})
		await templates.update(template.id, { name: 'Спина B' })

		const again = await service.getDetail(active.workout.id)
		expect(again?.workout.name).toBe('Спина')
		expect(again?.exercises).toHaveLength(1)
		expect(again?.exercises[0]?.workoutExercise.exerciseId).toBe(
			'ex_sys_pull_up',
		)

		await db.closeAsync()
	})
})

describe('sets and previous results', () => {
	it('completes sets, autofills next, and restores after reopen', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Жим' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
		})

		const workout = await service.startFromTemplate(template.id)
		const weId = workout.exercises[0]!.workoutExercise.id
		const set1 = workout.exercises[0]!.sets[0]!

		await service.completeSet(set1.id, {
			weight: 82.5,
			reps: 10,
		})

		const afterFirst = await service.getDetail(workout.workout.id)
		expect(afterFirst?.exercises[0]?.sets[0]?.completedAt).not.toBeNull()
		expect(afterFirst?.exercises[0]?.sets[0]?.weight).toBe(82.5)

		const added = await service.addSet(weId)
		expect(added.weight).toBe(82.5)
		expect(added.reps).toBe(10)

		await service.completeSet(added.id, { weight: 82.5, reps: 9 })
		await service.finishWorkout(workout.workout.id)

		const second = await service.startFromTemplate(template.id)
		expect(second.exercises[0]?.previousSets).toHaveLength(2)
		expect(second.exercises[0]?.previousSets[0]?.weight).toBe(82.5)
		expect(second.exercises[0]?.sets[0]?.weight).toBe(82.5)
		expect(second.exercises[0]?.sets[0]?.reps).toBe(10)
		expect(second.exercises[0]?.sets[1]?.reps).toBe(9)

		const restored = await service.getActiveDetail()
		expect(restored?.workout.id).toBe(second.workout.id)
		expect(restored?.exercises[0]?.sets).toHaveLength(2)

		await db.closeAsync()
	})

	it('does not use active workout as previous history', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Тест' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_db_curl',
			plannedSets: 1,
		})
		const active = await service.startFromTemplate(template.id)
		const setId = active.exercises[0]!.sets[0]!.id
		await service.completeSet(setId, { weight: 20, reps: 12 })

		const previous = await service.workouts.findPreviousCompletedSets(
			'ex_sys_db_curl',
			active.workout.startedAt,
		)
		expect(previous).toHaveLength(0)

		await db.closeAsync()
	})

	it('keeps previous results for archived custom exercises', async () => {
		const { db, service, exercises, templates } = await setup()
		const custom = await exercises.create({
			name: 'Мой жим',
			trackingType: 'weight_reps',
		})
		const template = await templates.create({ name: 'Дома' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: custom.id,
			plannedSets: 1,
		})

		const first = await service.startFromTemplate(template.id)
		await service.completeSet(first.exercises[0]!.sets[0]!.id, {
			weight: 40,
			reps: 8,
		})
		await service.finishWorkout(first.workout.id)
		await exercises.archive(custom.id)

		const second = await service.startFromTemplate(template.id)
		expect(second.exercises[0]?.previousSets[0]?.weight).toBe(40)

		await db.closeAsync()
	})
})

describe('mutations finish discard history', () => {
	it('adds/reorders/removes exercises and finishes into history', async () => {
		const { db, service } = await setup()
		const quick = await service.startQuickWorkout()
		await service.addExerciseToWorkout(quick.workout.id, 'ex_sys_plank')
		await service.addExerciseToWorkout(
			quick.workout.id,
			'ex_sys_crunch',
		)

		let detail = await service.getDetail(quick.workout.id)
		expect(detail?.exercises).toHaveLength(2)

		detail = await service.moveExercise(
			detail!.exercises[1]!.workoutExercise.id,
			'up',
		)
		expect(detail.exercises[0]?.workoutExercise.exerciseId).toBe(
			'ex_sys_crunch',
		)

		await service.removeExerciseFromWorkout(
			detail.exercises[1]!.workoutExercise.id,
		)
		detail = await service.getDetail(quick.workout.id)
		expect(detail?.exercises).toHaveLength(1)

		const setId = detail!.exercises[0]!.sets[0]!.id
		await service.completeSet(setId, { reps: 15 })
		await service.addSet(detail!.exercises[0]!.workoutExercise.id)

		const finished = await service.finishWorkout(quick.workout.id)
		expect(finished.workout.finishedAt).not.toBeNull()
		expect(await service.getActiveDetail()).toBeNull()

		const history = await service.getHistorySummaries()
		expect(history[0]?.workout.id).toBe(finished.workout.id)
		expect(history[0]?.completedSetCount).toBe(1)

		await db.closeAsync()
	})

	it('discards active workout without touching history', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'A' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_back_squat',
			plannedSets: 1,
		})

		const done = await service.startFromTemplate(template.id)
		await service.completeSet(done.exercises[0]!.sets[0]!.id, {
			weight: 100,
			reps: 5,
		})
		await service.finishWorkout(done.workout.id)

		const active = await service.startQuickWorkout()
		await service.addExerciseToWorkout(active.workout.id, 'ex_sys_plank')
		await service.discardWorkout(active.workout.id)

		expect(await service.getActiveDetail()).toBeNull()
		const history = await service.getHistorySummaries()
		expect(history).toHaveLength(1)
		expect(history[0]?.workout.id).toBe(done.workout.id)

		await db.closeAsync()
	})

	it('replace without completed sets swaps exercise id', async () => {
		const { db, service } = await setup()
		const quick = await service.startQuickWorkout()
		const added = await service.addExerciseToWorkout(
			quick.workout.id,
			'ex_sys_bench_press',
		)
		const result = await service.replaceOrAddExercise(
			added.workoutExercise.id,
			'ex_sys_db_bench_press',
		)
		expect(result.mode).toBe('replaced')
		expect(
			result.detail.exercises[0]?.workoutExercise.exerciseId,
		).toBe('ex_sys_db_bench_press')
		await db.closeAsync()
	})
})
