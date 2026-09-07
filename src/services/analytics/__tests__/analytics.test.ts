/**
 * Analytics wrapper unit tests — no network / native AppMetrica calls.
 */
import {
	ANALYTICS_EVENTS,
	APPMETRICA_API_KEY,
	AnalyticsService,
	FORBIDDEN_ANALYTICS_KEYS,
	assertNoForbiddenKeys,
	createMemoryAnalyticsClient,
	restDurationBucket,
	sanitizeAnalyticsParams,
} from '@/src/services/analytics'
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { WorkoutService } from '@/src/db/services/workout-service'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { BackupService } from '@/src/db/services/backup-service'
import { MemoryRestNotificationClient } from '@/src/services/notifications/memory-rest-notification-client'
import { analytics as singleton } from '@/src/services/analytics/analytics-service'

describe('AnalyticsService wrapper', () => {
	beforeEach(() => {
		const globalFlag = globalThis as {
			__moySportzalAnalyticsInitialized?: boolean
		}
		delete globalFlag.__moySportzalAnalyticsInitialized
	})

	it('initializes once with production key and privacy flags', () => {
		const client = createMemoryAnalyticsClient()
		const service = new AnalyticsService(client)
		service.initialize()
		service.initialize()
		expect(client.activations).toHaveLength(1)
		expect(client.activations[0]?.apiKey).toBe(APPMETRICA_API_KEY)
		expect(client.activations[0]?.locationTracking).toBe(false)
		expect(client.activations[0]?.advIdentifiersTracking).toBe(false)
		expect(service.isInitialized()).toBe(true)
	})

	it('swallows client failures without throwing', () => {
		const service = new AnalyticsService({
			activate () {
				throw new Error('native boom')
			},
			reportEvent () {
				throw new Error('report boom')
			},
		})
		expect(() => service.initialize()).not.toThrow()
		expect(() =>
			service.trackWorkoutStarted({
				source: 'quick',
				exercise_count: 0,
				planned_set_count: 0,
			}),
		).not.toThrow()
	})

	it('emits typed event names and sanitized payloads', () => {
		const client = createMemoryAnalyticsClient()
		const service = new AnalyticsService(client)
		service.trackWorkoutStarted({
			source: 'template',
			exercise_count: 3,
			planned_set_count: 12,
		})
		service.trackWorkoutCompleted({
			duration_seconds: 1800,
			completed_set_count: 10,
			exercise_count: 3,
		})
		service.trackWorkoutDiscarded({
			duration_seconds: 120,
			completed_set_count: 1,
		})
		service.trackSetCompleted({
			tracking_type: 'weight_reps',
			set_type: 'working',
		})
		service.trackRestTimerStarted(95)
		service.trackRestTimerSkipped()
		service.trackRestTimerAdjusted('increase')
		service.trackTemplateCreated({ exercise_count: 0 })
		service.trackTemplateDuplicated({ exercise_count: 4 })
		service.trackCustomExerciseCreated({
			tracking_type: 'bodyweight_reps',
			equipment_category: 'bodyweight',
		})
		service.trackBackupCreated()
		service.trackRestoreCompleted()
		service.trackCsvExported()

		const names = client.events.map((item) => item.name)
		expect(names).toEqual([
			ANALYTICS_EVENTS.workoutStarted,
			ANALYTICS_EVENTS.workoutCompleted,
			ANALYTICS_EVENTS.workoutDiscarded,
			ANALYTICS_EVENTS.setCompleted,
			ANALYTICS_EVENTS.restTimerStarted,
			ANALYTICS_EVENTS.restTimerSkipped,
			ANALYTICS_EVENTS.restTimerAdjusted,
			ANALYTICS_EVENTS.templateCreated,
			ANALYTICS_EVENTS.templateDuplicated,
			ANALYTICS_EVENTS.customExerciseCreated,
			ANALYTICS_EVENTS.backupCreated,
			ANALYTICS_EVENTS.restoreCompleted,
			ANALYTICS_EVENTS.csvExported,
		])

		expect(client.events[0]?.params).toEqual({
			source: 'template',
			exercise_count: 3,
			planned_set_count: 12,
		})
		expect(client.events[4]?.params).toEqual({
			duration_bucket: '91-120',
		})

		for (const event of client.events) {
			if (event.params) {
				assertNoForbiddenKeys(event.params)
			}
		}
	})

	it('strips forbidden keys from payloads', () => {
		const cleaned = sanitizeAnalyticsParams({
			source: 'quick',
			name: 'Жим',
			notes: 'secret',
			weight: 100,
			reps: 8,
			exercise_count: 1,
		})
		expect(cleaned).toEqual({
			source: 'quick',
			exercise_count: 1,
		})
		for (const key of FORBIDDEN_ANALYTICS_KEYS) {
			expect(cleaned).not.toHaveProperty(key)
		}
	})

	it('maps rest duration buckets', () => {
		expect(restDurationBucket(45)).toBe('lte60')
		expect(restDurationBucket(90)).toBe('61-90')
		expect(restDurationBucket(120)).toBe('91-120')
		expect(restDurationBucket(150)).toBe('121-180')
		expect(restDurationBucket(240)).toBe('gt180')
	})
})

describe('analytics service integration (business success)', () => {
	async function setup () {
		const db = await createMemoryDatabase()
		await initializeProvidedDatabase(db)
		const notifications = new MemoryRestNotificationClient()
		const workouts = new WorkoutService(db, notifications)
		const templates = new WorkoutTemplateRepository(db)
		const exercises = new ExerciseRepository(db)
		const backup = new BackupService(db)
		const client = createMemoryAnalyticsClient()
		// Replace singleton client methods for integration assertions.
		const original = {
			trackWorkoutStarted: singleton.trackWorkoutStarted.bind(singleton),
			trackWorkoutCompleted: singleton.trackWorkoutCompleted.bind(singleton),
			trackWorkoutDiscarded: singleton.trackWorkoutDiscarded.bind(singleton),
			trackSetCompleted: singleton.trackSetCompleted.bind(singleton),
			trackRestTimerStarted: singleton.trackRestTimerStarted.bind(singleton),
			trackRestTimerSkipped: singleton.trackRestTimerSkipped.bind(singleton),
			trackTemplateCreated: singleton.trackTemplateCreated.bind(singleton),
			trackCustomExerciseCreated:
				singleton.trackCustomExerciseCreated.bind(singleton),
			trackRestoreCompleted: singleton.trackRestoreCompleted.bind(singleton),
		}
		const probe = new AnalyticsService(client)
		singleton.trackWorkoutStarted = probe.trackWorkoutStarted.bind(probe)
		singleton.trackWorkoutCompleted = probe.trackWorkoutCompleted.bind(probe)
		singleton.trackWorkoutDiscarded = probe.trackWorkoutDiscarded.bind(probe)
		singleton.trackSetCompleted = probe.trackSetCompleted.bind(probe)
		singleton.trackRestTimerStarted = probe.trackRestTimerStarted.bind(probe)
		singleton.trackRestTimerSkipped = probe.trackRestTimerSkipped.bind(probe)
		singleton.trackTemplateCreated = probe.trackTemplateCreated.bind(probe)
		singleton.trackCustomExerciseCreated =
			probe.trackCustomExerciseCreated.bind(probe)
		singleton.trackRestoreCompleted = probe.trackRestoreCompleted.bind(probe)

		return {
			db,
			workouts,
			templates,
			exercises,
			backup,
			client,
			restore () {
				Object.assign(singleton, original)
			},
		}
	}

	it('tracks workout start/finish/discard/set/rest with safe payloads', async () => {
		const ctx = await setup()
		try {
			const template = await ctx.templates.create({ name: 'Грудь' })
			expect(
				ctx.client.events.some(
					(item) => item.name === ANALYTICS_EVENTS.templateCreated,
				),
			).toBe(true)

			await ctx.templates.addExercise({
				templateId: template.id,
				exerciseId: 'ex_sys_bench_press',
				plannedSets: 2,
				restSeconds: 90,
			})

			const started = await ctx.workouts.startFromTemplate(template.id)
			const startEvent = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.workoutStarted,
			)
			expect(startEvent?.params).toMatchObject({
				source: 'template',
				exercise_count: 1,
				planned_set_count: 2,
			})
			assertNoForbiddenKeys(startEvent!.params!)

			const setId = started.exercises[0]!.sets[0]!.id
			await ctx.workouts.completeSet(setId, { weight: 82.5, reps: 10 })
			const setEvent = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.setCompleted,
			)
			expect(setEvent?.params).toEqual({
				tracking_type: 'weight_reps',
				set_type: 'working',
			})
			expect(setEvent?.params).not.toHaveProperty('weight')
			expect(setEvent?.params).not.toHaveProperty('reps')

			const restEvent = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.restTimerStarted,
			)
			expect(restEvent?.params).toEqual({ duration_bucket: '61-90' })

			await ctx.workouts.restTimer.skip(started.workout.id)
			expect(
				ctx.client.events.some(
					(item) => item.name === ANALYTICS_EVENTS.restTimerSkipped,
				),
			).toBe(true)

			await ctx.workouts.finishWorkout(started.workout.id)
			const completed = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.workoutCompleted,
			)
			expect(completed?.params?.completed_set_count).toBe(1)
			expect(completed?.params?.exercise_count).toBe(1)
			expect(typeof completed?.params?.duration_seconds).toBe('number')
			assertNoForbiddenKeys(completed!.params!)

			const quick = await ctx.workouts.startQuickWorkout()
			await ctx.workouts.discardWorkout(quick.workout.id)
			const discarded = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.workoutDiscarded,
			)
			expect(discarded?.params).toMatchObject({
				completed_set_count: 0,
			})
		} finally {
			ctx.restore()
			await ctx.db.closeAsync()
		}
	})

	it('tracks custom exercise and successful restore without names', async () => {
		const ctx = await setup()
		try {
			await ctx.exercises.create({
				name: 'Мой жим',
				trackingType: 'weight_reps',
				equipment: 'dumbbell',
			})
			const customEvent = ctx.client.events.find(
				(item) => item.name === ANALYTICS_EVENTS.customExerciseCreated,
			)
			expect(customEvent?.params).toEqual({
				tracking_type: 'weight_reps',
				equipment_category: 'dumbbell',
			})
			expect(customEvent?.params).not.toHaveProperty('name')

			const payload = await ctx.backup.createBackup()
			const json = ctx.backup.serializeBackup(payload)
			await ctx.backup.restoreFromJson(json)
			expect(
				ctx.client.events.some(
					(item) => item.name === ANALYTICS_EVENTS.restoreCompleted,
				),
			).toBe(true)
		} finally {
			ctx.restore()
			await ctx.db.closeAsync()
		}
	})

	it('does not mark restore completed when validation fails', async () => {
		const ctx = await setup()
		try {
			await expect(ctx.backup.restoreFromJson('{bad')).rejects.toBeTruthy()
			expect(
				ctx.client.events.some(
					(item) => item.name === ANALYTICS_EVENTS.restoreCompleted,
				),
			).toBe(false)
		} finally {
			ctx.restore()
			await ctx.db.closeAsync()
		}
	})
})
