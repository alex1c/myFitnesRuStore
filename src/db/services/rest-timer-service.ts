/**
 * Persistent rest timer — absolute endsAt is the source of truth.
 * Schedules/cancels a single local notification per active workout.
 */
import type { Workout } from '@/src/domain/types'
import {
	REST_ADJUST_SECONDS,
	adjustRestEndsAt,
	computeRestEndsAt,
	isRestActive,
	resolveRestSeconds,
} from '@/src/features/workout/rest-timer-logic'
import type { RestNotificationClient } from '@/src/services/notifications/rest-notification-client'
import { analytics } from '@/src/services/analytics'
import { createId } from '@/src/utils/id'
import { nowIso } from '@/src/utils/dates'
import type { AppDatabase } from '../client'
import { WorkoutRepository } from '../repositories/workout-repository'

export type ActiveRestTimer = {
	workoutId: string
	startedAt: string
	endsAt: string
	workoutExerciseId: string | null
	setId: string | null
	notificationId: string | null
}

export type StartRestResult = {
	timer: ActiveRestTimer | null
	/** UI should explain notifications once when still undetermined. */
	permissionPromptNeeded: boolean
}

const REST_NOTIFICATION_PREFIX = 'rest-timer:'

export class RestTimerService {
	private permissionPromptPending = false
	readonly workouts: WorkoutRepository

	constructor (
		private readonly db: AppDatabase,
		private readonly notifications: RestNotificationClient,
	) {
		this.workouts = new WorkoutRepository(db)
	}

	consumePermissionPromptNeeded (): boolean {
		const value = this.permissionPromptPending
		this.permissionPromptPending = false
		return value
	}

	async requestNotificationPermission (): Promise<void> {
		const status = await this.notifications.requestPermission()
		if (status !== 'granted') {
			return
		}
		const active = await this.workouts.getActiveWorkout()
		if (active?.restEndsAt && active.restNotificationId) {
			await this.ensureScheduled(active)
		}
	}

	/**
	 * Restore active timer from SQLite; clear stale expired state.
	 * Reconciles notification schedule when timer is still running.
	 */
	async reconcileWorkout (
		workoutId: string,
		nowMs = Date.now(),
	): Promise<ActiveRestTimer | null> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout || workout.finishedAt) {
			return null
		}
		if (!workout.restEndsAt) {
			return null
		}
		if (!isRestActive(workout.restEndsAt, nowMs)) {
			await this.clearTimer(workoutId, { cancelNotification: true })
			return null
		}
		await this.ensureScheduled(workout)
		return toActiveTimer(workout)
	}

	async startForCompletedSet (input: {
		workoutId: string
		workoutExerciseId: string
		setId: string
		restSeconds: number
		exerciseName?: string | null
		nowMs?: number
	}): Promise<StartRestResult> {
		const nowMs = input.nowMs ?? Date.now()
		const duration = Math.floor(input.restSeconds)

		// Always replace any previous timer / notification first.
		await this.cancelExistingNotification(input.workoutId)

		if (duration <= 0) {
			await this.workouts.clearRestTimer(input.workoutId)
			return { timer: null, permissionPromptNeeded: false }
		}

		const startedAt = new Date(nowMs).toISOString()
		const endsAt = new Date(
			computeRestEndsAt(nowMs, duration),
		).toISOString()
		const notificationId = `${REST_NOTIFICATION_PREFIX}${createId('ntf')}`

		await this.workouts.setRestTimer(input.workoutId, {
			restStartedAt: startedAt,
			restEndsAt: endsAt,
			restWorkoutExerciseId: input.workoutExerciseId,
			restSetId: input.setId,
			restNotificationId: notificationId,
		})

		const permissionPromptNeeded = await this.maybePromptAndSchedule({
			notificationId,
			endsAt,
			exerciseName: input.exerciseName,
		})

		const workout = await this.workouts.getWorkoutById(input.workoutId)
		if (workout) {
			analytics.trackRestTimerStarted(duration)
		}
		return {
			timer: workout ? toActiveTimer(workout) : null,
			permissionPromptNeeded,
		}
	}

	async adjust (
		workoutId: string,
		deltaSeconds: number,
		nowMs = Date.now(),
	): Promise<ActiveRestTimer | null> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout?.restEndsAt || workout.finishedAt) {
			return null
		}

		const adjusted = adjustRestEndsAt(
			workout.restEndsAt,
			deltaSeconds,
			nowMs,
		)
		if (adjusted.expired) {
			await this.clearTimer(workoutId, { cancelNotification: true })
			return null
		}

		await this.cancelExistingNotification(workoutId)
		const notificationId = `${REST_NOTIFICATION_PREFIX}${createId('ntf')}`
		await this.workouts.setRestTimer(workoutId, {
			restStartedAt: workout.restStartedAt ?? nowIso(),
			restEndsAt: adjusted.endsAt,
			restWorkoutExerciseId: workout.restWorkoutExerciseId,
			restSetId: workout.restSetId,
			restNotificationId: notificationId,
		})

		await this.maybePromptAndSchedule({
			notificationId,
			endsAt: adjusted.endsAt,
			exerciseName: null,
		})

		analytics.trackRestTimerAdjusted(
			deltaSeconds >= 0 ? 'increase' : 'decrease',
		)

		const updated = await this.workouts.getWorkoutById(workoutId)
		return updated ? toActiveTimer(updated) : null
	}

	async add15 (workoutId: string, nowMs = Date.now()): Promise<ActiveRestTimer | null> {
		return this.adjust(workoutId, REST_ADJUST_SECONDS, nowMs)
	}

	async minus15 (workoutId: string, nowMs = Date.now()): Promise<ActiveRestTimer | null> {
		return this.adjust(workoutId, -REST_ADJUST_SECONDS, nowMs)
	}

	async skip (workoutId: string): Promise<void> {
		await this.clearTimer(workoutId, { cancelNotification: true })
		analytics.trackRestTimerSkipped()
	}

	/**
	 * Cancel timer only when it was started by this completed set.
	 */
	async cancelIfSourceSet (workoutId: string, setId: string): Promise<void> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (!workout?.restSetId) {
			return
		}
		if (workout.restSetId === setId) {
			await this.clearTimer(workoutId, { cancelNotification: true })
		}
	}

	async clearForWorkoutEnd (workoutId: string): Promise<void> {
		await this.clearTimer(workoutId, { cancelNotification: true })
	}

	resolveDuration (input: {
		workoutExerciseRestSeconds: number | null | undefined
		exerciseDefaultRestSeconds: number | null | undefined
	}): number {
		return resolveRestSeconds(input)
	}

	private async clearTimer (
		workoutId: string,
		options: { cancelNotification: boolean },
	): Promise<void> {
		if (options.cancelNotification) {
			await this.cancelExistingNotification(workoutId)
		}
		await this.workouts.clearRestTimer(workoutId)
	}

	private async cancelExistingNotification (workoutId: string): Promise<void> {
		const workout = await this.workouts.getWorkoutById(workoutId)
		if (workout?.restNotificationId) {
			await this.notifications.cancel(workout.restNotificationId)
		}
	}

	private async ensureScheduled (workout: Workout): Promise<void> {
		if (!workout.restEndsAt || !workout.restNotificationId) {
			return
		}
		const fireAt = new Date(workout.restEndsAt)
		if (!Number.isFinite(fireAt.getTime()) || fireAt.getTime() <= Date.now()) {
			return
		}
		// Cancel + reschedule with the same identifier to avoid duplicates.
		await this.notifications.cancel(workout.restNotificationId)
		await this.notifications.schedule({
			identifier: workout.restNotificationId,
			fireAt,
			title: 'Отдых закончен',
			body: 'Можно начинать следующий подход.',
		})
	}

	private async maybePromptAndSchedule (input: {
		notificationId: string
		endsAt: string
		exerciseName?: string | null
	}): Promise<boolean> {
		await this.notifications.ensureChannel()
		const status = await this.notifications.getPermissionStatus()
		let permissionPromptNeeded = false
		if (status === 'undetermined') {
			permissionPromptNeeded = true
			this.permissionPromptPending = true
		}
		if (status === 'granted') {
			const body = input.exerciseName
				? `${input.exerciseName} — можно начинать следующий подход.`
				: 'Можно начинать следующий подход.'
			await this.notifications.schedule({
				identifier: input.notificationId,
				fireAt: new Date(input.endsAt),
				title: 'Отдых закончен',
				body,
			})
		}
		return permissionPromptNeeded
	}
}

function toActiveTimer (workout: Workout): ActiveRestTimer | null {
	if (!workout.restEndsAt || !workout.restStartedAt) {
		return null
	}
	return {
		workoutId: workout.id,
		startedAt: workout.restStartedAt,
		endsAt: workout.restEndsAt,
		workoutExerciseId: workout.restWorkoutExerciseId,
		setId: workout.restSetId,
		notificationId: workout.restNotificationId,
	}
}

/** Stable factory for tests — inject memory notification client. */
export function createRestTimerService (
	db: AppDatabase,
	notifications: RestNotificationClient,
): RestTimerService {
	return new RestTimerService(db, notifications)
}
