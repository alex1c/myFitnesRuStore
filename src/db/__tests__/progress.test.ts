/**
 * Progress service — summaries, series, PR, edit/delete recalculation.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { WorkoutService } from '@/src/db/services/workout-service'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'
import { MemoryRestNotificationClient } from '@/src/services/notifications/memory-rest-notification-client'
import { estimateE1rm, roundE1rm } from '@/src/features/progress/metrics'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	const service = new WorkoutService(db, new MemoryRestNotificationClient())
	return {
		db,
		service,
		templates: new WorkoutTemplateRepository(db),
	}
}

async function seedThreeWorkouts (service: WorkoutService, templates: WorkoutTemplateRepository) {
	const template = await templates.create({ name: 'Жим' })
	await templates.addExercise({
		templateId: template.id,
		exerciseId: 'ex_sys_bench_press',
		plannedSets: 2,
		restSeconds: 120,
	})

	const days = [
		[
			{ weight: 80, reps: 10 },
			{ weight: 80, reps: 8 },
		],
		[
			{ weight: 82.5, reps: 10 },
			{ weight: 82.5, reps: 9 },
		],
		[
			{ weight: 85, reps: 8 },
			{ weight: 90, reps: 3 },
		],
	] as const

	const finishedIds: string[] = []
	for (let index = 0; index < days.length; index += 1) {
		const started = await service.startFromTemplate(template.id)
		const we = started.exercises[0]!
		const pairs = days[index]!
		for (let setIndex = 0; setIndex < pairs.length; setIndex += 1) {
			const set = we.sets[setIndex] ?? (await service.addSet(we.workoutExercise.id))
			await service.completeSet(set.id, pairs[setIndex])
		}
		const finished = await service.finishWorkout(started.workout.id)
		// Force distinct finished_at spacing for period-filter tests.
		const stamp = new Date(
			Date.UTC(2026, 0, 1, 12, 0, 0) + index * 40 * 24 * 60 * 60 * 1000,
		).toISOString()
		await dbRunFinishedAt(service, finished.workout.id, stamp)
		finishedIds.push(finished.workout.id)
	}

	return { templateId: template.id, finishedIds }
}

async function dbRunFinishedAt (
	service: WorkoutService,
	workoutId: string,
	finishedAt: string,
) {
	await service.workouts.updateWorkout(workoutId, { finishedAt })
}

describe('progress overall and exercise analytics', () => {
	it('computes volume, max weight, e1RM and chart series', async () => {
		const { db, service, templates } = await setup()
		await seedThreeWorkouts(service, templates)

		const overall = await service.progress.getOverallSummary(null)
		expect(overall.workoutCount).toBe(3)
		expect(overall.completedSetCount).toBe(6)
		expect(overall.weightedVolumeKg).toBe(
			80 * 10 + 80 * 8 + 82.5 * 10 + 82.5 * 9 + 85 * 8 + 90 * 3,
		)

		const summary = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			null,
		)
		expect(summary?.maxWeightKg).toBe(90)
		expect(summary?.bestE1rmKg).toBe(
			roundE1rm(estimateE1rm(82.5, 10)!),
		)
		expect(summary?.series.weight.map((point) => point.value)).toEqual([
			80, 82.5, 90,
		])
		expect(summary?.series.volume).toHaveLength(3)
		expect(summary?.series.e1rm).toHaveLength(3)

		const filtered = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			30,
			Date.UTC(2026, 0, 1, 12, 0, 0) + 85 * 24 * 60 * 60 * 1000,
		)
		expect(filtered?.series.weight).toHaveLength(1)
		expect(filtered?.series.weight[0]?.value).toBe(90)

		await db.closeAsync()
	})
})

describe('personal records', () => {
	it('does not celebrate the first set, then detects weight and e1RM PRs', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'PR' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 3,
			restSeconds: 90,
		})
		const firstWorkout = await service.startFromTemplate(template.id)
		const first = await service.completeSet(
			firstWorkout.exercises[0]!.sets[0]!.id,
			{ weight: 100, reps: 1 },
		)
		expect(first.records[0]?.celebrate).toBe(false)
		await service.finishWorkout(firstWorkout.workout.id)

		const secondWorkout = await service.startFromTemplate(template.id)
		const higherWeight = await service.completeSet(
			secondWorkout.exercises[0]!.sets[0]!.id,
			{ weight: 105, reps: 1 },
		)
		expect(higherWeight.records.some((item) => item.celebrate)).toBe(true)
		expect(
			higherWeight.records.some(
				(item) => item.kind === 'weight' || item.kind === 'e1rm',
			),
		).toBe(true)

		const equal = await service.completeSet(
			secondWorkout.exercises[0]!.sets[1]!.id,
			{ weight: 105, reps: 1 },
		)
		expect(equal.records.some((item) => item.celebrate)).toBe(false)

		const e1rmPr = await service.completeSet(
			secondWorkout.exercises[0]!.sets[2]!.id,
			{ weight: 90, reps: 10 },
		)
		expect(e1rmPr.records.some((item) => item.kind === 'e1rm')).toBe(true)

		await db.closeAsync()
	})

	it('recalculates after history edit and delete', async () => {
		const { db, service, templates } = await setup()
		const template = await templates.create({ name: 'Edit' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
			restSeconds: 90,
		})

		const w1 = await service.startFromTemplate(template.id)
		await service.completeSet(w1.exercises[0]!.sets[0]!.id, {
			weight: 180,
			reps: 1,
		})
		const finished1 = await service.finishWorkout(w1.workout.id)

		const w2 = await service.startFromTemplate(template.id)
		await service.completeSet(w2.exercises[0]!.sets[0]!.id, {
			weight: 100,
			reps: 1,
		})
		await service.finishWorkout(w2.workout.id)

		let summary = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			null,
		)
		expect(summary?.maxWeightKg).toBe(180)

		await service.updateCompletedSet(finished1.exercises[0]!.sets[0]!.id, {
			weight: 80,
			reps: 1,
		})
		summary = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			null,
		)
		expect(summary?.maxWeightKg).toBe(100)

		await service.deleteCompletedWorkout(finished1.workout.id)
		// Delete the 80kg workout; remaining max should stay 100.
		summary = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			null,
		)
		expect(summary?.maxWeightKg).toBe(100)

		const remaining = await service.getHistorySummaries()
		await service.deleteCompletedWorkout(remaining[0]!.workout.id)
		summary = await service.progress.getExerciseSummary(
			'ex_sys_bench_press',
			null,
		)
		expect(summary?.maxWeightKg).toBeNull()

		await db.closeAsync()
	})
})

describe('non-weight tracking progress', () => {
	it('tracks max reps and duration', async () => {
		const { db, service } = await setup()
		const pull = await service.startQuickWorkout()
		await service.addExerciseToWorkout(pull.workout.id, 'ex_sys_pull_up')
		let detail = await service.getDetail(pull.workout.id)
		await service.completeSet(detail!.exercises[0]!.sets[0]!.id, {
			reps: 10,
		})
		await service.addSet(detail!.exercises[0]!.workoutExercise.id)
		detail = await service.getDetail(pull.workout.id)
		await service.completeSet(detail!.exercises[0]!.sets[1]!.id, {
			reps: 12,
		})
		await service.finishWorkout(pull.workout.id)

		const pullSummary = await service.progress.getExerciseSummary(
			'ex_sys_pull_up',
			null,
		)
		expect(pullSummary?.maxReps).toBe(12)

		const plank = await service.startQuickWorkout('Планка')
		await service.addExerciseToWorkout(plank.workout.id, 'ex_sys_plank')
		detail = await service.getDetail(plank.workout.id)
		await service.completeSet(detail!.exercises[0]!.sets[0]!.id, {
			durationSeconds: 60,
		})
		await service.addSet(detail!.exercises[0]!.workoutExercise.id)
		detail = await service.getDetail(plank.workout.id)
		await service.completeSet(detail!.exercises[0]!.sets[1]!.id, {
			durationSeconds: 75,
		})
		await service.finishWorkout(plank.workout.id)

		const plankSummary = await service.progress.getExerciseSummary(
			'ex_sys_plank',
			null,
		)
		expect(plankSummary?.maxDurationSeconds).toBe(75)

		await db.closeAsync()
	})
})
