/**
 * History display helpers — dates, completed set lines, duration clock.
 */
import type { SetType, TrackingType, WorkoutSet } from '@/src/domain/types'
import {
	formatDurationClock,
	formatWeight,
} from '@/src/features/workout/set-logic'

const MONTHS_RU = [
	'января',
	'февраля',
	'марта',
	'апреля',
	'мая',
	'июня',
	'июля',
	'августа',
	'сентября',
	'октября',
	'ноября',
	'декабря',
] as const

/** Compact history labels for non-working set types. */
export const HISTORY_SET_TYPE_LABELS: Partial<Record<SetType, string>> = {
	warmup: 'Разминка',
	drop: 'Дроп',
	failure: 'До отказа',
}

function startOfLocalDay (date: Date): number {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).getTime()
}

/**
 * Russian relative/absolute date for history cards and headers.
 * Examples: Сегодня, Вчера, 5 сентября, 12 июля 2025
 */
export function formatHistoryDate (
	iso: string,
	nowMs = Date.now(),
): string {
	const date = new Date(iso)
	if (!Number.isFinite(date.getTime())) {
		return ''
	}

	const today = startOfLocalDay(new Date(nowMs))
	const target = startOfLocalDay(date)
	const dayMs = 24 * 60 * 60 * 1000
	const diffDays = Math.round((today - target) / dayMs)

	if (diffDays === 0) {
		return 'Сегодня'
	}
	if (diffDays === 1) {
		return 'Вчера'
	}

	const day = date.getDate()
	const month = MONTHS_RU[date.getMonth()] ?? ''
	const nowYear = new Date(nowMs).getFullYear()
	if (date.getFullYear() === nowYear) {
		return `${day} ${month}`
	}
	return `${day} ${month} ${date.getFullYear()}`
}

/** Time-of-day for detail header, e.g. 18:32 */
export function formatHistoryTime (iso: string): string {
	const date = new Date(iso)
	if (!Number.isFinite(date.getTime())) {
		return ''
	}
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${hours}:${minutes}`
}

export function formatHistoryDateTime (iso: string, nowMs = Date.now()): string {
	const datePart = formatHistoryDate(iso, nowMs)
	const timePart = formatHistoryTime(iso)
	if (!datePart) {
		return timePart
	}
	if (!timePart) {
		return datePart
	}
	return `${datePart} • ${timePart}`
}

/** Precise duration for detail header: 1:04:32 */
export function formatWorkoutDurationClock (
	startedAtIso: string,
	finishedAtIso: string,
): string {
	const start = Date.parse(startedAtIso)
	const end = Date.parse(finishedAtIso)
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
		return '—'
	}
	const totalSeconds = Math.floor((end - start) / 1000)
	return formatDurationClock(totalSeconds)
}

/**
 * User-facing completed set line for history detail.
 */
export function formatCompletedSetDisplay (
	set: WorkoutSet,
	trackingType: TrackingType,
): string {
	const typeSuffix =
		set.setType !== 'working' && HISTORY_SET_TYPE_LABELS[set.setType]
			? ` · ${HISTORY_SET_TYPE_LABELS[set.setType]}`
			: ''

	let body = '—'
	switch (trackingType) {
		case 'weight_reps':
			if (set.weight !== null && set.reps !== null) {
				body = `${formatWeight(set.weight)} кг × ${set.reps}`
			}
			break
		case 'bodyweight_reps':
			if (set.reps !== null) {
				body = set.weight !== null && set.weight > 0
					? `+${formatWeight(set.weight)} кг × ${set.reps}`
					: `${set.reps} ${pluralReps(set.reps)}`
			}
			break
		case 'assisted_reps':
			if (set.weight !== null && set.reps !== null) {
				body = `${formatWeight(set.weight)} кг помощи × ${set.reps}`
			}
			break
		case 'duration':
			if (set.durationSeconds !== null) {
				body = formatDurationClock(set.durationSeconds)
			}
			break
		case 'distance_duration': {
			const parts: string[] = []
			if (set.distance !== null) {
				parts.push(`${formatWeight(set.distance)} км`)
			}
			if (set.durationSeconds !== null) {
				parts.push(formatDurationClock(set.durationSeconds))
			}
			if (parts.length > 0) {
				body = parts.join(' • ')
			}
			break
		}
		default:
			break
	}

	return `${body}${typeSuffix}`
}

function pluralReps (count: number): string {
	const absolute = Math.abs(count) % 100
	const last = absolute % 10
	if (absolute > 10 && absolute < 20) {
		return 'повторов'
	}
	if (last === 1) {
		return 'повтор'
	}
	if (last >= 2 && last <= 4) {
		return 'повтора'
	}
	return 'повторов'
}
