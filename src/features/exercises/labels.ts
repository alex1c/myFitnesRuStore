/**
 * Russian display labels for domain enums — never show raw enum keys in UI.
 */
import type { Equipment, MuscleGroup, TrackingType } from '@/src/domain/types'

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
	weight_reps: 'Вес + повторения',
	bodyweight_reps: 'Собственный вес + повторения',
	assisted_reps: 'Ассистированный вес + повторения',
	duration: 'Время',
	distance_duration: 'Расстояние + время',
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
	chest: 'Грудь',
	back: 'Спина',
	shoulders: 'Плечи',
	biceps: 'Бицепс',
	triceps: 'Трицепс',
	forearms: 'Предплечья',
	legs: 'Ноги',
	glutes: 'Ягодицы',
	calves: 'Икры',
	core: 'Кор',
	full_body: 'Всё тело',
	cardio: 'Кардио',
	other: 'Другое',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
	barbell: 'Штанга',
	dumbbell: 'Гантели',
	machine: 'Тренажёр',
	cable: 'Блочный тренажёр',
	bodyweight: 'Собственный вес',
	kettlebell: 'Гиря',
	band: 'Резинка',
	cardio_machine: 'Кардио-тренажёр',
	other: 'Другое',
}

export function muscleGroupLabel (value: string): string {
	return MUSCLE_GROUP_LABELS[value as MuscleGroup] ?? value
}

export function equipmentLabel (value: string): string {
	return EQUIPMENT_LABELS[value as Equipment] ?? value
}

export function trackingTypeLabel (value: TrackingType): string {
	return TRACKING_TYPE_LABELS[value]
}

/** Whether weight step applies for this tracking mode. */
export function usesWeightStep (trackingType: TrackingType): boolean {
	return (
		trackingType === 'weight_reps' || trackingType === 'assisted_reps'
	)
}

/**
 * Format rest seconds for compact list rows.
 * Examples: 45 → "45 сек", 90 → "1,5 мин", 120 → "2 мин"
 */
export function formatRestLabel (seconds: number): string {
	if (seconds < 60) {
		return `${seconds} сек`
	}
	if (seconds % 60 === 0) {
		return `${seconds / 60} мин`
	}
	if (seconds % 60 === 30) {
		return `${Math.floor(seconds / 60)},5 мин`
	}
	return `${seconds} сек`
}
