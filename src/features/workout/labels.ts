/**
 * Russian labels for set types and workout tracking fields.
 */
import type { SetType, TrackingType } from '@/src/domain/types'

export const SET_TYPE_LABELS: Record<SetType, string> = {
	working: 'Рабочий',
	warmup: 'Разминочный',
	drop: 'Дроп',
	failure: 'До отказа',
}

export const SET_TYPE_SHORT: Record<SetType, string> = {
	working: 'Р',
	warmup: 'Рз',
	drop: 'Д',
	failure: 'О',
}

export function weightFieldLabel (trackingType: TrackingType): string {
	if (trackingType === 'assisted_reps') {
		return 'Помощь, кг'
	}
	if (trackingType === 'bodyweight_reps') {
		return '+кг'
	}
	return 'кг'
}
