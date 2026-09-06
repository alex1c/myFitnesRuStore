/**
 * Progress analytics and personal-record evaluation.
 */
import type { TrackingType, WorkoutSet } from '@/src/domain/types'
import { formatDurationClock, formatWeight } from '@/src/features/workout/set-logic'
import {
	type ProgressPeriodDays,
	compareBestWeightSet,
	estimateE1rm,
	formatE1rmKg,
	formatVolumeKg,
	periodCutoffIso,
	pickBestWeightSet,
	roundE1rm,
	setVolumeKg,
} from '@/src/features/progress/metrics'
import type { AppDatabase } from '../client'
import {
	ProgressRepository,
	type CompletedSetHistoryRow,
	type ExerciseHistoryListItem,
} from '../repositories/progress-repository'
import { ExerciseRepository } from '../repositories/exercise-repository'

export type OverallProgressSummary = {
	periodDays: ProgressPeriodDays
	workoutCount: number
	completedSetCount: number
	weightedVolumeKg: number
}

export type ChartMetric = 'weight' | 'e1rm' | 'volume'

export type ChartPoint = {
	workoutId: string
	finishedAt: string
	value: number
}

export type ExerciseProgressSummary = {
	exerciseId: string
	name: string
	trackingType: TrackingType
	archivedAt: string | null
	lastResultLabel: string | null
	maxWeightKg: number | null
	bestSetLabel: string | null
	bestE1rmKg: number | null
	volumeKg: number | null
	maxReps: number | null
	maxDurationSeconds: number | null
	maxDistanceKm: number | null
	series: {
		weight: ChartPoint[]
		e1rm: ChartPoint[]
		volume: ChartPoint[]
	}
}

export type PersonalRecordKind =
	| 'weight'
	| 'e1rm'
	| 'reps'
	| 'duration'
	| 'distance'

export type PersonalRecordEvent = {
	exerciseId: string
	exerciseName: string
	kind: PersonalRecordKind
	/** Short Russian title for the banner. */
	title: string
	valueLabel: string
	/** False for the first-ever baseline (no celebration). */
	celebrate: boolean
}

export class ProgressService {
	readonly progress: ProgressRepository
	readonly exercises: ExerciseRepository

	constructor (private readonly db: AppDatabase) {
		this.progress = new ProgressRepository(db)
		this.exercises = new ExerciseRepository(db)
	}

	async getOverallSummary (
		periodDays: ProgressPeriodDays,
		nowMs = Date.now(),
	): Promise<OverallProgressSummary> {
		const sinceIso = periodCutoffIso(periodDays, nowMs)
		const [workoutCount, completedSetCount, weightedVolumeKg] =
			await Promise.all([
				this.progress.countFinishedWorkouts(sinceIso),
				this.progress.countCompletedSets(sinceIso),
				this.progress.sumWeightedVolumeKg(sinceIso),
			])
		return {
			periodDays,
			workoutCount,
			completedSetCount,
			weightedVolumeKg,
		}
	}

	async listExercisesWithHistory (): Promise<ExerciseHistoryListItem[]> {
		return this.progress.listExercisesWithHistory()
	}

	async getExerciseSummary (
		exerciseId: string,
		periodDays: ProgressPeriodDays,
		nowMs = Date.now(),
	): Promise<ExerciseProgressSummary | null> {
		const exercise = await this.exercises.getById(exerciseId)
		if (!exercise) {
			return null
		}
		const sinceIso = periodCutoffIso(periodDays, nowMs)
		const sets = await this.progress.listCompletedSetsForExercise(
			exerciseId,
			{ sinceIso },
		)
		const allTime = await this.progress.listCompletedSetsForExercise(
			exerciseId,
		)

		return buildExerciseSummary(exercise, sets, allTime)
	}

	/**
	 * Evaluate records for a just-completed set against prior history
	 * (excluding the current set id).
	 */
	async evaluatePersonalRecords (input: {
		exerciseId: string
		exerciseName: string
		trackingType: TrackingType
		set: WorkoutSet
	}): Promise<PersonalRecordEvent[]> {
		const prior = await this.progress.listPriorCompletedSetsForLivePr(
			input.exerciseId,
			input.set.id,
		)
		return evaluateRecordsAgainstPrior({
			exerciseId: input.exerciseId,
			exerciseName: input.exerciseName,
			trackingType: input.trackingType,
			set: input.set,
			prior,
		})
	}

	/**
	 * Count celebratory PRs achieved by completed sets inside a finished workout.
	 */
	async countCelebratedRecordsInWorkout (workoutId: string): Promise<number> {
		const rows = await this.db.getAllAsync<{
			set_id: string
			exercise_id: string
			tracking_type: string
			exercise_name: string
			weight: number | null
			reps: number | null
			duration_seconds: number | null
			distance: number | null
			completed_at: string
		}>(
			`SELECT s.id AS set_id,
				we.exercise_id AS exercise_id,
				e.tracking_type AS tracking_type,
				e.name AS exercise_name,
				s.weight AS weight,
				s.reps AS reps,
				s.duration_seconds AS duration_seconds,
				s.distance AS distance,
				s.completed_at AS completed_at
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN exercises e ON e.id = we.exercise_id
			 WHERE we.workout_id = ?
			   AND s.completed_at IS NOT NULL
			 ORDER BY s.completed_at ASC, s.id ASC`,
			[workoutId],
		)

		let count = 0
		for (const row of rows) {
			const prior = await this.progress.listPriorCompletedSetsForLivePr(
				row.exercise_id,
				row.set_id,
			)
			const events = evaluateRecordsAgainstPrior({
				exerciseId: row.exercise_id,
				exerciseName: row.exercise_name,
				trackingType: row.tracking_type as TrackingType,
				set: {
					id: row.set_id,
					workoutExerciseId: '',
					position: 0,
					setType: 'working',
					weight: row.weight,
					reps: row.reps,
					durationSeconds: row.duration_seconds,
					distance: row.distance,
					completedAt: row.completed_at,
					createdAt: row.completed_at,
					updatedAt: row.completed_at,
				},
				prior,
			})
			count += events.filter((event) => event.celebrate).length
		}
		return count
	}
}

function buildExerciseSummary (
	exercise: {
		id: string
		name: string
		trackingType: TrackingType
		archivedAt: string | null
	},
	periodSets: CompletedSetHistoryRow[],
	allTimeSets: CompletedSetHistoryRow[],
): ExerciseProgressSummary {
	const tracking = exercise.trackingType
	const lastWorkoutId = allTimeSets.length > 0
		? allTimeSets[allTimeSets.length - 1]!.workoutId
		: null
	const lastWorkoutSets = lastWorkoutId
		? allTimeSets.filter((set) => set.workoutId === lastWorkoutId)
		: []

	let lastResultLabel: string | null = null
	if (lastWorkoutSets.length > 0) {
		lastResultLabel = lastWorkoutSets
			.map((set) => formatHistorySetShort(set, tracking))
			.join(', ')
	}

	let maxWeightKg: number | null = null
	let bestSetLabel: string | null = null
	let bestE1rmKg: number | null = null
	let volumeKg: number | null = null
	let maxReps: number | null = null
	let maxDurationSeconds: number | null = null
	let maxDistanceKm: number | null = null

	if (tracking === 'weight_reps') {
		const weights = periodSets
			.map((set) => set.weight)
			.filter((value): value is number => value !== null && value > 0)
		maxWeightKg = weights.length > 0 ? Math.max(...weights) : null
		const best = pickBestWeightSet(periodSets)
		if (best && best.weight !== null && best.reps !== null) {
			bestSetLabel = `${formatWeight(best.weight)} кг × ${best.reps}`
			const e1 = estimateE1rm(best.weight, best.reps)
			bestE1rmKg = e1 === null ? null : roundE1rm(e1)
		}
		volumeKg = periodSets.reduce((sum, set) => {
			const volume = setVolumeKg(set.weight, set.reps)
			return sum + (volume ?? 0)
		}, 0)
	}

	if (tracking === 'bodyweight_reps') {
		const reps = periodSets
			.map((set) => set.reps)
			.filter((value): value is number => value !== null && value > 0)
		maxReps = reps.length > 0 ? Math.max(...reps) : null
	}

	if (tracking === 'duration') {
		const durations = periodSets
			.map((set) => set.durationSeconds)
			.filter((value): value is number => value !== null && value > 0)
		maxDurationSeconds = durations.length > 0 ? Math.max(...durations) : null
	}

	if (tracking === 'distance_duration') {
		const distances = periodSets
			.map((set) => set.distance)
			.filter((value): value is number => value !== null && value > 0)
		maxDistanceKm = distances.length > 0 ? Math.max(...distances) : null
	}

	return {
		exerciseId: exercise.id,
		name: exercise.name,
		trackingType: tracking,
		archivedAt: exercise.archivedAt,
		lastResultLabel,
		maxWeightKg,
		bestSetLabel,
		bestE1rmKg,
		volumeKg: tracking === 'weight_reps' ? volumeKg : null,
		maxReps,
		maxDurationSeconds,
		maxDistanceKm,
		series: {
			weight: buildWorkoutSeries(periodSets, 'weight'),
			e1rm: buildWorkoutSeries(periodSets, 'e1rm'),
			volume: buildWorkoutSeries(periodSets, 'volume'),
		},
	}
}

function buildWorkoutSeries (
	sets: CompletedSetHistoryRow[],
	metric: ChartMetric,
): ChartPoint[] {
	const byWorkout = new Map<string, CompletedSetHistoryRow[]>()
	for (const set of sets) {
		const list = byWorkout.get(set.workoutId) ?? []
		list.push(set)
		byWorkout.set(set.workoutId, list)
	}

	const points: ChartPoint[] = []
	for (const [workoutId, workoutSets] of byWorkout) {
		const finishedAt = workoutSets[0]!.workoutFinishedAt
		let value: number | null = null
		if (metric === 'weight') {
			const weights = workoutSets
				.map((set) => set.weight)
				.filter((item): item is number => item !== null && item > 0)
			value = weights.length > 0 ? Math.max(...weights) : null
		} else if (metric === 'e1rm') {
			const e1s = workoutSets
				.map((set) => estimateE1rm(set.weight, set.reps))
				.filter((item): item is number => item !== null)
			value = e1s.length > 0 ? roundE1rm(Math.max(...e1s)) : null
		} else {
			value = workoutSets.reduce((sum, set) => {
				const volume = setVolumeKg(set.weight, set.reps)
				return sum + (volume ?? 0)
			}, 0)
			if (value === 0) {
				value = null
			}
		}
		if (value !== null) {
			points.push({ workoutId, finishedAt, value })
		}
	}

	points.sort(
		(a, b) =>
			Date.parse(a.finishedAt) - Date.parse(b.finishedAt)
			|| a.workoutId.localeCompare(b.workoutId),
	)
	return points
}

function formatHistorySetShort (
	set: CompletedSetHistoryRow,
	tracking: TrackingType,
): string {
	if (tracking === 'weight_reps' && set.weight !== null && set.reps !== null) {
		return `${formatWeight(set.weight)}×${set.reps}`
	}
	if (tracking === 'bodyweight_reps' && set.reps !== null) {
		if (set.weight !== null && set.weight > 0) {
			return `+${formatWeight(set.weight)}×${set.reps}`
		}
		return `${set.reps}`
	}
	if (tracking === 'assisted_reps' && set.weight !== null && set.reps !== null) {
		return `${formatWeight(set.weight)}п×${set.reps}`
	}
	if (tracking === 'duration' && set.durationSeconds !== null) {
		return formatDurationClock(set.durationSeconds)
	}
	if (tracking === 'distance_duration') {
		const parts: string[] = []
		if (set.distance !== null) {
			parts.push(`${formatWeight(set.distance)}км`)
		}
		if (set.durationSeconds !== null) {
			parts.push(formatDurationClock(set.durationSeconds))
		}
		return parts.join(' ') || '—'
	}
	return '—'
}

export function evaluateRecordsAgainstPrior (input: {
	exerciseId: string
	exerciseName: string
	trackingType: TrackingType
	set: WorkoutSet
	prior: CompletedSetHistoryRow[]
}): PersonalRecordEvent[] {
	const events: PersonalRecordEvent[] = []
	const hadPrior = input.prior.length > 0
	const celebrate = hadPrior

	if (input.trackingType === 'weight_reps') {
		const priorMaxWeight = maxNumber(
			input.prior.map((set) => set.weight),
		)
		const priorMaxE1rm = maxNumber(
			input.prior
				.map((set) => estimateE1rm(set.weight, set.reps))
				.map((value) => (value === null ? null : roundE1rm(value))),
		)
		const weight = input.set.weight
		const e1 = estimateE1rm(input.set.weight, input.set.reps)
		const e1Rounded = e1 === null ? null : roundE1rm(e1)

		const isWeightPr =
			weight !== null
			&& weight > 0
			&& (priorMaxWeight === null || weight > priorMaxWeight)
		const isE1rmPr =
			e1Rounded !== null
			&& (priorMaxE1rm === null || e1Rounded > priorMaxE1rm)

		if (isWeightPr && isE1rmPr) {
			// Prefer a single compact banner when both improve.
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'e1rm',
				title: 'Новый рекорд',
				valueLabel: `${formatWeight(weight!)} кг · 1ПМ ${formatE1rmKg(e1Rounded!)} кг`,
				celebrate,
			})
		} else if (isWeightPr) {
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'weight',
				title: 'Новый рекорд',
				valueLabel: `${formatWeight(weight!)} кг`,
				celebrate,
			})
		} else if (isE1rmPr) {
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'e1rm',
				title: 'Новый рекорд',
				valueLabel: `Расчётный 1ПМ — ${formatE1rmKg(e1Rounded!)} кг`,
				celebrate,
			})
		}
	}

	if (input.trackingType === 'bodyweight_reps') {
		const priorMax = maxNumber(input.prior.map((set) => set.reps))
		const reps = input.set.reps
		if (reps !== null && reps > 0 && (priorMax === null || reps > priorMax)) {
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'reps',
				title: 'Новый рекорд',
				valueLabel: `${reps} повт.`,
				celebrate,
			})
		}
	}

	if (input.trackingType === 'duration') {
		const priorMax = maxNumber(input.prior.map((set) => set.durationSeconds))
		const duration = input.set.durationSeconds
		if (
			duration !== null
			&& duration > 0
			&& (priorMax === null || duration > priorMax)
		) {
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'duration',
				title: 'Новый рекорд',
				valueLabel: formatDurationClock(duration),
				celebrate,
			})
		}
	}

	if (input.trackingType === 'distance_duration') {
		const priorMax = maxNumber(input.prior.map((set) => set.distance))
		const distance = input.set.distance
		if (
			distance !== null
			&& distance > 0
			&& (priorMax === null || distance > priorMax)
		) {
			events.push({
				exerciseId: input.exerciseId,
				exerciseName: input.exerciseName,
				kind: 'distance',
				title: 'Новый рекорд',
				valueLabel: `${formatWeight(distance)} км`,
				celebrate,
			})
		}
	}

	return events
}

function maxNumber (values: (number | null | undefined)[]): number | null {
	const present = values.filter(
		(value): value is number =>
			value !== null && value !== undefined && Number.isFinite(value),
	)
	if (present.length === 0) {
		return null
	}
	return Math.max(...present)
}

export function createProgressService (db: AppDatabase): ProgressService {
	return new ProgressService(db)
}

// Re-export helpers useful for UI
export { formatVolumeKg, formatE1rmKg, compareBestWeightSet }
