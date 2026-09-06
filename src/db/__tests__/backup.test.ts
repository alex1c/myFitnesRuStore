/**
 * Backup roundtrip, restore atomicity, CSV integration, and previous-results regression.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { BackupService } from '@/src/db/services/backup-service'
import { WorkoutService } from '@/src/db/services/workout-service'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'
import { MemoryRestNotificationClient } from '@/src/services/notifications/memory-rest-notification-client'
import { BackupValidationError } from '@/src/features/backup/types'
import { parseBackupJson } from '@/src/features/backup/validate'
import { CSV_DELIMITER, CSV_HEADERS } from '@/src/features/backup/csv'
import {
	BUILTIN_EXERCISE_SEED_VERSION,
} from '@/src/db/seed/builtin-exercises'
import { getBuiltinSeedVersion } from '@/src/db/seed/seed-builtin-exercises'
import type { FitnessBackupV1 } from '@/src/features/backup/types'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	const notifications = new MemoryRestNotificationClient()
	const workouts = new WorkoutService(db, notifications)
	const backup = new BackupService(db)
	return {
		db,
		backup,
		workouts,
		notifications,
		exercises: new ExerciseRepository(db),
		templates: new WorkoutTemplateRepository(db),
	}
}

/** Compare user-facing backup payload while ignoring runtime notification ids. */
function normalizeForCompare (backup: FitnessBackupV1) {
	return {
		...backup.data,
		workouts: backup.data.workouts.map((workout) => ({
			...workout,
			restNotificationId: null,
		})),
	}
}

async function buildComplexFixture () {
	const ctx = await setup()
	const { exercises, templates, workouts } = ctx

	// Built-in override settings.
	await exercises.update('ex_sys_bench_press', {
		defaultRestSeconds: 150,
		weightStep: 1.25,
		notes: 'Сиденье 4\nузкий хват',
	})

	const custom = await exercises.create({
		name: 'Мой жим гантелей',
		trackingType: 'weight_reps',
		defaultRestSeconds: 100,
		weightStep: 2.5,
		notes: 'Плечо, чуть болело',
	})
	const archivedCustom = await exercises.create({
		name: 'Старое упражнение',
		trackingType: 'bodyweight_reps',
	})
	await exercises.archive(archivedCustom.id)

	const template = await templates.create({
		name: 'Грудь A',
		description: 'Основной шаблон',
	})
	await templates.addExercise({
		templateId: template.id,
		exerciseId: 'ex_sys_bench_press',
		plannedSets: 2,
		targetRepsMin: 8,
		targetRepsMax: 10,
		restSeconds: 120,
	})
	await templates.addExercise({
		templateId: template.id,
		exerciseId: custom.id,
		plannedSets: 1,
		restSeconds: 90,
	})

	const archivedTemplate = await templates.create({ name: 'Архив шаблон' })
	await templates.addExercise({
		templateId: archivedTemplate.id,
		exerciseId: 'ex_sys_push_up',
		plannedSets: 1,
	})
	await templates.archive(archivedTemplate.id)

	// Completed workout with mixed tracking types.
	const finished = await workouts.startFromTemplate(template.id)
	await workouts.workouts.updateWorkout(finished.workout.id, {
		notes: 'Хорошая сессия; без спешки',
	})
	// Force historical timestamps via SQL (repository update does not expose startedAt).
	await ctx.db.runAsync(
		`UPDATE workouts SET started_at = ?, finished_at = NULL, updated_at = ? WHERE id = ?`,
		[
			'2026-08-01T10:00:00.000Z',
			'2026-08-01T10:00:00.000Z',
			finished.workout.id,
		],
	)
	const benchWe = finished.exercises[0]!
	const customWe = finished.exercises[1]!
	await workouts.completeSet(benchWe.sets[0]!.id, {
		weight: 82.5,
		reps: 10,
		setType: 'warmup',
	})
	await workouts.completeSet(benchWe.sets[1]!.id, {
		weight: 100,
		reps: 8,
	})
	// Leave one draft set on custom exercise by adding then not completing.
	await workouts.addSet(customWe.workoutExercise.id)
	await workouts.completeSet(customWe.sets[0]!.id, {
		weight: 30,
		reps: 12,
	})
	await workouts.finishWorkout(finished.workout.id)
	await ctx.db.runAsync(
		`UPDATE workouts SET started_at = ?, finished_at = ?, updated_at = ? WHERE id = ?`,
		[
			'2026-08-01T10:00:00.000Z',
			'2026-08-01T11:00:00.000Z',
			'2026-08-01T11:00:00.000Z',
			finished.workout.id,
		],
	)
	// Second finished workout: bodyweight / assisted / duration / distance.
	const quick = await workouts.startQuickWorkout('Разное')
	await workouts.addExerciseToWorkout(quick.workout.id, 'ex_sys_push_up')
	await workouts.addExerciseToWorkout(
		quick.workout.id,
		'ex_sys_assisted_pull_up',
	)
	// Find a duration and distance exercise from catalog if present.
	const plank = await exercises.getById('ex_sys_plank')
	const run = await exercises.getById('ex_sys_treadmill')
	if (plank) {
		await workouts.addExerciseToWorkout(quick.workout.id, plank.id)
	}
	if (run) {
		await workouts.addExerciseToWorkout(quick.workout.id, run.id)
	}
	const detail = await workouts.getDetail(quick.workout.id)
	const push = detail!.exercises.find(
		(item) => item.workoutExercise.exerciseId === 'ex_sys_push_up',
	)!
	const assisted = detail!.exercises.find(
		(item) => item.workoutExercise.exerciseId === 'ex_sys_assisted_pull_up',
	)!
	await workouts.completeSet(push.sets[0]!.id, { reps: 20 })
	await workouts.completeSet(assisted.sets[0]!.id, {
		weight: 20,
		reps: 8,
	})
	if (plank) {
		const plankWe = detail!.exercises.find(
			(item) => item.workoutExercise.exerciseId === plank.id,
		)!
		await workouts.completeSet(plankWe.sets[0]!.id, {
			durationSeconds: 60,
		})
	}
	if (run) {
		const runWe = detail!.exercises.find(
			(item) => item.workoutExercise.exerciseId === run.id,
		)!
		await workouts.completeSet(runWe.sets[0]!.id, {
			distance: 3.5,
			durationSeconds: 1200,
		})
	}
	await workouts.finishWorkout(quick.workout.id)
	await ctx.db.runAsync(
		`UPDATE workouts SET started_at = ?, finished_at = ?, notes = ?, updated_at = ? WHERE id = ?`,
		[
			'2026-08-10T09:00:00.000Z',
			'2026-08-10T10:00:00.000Z',
			'Кардио день',
			'2026-08-10T10:00:00.000Z',
			quick.workout.id,
		],
	)
	// Active workout with draft + completed sets and rest timer state.
	const active = await workouts.startFromTemplate(template.id)
	await workouts.workouts.updateWorkoutExercise(
		active.exercises[0]!.workoutExercise.id,
		{ notes: 'Не спешить', restSeconds: 130 },
	)
	await workouts.completeSet(active.exercises[0]!.sets[0]!.id, {
		weight: 85,
		reps: 9,
	})
	// Keep second set as draft with values.
	await workouts.updateSetValues(active.exercises[0]!.sets[1]!.id, {
		weight: 90,
		reps: 6,
	})

	return ctx
}

describe('backup roundtrip', () => {
	it('exports and restores complex user data with id/timestamp preservation', async () => {
		const source = await buildComplexFixture()
		const before = await source.backup.createBackup()
		const json = source.backup.serializeBackup(before)

		const targetDb = await createMemoryDatabase()
		await initializeProvidedDatabase(targetDb)
		const targetBackup = new BackupService(targetDb)
		const targetWorkouts = new WorkoutService(
			targetDb,
			new MemoryRestNotificationClient(),
		)
		const targetExercises = new ExerciseRepository(targetDb)

		await targetBackup.restoreFromJson(json)

		const after = await targetBackup.createBackup()
		expect(normalizeForCompare(after)).toEqual(normalizeForCompare(before))

		// Built-in override restored.
		const bench = await targetExercises.getById('ex_sys_bench_press')
		expect(bench?.defaultRestSeconds).toBe(150)
		expect(bench?.weightStep).toBe(1.25)
		expect(bench?.notes).toContain('Сиденье 4')

		// Custom + archived custom restored.
		const customs = await targetExercises.list({ includeArchived: true })
		const customNames = customs
			.filter((item) => item.isCustom)
			.map((item) => item.name)
		expect(customNames).toEqual(
			expect.arrayContaining(['Мой жим гантелей', 'Старое упражнение']),
		)
		expect(
			customs.find((item) => item.name === 'Старое упражнение')?.archivedAt,
		).not.toBeNull()

		// Active workout restored for Today resume.
		const active = await targetWorkouts.getActiveDetail()
		expect(active).not.toBeNull()
		expect(active?.workout.finishedAt).toBeNull()
		expect(active?.exercises[0]?.sets.some((set) => set.completedAt)).toBe(
			true,
		)
		expect(active?.exercises[0]?.sets.some((set) => !set.completedAt)).toBe(
			true,
		)

		// Notification id must not be ported; logical rest may still be present.
		expect(active?.workout.restNotificationId).toBeNull()

		// System seed metadata stays current app.
		expect(await getBuiltinSeedVersion(targetDb)).toBe(
			BUILTIN_EXERCISE_SEED_VERSION,
		)

		// Historical timestamps preserved.
		const finished = after.data.workouts.find(
			(item) => item.finishedAt === '2026-08-01T11:00:00.000Z',
		)
		expect(finished?.startedAt).toBe('2026-08-01T10:00:00.000Z')
		expect(finished?.notes).toContain('Хорошая сессия')

		await source.db.closeAsync()
		await targetDb.closeAsync()
	})

	it('keeps previous results lookup after restore', async () => {
		const { db, backup, workouts, templates } = await setup()
		const template = await templates.create({ name: 'Жим' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
		})
		const first = await workouts.startFromTemplate(template.id)
		await workouts.completeSet(first.exercises[0]!.sets[0]!.id, {
			weight: 82.5,
			reps: 10,
		})
		await workouts.completeSet(first.exercises[0]!.sets[1]!.id, {
			weight: 82.5,
			reps: 9,
		})
		await workouts.finishWorkout(first.workout.id)

		const json = backup.serializeBackup(await backup.createBackup())

		const fresh = await createMemoryDatabase()
		await initializeProvidedDatabase(fresh)
		const freshBackup = new BackupService(fresh)
		const freshWorkouts = new WorkoutService(fresh)
		const freshTemplates = new WorkoutTemplateRepository(fresh)
		await freshBackup.restoreFromJson(json)

		const templateAgain = (await freshTemplates.list())[0]!
		const second = await freshWorkouts.startFromTemplate(templateAgain.id)
		expect(second.exercises[0]?.previousSets).toHaveLength(2)
		expect(second.exercises[0]?.previousSets[0]?.weight).toBe(82.5)

		await db.closeAsync()
		await fresh.closeAsync()
	})
})

describe('restore safety', () => {
	it('rejects corrupted JSON without mutating DB', async () => {
		const { db, backup, templates } = await setup()
		await templates.create({ name: 'Keep me' })
		const before = await backup.createBackup()

		await expect(backup.restoreFromJson('{bad')).rejects.toBeInstanceOf(
			BackupValidationError,
		)

		const after = await backup.createBackup()
		expect(normalizeForCompare(after)).toEqual(normalizeForCompare(before))
		await db.closeAsync()
	})

	it('rejects wrong format without mutating DB', async () => {
		const { db, backup, templates } = await setup()
		await templates.create({ name: 'Keep me' })
		const before = await backup.createBackup()

		await expect(
			backup.restoreFromJson(JSON.stringify({ hello: 'world' })),
		).rejects.toBeInstanceOf(BackupValidationError)

		const after = await backup.createBackup()
		expect(normalizeForCompare(after)).toEqual(normalizeForCompare(before))
		await db.closeAsync()
	})

	it('rejects future version without mutating DB', async () => {
		const { db, backup, templates } = await setup()
		await templates.create({ name: 'Keep me' })
		const before = await backup.createBackup()
		const future = {
			...before,
			version: 999,
		}

		try {
			await backup.restoreFromJson(JSON.stringify(future))
			throw new Error('expected throw')
		} catch (error) {
			expect(error).toBeInstanceOf(BackupValidationError)
			expect((error as BackupValidationError).code).toBe('VERSION')
		}

		const after = await backup.createBackup()
		expect(normalizeForCompare(after)).toEqual(normalizeForCompare(before))
		await db.closeAsync()
	})

	it('rolls back when late import fails on invalid FK', async () => {
		const { db, backup, templates } = await setup()
		await templates.create({ name: 'Keep me' })
		const before = await backup.createBackup()

		const malformed = await backup.createBackup()
		malformed.data.workoutTemplates.push({
			id: 'tpl_orphan',
			name: 'Broken',
			description: null,
			position: 99,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			archivedAt: null,
		})
		malformed.data.templateExercises.push({
			id: 'te_orphan',
			templateId: 'tpl_orphan',
			exerciseId: 'ex_does_not_exist_zzz',
			position: 0,
			plannedSets: 1,
			targetRepsMin: null,
			targetRepsMax: null,
			restSeconds: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		})

		await expect(backup.restoreValidated(malformed)).rejects.toBeTruthy()

		const after = await backup.createBackup()
		expect(normalizeForCompare(after)).toEqual(normalizeForCompare(before))
		const kept = await templates.list()
		expect(kept.some((item) => item.name === 'Keep me')).toBe(true)

		await db.closeAsync()
	})

	it('createBackup is read-only (timestamps unchanged)', async () => {
		const { db, backup, workouts, templates } = await setup()
		const template = await templates.create({ name: 'RO' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 1,
		})
		const active = await workouts.startFromTemplate(template.id)
		const beforeUpdated = active.workout.updatedAt
		await backup.createBackup()
		const again = await workouts.getDetail(active.workout.id)
		expect(again?.workout.updatedAt).toBe(beforeUpdated)
		await db.closeAsync()
	})
})

describe('CSV export integration', () => {
	it('exports completed sets only in chronological order', async () => {
		const { db, backup, workouts, templates } = await setup()
		const template = await templates.create({ name: 'CSV' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: 'ex_sys_bench_press',
			plannedSets: 2,
		})

		const first = await workouts.startFromTemplate(template.id)
		await workouts.completeSet(first.exercises[0]!.sets[0]!.id, {
			weight: 80,
			reps: 10,
		})
		// Draft remains incomplete.
		await workouts.updateSetValues(first.exercises[0]!.sets[1]!.id, {
			weight: 90,
			reps: 5,
		})
		await workouts.finishWorkout(first.workout.id)
		await db.runAsync(
			`UPDATE workouts SET finished_at = ?, notes = ?, updated_at = ? WHERE id = ?`,
			[
				'2026-07-01T12:00:00.000Z',
				'Плечо, чуть болело',
				'2026-07-01T12:00:00.000Z',
				first.workout.id,
			],
		)

		const second = await workouts.startFromTemplate(template.id)
		await workouts.completeSet(second.exercises[0]!.sets[0]!.id, {
			weight: 82.5,
			reps: 8,
		})
		await workouts.finishWorkout(second.workout.id)
		await db.runAsync(
			`UPDATE workouts SET finished_at = ?, updated_at = ? WHERE id = ?`,
			[
				'2026-07-02T12:00:00.000Z',
				'2026-07-02T12:00:00.000Z',
				second.workout.id,
			],
		)
		const csv = await backup.exportCompletedSetsCsv()
		expect(csv.startsWith('\uFEFF')).toBe(true)
		const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/)
		expect(lines[0]).toBe(CSV_HEADERS.join(CSV_DELIMITER))
		// Only 2 completed sets (one draft excluded).
		expect(lines).toHaveLength(3)
		expect(lines[1]).toContain('80')
		expect(lines[1]).toContain('Плечо, чуть болело')
		expect(lines[2]).toContain('82.5')
		// Chronological ascending by finished_at.
		expect(lines[1]!.indexOf('2026-07-01')).toBeGreaterThanOrEqual(0)
		expect(lines[2]!.indexOf('2026-07-02')).toBeGreaterThanOrEqual(0)

		await db.closeAsync()
	})
})

describe('backup parse after serialize', () => {
	it('roundtrips Russian text, quotes, newlines, decimals, nulls', async () => {
		const { db, backup, exercises } = await setup()
		await exercises.update('ex_sys_bench_press', {
			notes: 'Says "hi"\nsecond line; and comma, here',
			weightStep: 1.25,
		})
		const json = backup.serializeBackup(await backup.createBackup())
		const parsed = parseBackupJson(json)
		expect(parsed.data.exerciseUserSettings[0]?.notes).toContain('Says "hi"')
		expect(parsed.data.exerciseUserSettings[0]?.weightStep).toBe(1.25)
		await db.closeAsync()
	})
})
