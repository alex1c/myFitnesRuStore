/**
 * Rest timer integration — workout complete/uncomplete/finish + notifications mock.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { WorkoutService } from '@/src/db/services/workout-service'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { MemoryRestNotificationClient } from '@/src/services/notifications/memory-rest-notification-client'
import { remainingMs } from '@/src/features/workout/rest-timer-logic'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	const notifications = new MemoryRestNotificationClient()
	const service = new WorkoutService(db, notifications)
	return {
		db,
		service,
		notifications,
		templates: new WorkoutTemplateRepository(db),
		exercises: new ExerciseRepository(db),
	}
}

describe('rest timer workout integration', () => {
	it('keeps a fallback alarm while exact access is declined and reconciles after access changes', async () => {
		const { db, service, notifications, templates } = await setup()
		const requestExactAlarmAccess = jest.fn(async () => {})
		Object.assign(notifications, {
			needsExactAlarmAccess: async () => true,
			requestExactAlarmAccess,
		})
		const template = await templates.create({ name: 'Exact alarm QA' })
		await templates.addExercise({ templateId: template.id, exerciseId: 'ex_sys_bench_press', plannedSets: 1, restSeconds: 90 })
		const workout = await service.startFromTemplate(template.id)
		await service.completeSet(workout.exercises[0]!.sets[0]!.id, { weight: 80, reps: 8 })
		expect(service.restTimer.consumePermissionPromptNeeded()).toBe(true)
		expect(notifications.scheduled).toHaveLength(1)
		const fireAt = notifications.scheduled[0]!.fireAt.getTime()
		await service.restTimer.requestNotificationPermission()
		expect(requestExactAlarmAccess).toHaveBeenCalledTimes(1)
		await service.restTimer.reconcileWorkout(workout.workout.id)
		expect(notifications.scheduled).toHaveLength(1)
		expect(notifications.scheduled[0]!.fireAt.getTime()).toBe(fireAt)
		await db.closeAsync()
	})

	it('explains requestable notifications once per session without blocking later sets', async () => {
		const { db, service, notifications, templates } = await setup()
		notifications.permission = 'undetermined'
		const template = await templates.create({ name: 'Permission QA' })
		await templates.addExercise({ templateId: template.id, exerciseId: 'ex_sys_bench_press', plannedSets: 2, restSeconds: 90 })
		const workout = await service.startFromTemplate(template.id)
		await service.completeSet(workout.exercises[0]!.sets[0]!.id, { weight: 80, reps: 8 })
		expect(service.restTimer.consumePermissionPromptNeeded()).toBe(true)
		expect(service.restTimer.consumePermissionPromptNeeded()).toBe(false)
		const second = await service.completeSet(workout.exercises[0]!.sets[1]!.id, { weight: 80, reps: 8 })
		expect(second.rest.timer).not.toBeNull()
		expect(service.restTimer.consumePermissionPromptNeeded()).toBe(false)
		expect(notifications.scheduled).toHaveLength(0)
		await db.closeAsync()
	})

	it('starts timer after complete set and schedules one notification', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		const setId = workout.exercises[0]!.sets[0]!.id

		const before = Date.now()
		const result = await service.completeSet(setId, {
			weight: 80,
			reps: 10,
		})
		const after = Date.now()

		expect(result.rest.timer).not.toBeNull()
		expect(result.rest.timer!.setId).toBe(setId)
		const ends = Date.parse(result.rest.timer!.endsAt)
		expect(ends).toBeGreaterThanOrEqual(before + 90_000)
		expect(ends).toBeLessThanOrEqual(after + 90_000 + 50)
		expect(notifications.scheduled).toHaveLength(1)
		expect(notifications.cancelled).toHaveLength(0)

		await db.closeAsync()
	})

	it('does not start timer on draft edit / add set', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		const setId = workout.exercises[0]!.sets[0]!.id

		await service.updateSetValues(setId, { weight: 80, reps: 8 })
		await service.addSet(workout.exercises[0]!.workoutExercise.id)

		const detail = await service.getDetail(workout.workout.id)
		expect(detail?.workout.restEndsAt).toBeNull()
		expect(notifications.scheduled).toHaveLength(0)

		await db.closeAsync()
	})

	it('replaces previous timer when another set is completed', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
			restSeconds: 120,
		})
		const workout = await service.startFromTemplate(template.id)
		const first = workout.exercises[0]!.sets[0]!
		const second = workout.exercises[0]!.sets[1]!

		await service.completeSet(first.id, { weight: 80, reps: 10 })
		const firstNotification = notifications.scheduled[0]!.identifier

		await service.completeSet(second.id, { weight: 80, reps: 9 })
		expect(notifications.cancelled).toContain(firstNotification)
		expect(notifications.scheduled).toHaveLength(1)
		expect(notifications.scheduled[0]!.identifier).not.toBe(firstNotification)

		const detail = await service.getDetail(workout.workout.id)
		expect(detail?.workout.restSetId).toBe(second.id)

		await db.closeAsync()
	})

	it('cancels timer on finish and discard', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'A' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		await service.completeSet(workout.exercises[0]!.sets[0]!.id, {
			weight: 60,
			reps: 8,
		})
		const notificationId = notifications.scheduled[0]!.identifier

		await service.finishWorkout(workout.workout.id)
		expect(notifications.cancelled).toContain(notificationId)
		const finished = await service.getDetail(workout.workout.id)
		expect(finished?.workout.restEndsAt).toBeNull()

		const templateB = await templates.create({ name: 'B' })
		await templates.addExercise({
			templateId: templateB.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})
		const second = await service.startFromTemplate(templateB.id)
		await service.completeSet(second.exercises[0]!.sets[0]!.id, {
			weight: 60,
			reps: 8,
		})
		const discardId = notifications.scheduled[0]!.identifier
		await service.discardWorkout(second.workout.id)
		expect(notifications.cancelled).toContain(discardId)

		await db.closeAsync()
	})

	it('uncomplete source set cancels timer; older set does not', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		const first = workout.exercises[0]!.sets[0]!
		const second = workout.exercises[0]!.sets[1]!

		await service.completeSet(first.id, { weight: 80, reps: 10 })
		await service.completeSet(second.id, { weight: 80, reps: 9 })
		const activeNotification = notifications.scheduled[0]!.identifier

		await service.uncompleteSet(first.id)
		expect(notifications.cancelled.filter((id) => id === activeNotification))
			.toHaveLength(0)
		let detail = await service.getDetail(workout.workout.id)
		expect(detail?.workout.restSetId).toBe(second.id)
		expect(detail?.workout.restEndsAt).not.toBeNull()

		await service.uncompleteSet(second.id)
		expect(notifications.cancelled).toContain(activeNotification)
		detail = await service.getDetail(workout.workout.id)
		expect(detail?.workout.restEndsAt).toBeNull()

		await db.closeAsync()
	})

	it('keeps snapshotted template rest after template edit', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Жим' })
		const te = await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 180,
		})
		const workout = await service.startFromTemplate(template.id)
		expect(workout.exercises[0]!.workoutExercise.restSeconds).toBe(180)

		await templates.updateExercise(te.id, { restSeconds: 60 })
		const result = await service.completeSet(
			workout.exercises[0]!.sets[0]!.id,
			{ weight: 80, reps: 8 },
		)
		const remaining = remainingMs(result.rest.timer!.endsAt, Date.now())
		expect(remaining).toBeGreaterThan(170_000)
		expect(remaining).toBeLessThanOrEqual(180_000)

		await db.closeAsync()
	})

	it('uses effective exercise rest for quick workout', async () => {
		const { db, service, exercises } = await setup()
		await exercises.update('ex_sys_bench_press', {
			defaultRestSeconds: 150,
		})
		const workout = await service.startQuickWorkout()
		await service.addExerciseToWorkout(
			workout.workout.id,
			'ex_sys_bench_press',
		)
		const detail = await service.getDetail(workout.workout.id)
		expect(detail!.exercises[0]!.workoutExercise.restSeconds).toBe(150)

		const result = await service.completeSet(
			detail!.exercises[0]!.sets[0]!.id,
			{ weight: 70, reps: 8 },
		)
		const remaining = remainingMs(result.rest.timer!.endsAt, Date.now())
		expect(remaining).toBeGreaterThan(140_000)
		expect(remaining).toBeLessThanOrEqual(150_000)

		await db.closeAsync()
	})

	it('restores active timer after reopen and clears expired', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Restore' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		const now = Date.now()
		await service.completeSet(workout.exercises[0]!.sets[0]!.id, {
			weight: 80,
			reps: 8,
		})

		const restored = await service.restTimer.reconcileWorkout(
			workout.workout.id,
			now + 30_000,
		)
		expect(restored).not.toBeNull()
		const remaining = remainingMs(restored!.endsAt, now + 30_000)
		expect(remaining).toBeGreaterThanOrEqual(59_000)
		expect(remaining).toBeLessThanOrEqual(61_000)

		const expired = await service.restTimer.reconcileWorkout(
			workout.workout.id,
			now + 120_000,
		)
		expect(expired).toBeNull()
		const detail = await service.getDetail(workout.workout.id)
		expect(detail?.workout.restEndsAt).toBeNull()

		await db.closeAsync()
	})

	it('adjust +15 / −15 reschedules notification; skip cancels', async () => {
		const { db, service, notifications, templates } = await setup()
		const template = await templates.create({ name: 'Adj' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})
		const workout = await service.startFromTemplate(template.id)
		await service.completeSet(workout.exercises[0]!.sets[0]!.id, {
			weight: 80,
			reps: 8,
		})
		const firstId = notifications.scheduled[0]!.identifier

		await service.restTimer.add15(workout.workout.id)
		expect(notifications.cancelled).toContain(firstId)
		expect(notifications.scheduled).toHaveLength(1)
		const secondId = notifications.scheduled[0]!.identifier

		await service.restTimer.minus15(workout.workout.id)
		expect(notifications.cancelled).toContain(secondId)
		expect(notifications.scheduled).toHaveLength(1)

		const skipId = notifications.scheduled[0]!.identifier
		await service.restTimer.skip(workout.workout.id)
		expect(notifications.cancelled).toContain(skipId)
		expect(notifications.scheduled).toHaveLength(0)

		await db.closeAsync()
	})
})
