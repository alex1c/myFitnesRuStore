/**
 * History Phase 5 — edit, delete, repeat, summaries, previous fallback.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import {
	ActiveWorkoutExistsError,
	WorkoutService,
} from '@/src/db/services/workout-service'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { MemoryRestNotificationClient } from '@/src/services/notifications/memory-rest-notification-client'
import {
	formatCompletedSetDisplay,
	formatHistoryDate,
} from '@/src/features/workout/history-format'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	const service = new WorkoutService(db, new MemoryRestNotificationClient())
	return {
		db,
		service,
		templates: new WorkoutTemplateRepository(db),
		exercises: new ExerciseRepository(db),
	}
}

async function finishTemplateWorkout (
	service: WorkoutService,
	templates: WorkoutTemplateRepository,
	name: string,
	sets: { weight: number; reps: number }[],
) {
	const template = await templates.create({ name })
	await templates.addExercise({
		templateId: template.id,
		exerciseId: 'ex_sys_bench_press',
		plannedSets: Math.max(sets.length, 1),
		restSeconds: 120,
	})
	const workout = await service.startFromTemplate(template.id)
	const we = workout.exercises[0]!
	for (let index = 0; index < sets.length; index += 1) {
		const set = we.sets[index] ?? (await service.addSet(we.workoutExercise.id))
		await service.completeSet(set.id, sets[index])
	}
	return service.finishWorkout(workout.workout.id)
}

describe('history summaries', () => {
	it('lists finished only, newest first, counts completed exercises', async () => {
		const { db, service, templates } = await setup()
		const first = await finishTemplateWorkout(service, templates, 'A', [
			{ weight: 60, reps: 8 },
		])
		const second = await finishTemplateWorkout(service, templates, 'B', [
			{ weight: 70, reps: 8 },
			{ weight: 70, reps: 7 },
		])

		const history = await service.getHistorySummaries()
		expect(history.map((item) => item.workout.id)).toEqual([
			second.workout.id,
			first.workout.id,
		])
		expect(history[0]?.completedSetCount).toBe(2)
		expect(history[0]?.exerciseCount).toBe(1)
		expect(history.every((item) => item.workout.finishedAt)).toBe(true)

		await db.closeAsync()
	})
})

describe('history edit and previous results', () => {
	it('edits completed set with decimal weight and updates previous lookup', async () => {
		const { db, service, templates } = await setup()
		const finished = await finishTemplateWorkout(service, templates, 'Жим', [
			{ weight: 180, reps: 10 },
		])
		const setId = finished.exercises[0]!.sets[0]!.id
		const completedAt = finished.exercises[0]!.sets[0]!.completedAt

		const updated = await service.updateCompletedSet(setId, {
			weight: 82.5,
			reps: 10,
		})
		expect(updated.weight).toBe(82.5)
		expect(updated.completedAt).toBe(completedAt)

		const next = await service.startFromTemplate(
			(await templates.list())[0]!.id,
		)
		const previous = next.exercises[0]!.previousSets[0]
		expect(previous?.weight).toBe(82.5)
		expect(previous?.reps).toBe(10)

		await db.closeAsync()
	})
})

describe('history delete', () => {
	it('removes workout children and falls back previous history', async () => {
		const { db, service, templates, exercises } = await setup()
		const older = await finishTemplateWorkout(service, templates, 'Old', [
			{ weight: 50, reps: 10 },
		])
		const newer = await finishTemplateWorkout(service, templates, 'New', [
			{ weight: 90, reps: 8 },
		])
		const templateId = newer.workout.templateId

		await service.deleteCompletedWorkout(newer.workout.id)
		const history = await service.getHistorySummaries()
		expect(history.map((item) => item.workout.id)).toEqual([older.workout.id])

		const template = templateId
			? await templates.getById(templateId)
			: null
		expect(template).not.toBeNull()
		const exercise = await exercises.getById('ex_sys_bench_press')
		expect(exercise).not.toBeNull()

		const active = await service.startFromTemplate(templateId!)
		expect(active.exercises[0]!.previousSets[0]?.weight).toBe(50)

		await db.closeAsync()
	})
})

describe('repeat workout', () => {
	it('creates draft rows matching completed counts with new ids', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 3,
			restSeconds: 180,
		})
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_incline_bench_press',
			plannedSets: 2,
			restSeconds: 90,
		})
		const started = await service.startFromTemplate(template.id)
		for (const block of started.exercises) {
			for (const set of block.sets) {
				await service.completeSet(set.id, { weight: 40, reps: 8 })
			}
		}
		const finished = await service.finishWorkout(started.workout.id)

		const repeated = await service.repeatWorkout(finished.workout.id)
		expect(repeated.workout.id).not.toBe(finished.workout.id)
		expect(repeated.workout.finishedAt).toBeNull()
		expect(repeated.workout.name).toBe('Грудь')
		expect(repeated.exercises).toHaveLength(2)
		expect(repeated.exercises[0]!.sets).toHaveLength(3)
		expect(repeated.exercises[1]!.sets).toHaveLength(2)
		expect(
			repeated.exercises.every((block) =>
				block.sets.every((set) => !set.completedAt),
			),
		).toBe(true)
		expect(repeated.exercises[0]!.workoutExercise.id).not.toBe(
			finished.exercises[0]!.workoutExercise.id,
		)
		expect(repeated.exercises[0]!.workoutExercise.restSeconds).toBe(180)
		expect(repeated.exercises[0]!.previousSets[0]?.weight).toBe(40)
		expect(repeated.exercises[0]!.sets[0]!.id).not.toBe(
			finished.exercises[0]!.sets[0]!.id,
		)

		await db.closeAsync()
	})

	it('blocks repeat when an active workout already exists', async () => {
		const { db, service, templates } = await setup()
		const finished = await finishTemplateWorkout(service, templates, 'Done', [
			{ weight: 60, reps: 8 },
		])
		await service.startQuickWorkout()
		await expect(
			service.repeatWorkout(finished.workout.id),
		).rejects.toBeInstanceOf(ActiveWorkoutExistsError)

		await db.closeAsync()
	})

	it('repeats with archived template and archived custom exercise', async () => {
		const { db, service, templates, exercises } = await setup()
		const custom = await exercises.create({
			name: 'Кастомный жим',
			defaultRestSeconds: 100,
		})
		const template = await templates.create({ name: 'Архивный шаблон' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: custom.id,
			plannedSets: 2,
			restSeconds: 100,
		})
		const started = await service.startFromTemplate(template.id)
		await service.completeSet(started.exercises[0]!.sets[0]!.id, {
			weight: 30,
			reps: 10,
		})
		await service.completeSet(started.exercises[0]!.sets[1]!.id, {
			weight: 30,
			reps: 9,
		})
		const finished = await service.finishWorkout(started.workout.id)

		await templates.archive(template.id)
		await exercises.archive(custom.id)

		const repeated = await service.repeatWorkout(finished.workout.id)
		expect(repeated.exercises).toHaveLength(1)
		expect(repeated.exercises[0]!.workoutExercise.exerciseId).toBe(custom.id)
		expect(repeated.exercises[0]!.sets).toHaveLength(2)
		expect(repeated.exercises[0]!.exercise?.archivedAt).not.toBeNull()

		await db.closeAsync()
	})

	it('preserves duplicate exercise rows as separate positions', async () => {
		const { db, service } = await setup()
		const quick = await service.startQuickWorkout('Дубли')
		await service.addExerciseToWorkout(
			quick.workout.id,
			'ex_sys_bench_press',
		)
		await service.addExerciseToWorkout(
			quick.workout.id,
			'ex_sys_bench_press',
		)
		const detail = await service.getDetail(quick.workout.id)
		expect(detail!.exercises).toHaveLength(2)
		await service.completeSet(detail!.exercises[0]!.sets[0]!.id, {
			weight: 60,
			reps: 8,
		})
		await service.completeSet(detail!.exercises[1]!.sets[0]!.id, {
			weight: 50,
			reps: 12,
		})
		const finished = await service.finishWorkout(quick.workout.id)

		const repeated = await service.repeatWorkout(finished.workout.id)
		expect(repeated.exercises).toHaveLength(2)
		expect(repeated.exercises[0]!.workoutExercise.exerciseId).toBe(
			'ex_sys_bench_press',
		)
		expect(repeated.exercises[1]!.workoutExercise.exerciseId).toBe(
			'ex_sys_bench_press',
		)
		expect(repeated.exercises[0]!.sets).toHaveLength(1)
		expect(repeated.exercises[1]!.sets).toHaveLength(1)

		await db.closeAsync()
	})
})

describe('history format helpers', () => {
	it('formats relative dates and tracking-specific set lines', () => {
		const now = Date.now()
		expect(formatHistoryDate(new Date(now).toISOString(), now)).toBe(
			'Сегодня',
		)
		expect(
			formatHistoryDate(
				new Date(now - 24 * 60 * 60 * 1000).toISOString(),
				now,
			),
		).toBe('Вчера')

		expect(
			formatCompletedSetDisplay(
				{
					id: '1',
					workoutExerciseId: 'w',
					position: 0,
					setType: 'working',
					weight: 80,
					reps: 10,
					durationSeconds: null,
					distance: null,
					completedAt: 'x',
					createdAt: 'x',
					updatedAt: 'x',
				},
				'weight_reps',
			),
		).toBe('80 кг × 10')

		expect(
			formatCompletedSetDisplay(
				{
					id: '2',
					workoutExerciseId: 'w',
					position: 0,
					setType: 'warmup',
					weight: 30,
					reps: 10,
					durationSeconds: null,
					distance: null,
					completedAt: 'x',
					createdAt: 'x',
					updatedAt: 'x',
				},
				'assisted_reps',
			),
		).toBe('30 кг помощи × 10 · Разминка')
	})
})
