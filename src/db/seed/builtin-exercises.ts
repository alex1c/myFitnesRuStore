/**
 * Deterministic built-in exercise catalog for Phase 1.
 * Stable IDs (ex_sys_*) must never change once shipped.
 */
import type {
	Equipment,
	ExerciseCategory,
	MuscleGroup,
	TrackingType,
} from '@/src/domain/types'

export type BuiltinExerciseSeed = {
	id: string
	name: string
	category: ExerciseCategory
	muscleGroup: MuscleGroup
	equipment: Equipment
	trackingType: TrackingType
	defaultRestSeconds: number
	weightStep: number | null
}

/** Bump when catalog content intentionally changes (for meta tracking). */
export const BUILTIN_EXERCISE_SEED_VERSION = '1'

function barbell (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	step = 2.5,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'barbell',
		trackingType: 'weight_reps',
		defaultRestSeconds: rest,
		weightStep: step,
	}
}

function dumbbell (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	step = 1,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'dumbbell',
		trackingType: 'weight_reps',
		defaultRestSeconds: rest,
		weightStep: step,
	}
}

function machine (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	step = 5,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'machine',
		trackingType: 'weight_reps',
		defaultRestSeconds: rest,
		weightStep: step,
	}
}

function cable (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	step = 2.5,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'cable',
		trackingType: 'weight_reps',
		defaultRestSeconds: rest,
		weightStep: step,
	}
}

function bodyweight (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	trackingType: TrackingType = 'bodyweight_reps',
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: trackingType === 'duration' ? 'mobility' : 'strength',
		muscleGroup: muscle,
		equipment: 'bodyweight',
		trackingType,
		defaultRestSeconds: rest,
		weightStep: null,
	}
}

function kettlebell (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
	step = 2,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'kettlebell',
		trackingType: 'weight_reps',
		defaultRestSeconds: rest,
		weightStep: step,
	}
}

function band (
	id: string,
	name: string,
	muscle: MuscleGroup,
	rest: number,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'strength',
		muscleGroup: muscle,
		equipment: 'band',
		trackingType: 'bodyweight_reps',
		defaultRestSeconds: rest,
		weightStep: null,
	}
}

function cardio (
	id: string,
	name: string,
	trackingType: TrackingType,
	rest: number,
): BuiltinExerciseSeed {
	return {
		id,
		name,
		category: 'cardio',
		muscleGroup: 'cardio',
		equipment: 'cardio_machine',
		trackingType,
		defaultRestSeconds: rest,
		weightStep: null,
	}
}

/**
 * Built-in library (~130). Natural Russian names, no artificial duplicates.
 */
export const BUILTIN_EXERCISES: readonly BuiltinExerciseSeed[] = [
	// —— Грудь ——
	barbell('ex_sys_bench_press', 'Жим штанги лёжа', 'chest', 150),
	barbell('ex_sys_incline_bench_press', 'Жим штанги на наклонной скамье', 'chest', 150),
	barbell('ex_sys_decline_bench_press', 'Жим штанги на наклонной вниз', 'chest', 120),
	dumbbell('ex_sys_db_bench_press', 'Жим гантелей лёжа', 'chest', 120),
	dumbbell('ex_sys_db_incline_press', 'Жим гантелей на наклонной скамье', 'chest', 120),
	dumbbell('ex_sys_db_fly', 'Разведение гантелей лёжа', 'chest', 75),
	dumbbell('ex_sys_db_incline_fly', 'Разведение гантелей на наклонной', 'chest', 75),
	machine('ex_sys_pec_deck', 'Сведение рук в тренажёре', 'chest', 75),
	cable('ex_sys_cable_crossover', 'Кроссовер', 'chest', 75),
	cable('ex_sys_cable_fly', 'Сведение рук в кроссовере', 'chest', 75),
	bodyweight('ex_sys_push_up', 'Отжимания', 'chest', 60),
	bodyweight('ex_sys_diamond_push_up', 'Алмазные отжимания', 'chest', 60),
	bodyweight('ex_sys_dips_chest', 'Отжимания на брусьях', 'chest', 90),
	machine('ex_sys_chest_press_machine', 'Жим в тренажёре на грудь', 'chest', 90),
	dumbbell('ex_sys_db_pullover', 'Пуловер с гантелью', 'chest', 75),

	// —— Спина ——
	barbell('ex_sys_deadlift', 'Становая тяга', 'back', 180),
	barbell('ex_sys_romanian_deadlift_bar', 'Румынская тяга со штангой', 'back', 150),
	barbell('ex_sys_bent_over_row', 'Тяга штанги в наклоне', 'back', 120),
	barbell('ex_sys_t_bar_row', 'Тяга Т-грифа', 'back', 120),
	dumbbell('ex_sys_db_one_arm_row', 'Тяга гантели одной рукой', 'back', 90),
	dumbbell('ex_sys_db_bent_over_row', 'Тяга гантелей в наклоне', 'back', 90),
	cable('ex_sys_lat_pulldown', 'Тяга верхнего блока', 'back', 90),
	cable('ex_sys_seated_cable_row', 'Тяга нижнего блока', 'back', 90),
	cable('ex_sys_straight_arm_pulldown', 'Пуловер на блоке', 'back', 75),
	bodyweight('ex_sys_pull_up', 'Подтягивания', 'back', 120),
	bodyweight('ex_sys_chin_up', 'Подтягивания обратным хватом', 'back', 120),
	{
		id: 'ex_sys_assisted_pull_up',
		name: 'Подтягивания в гравитроне',
		category: 'strength',
		muscleGroup: 'back',
		equipment: 'machine',
		trackingType: 'assisted_reps',
		defaultRestSeconds: 90,
		weightStep: 5,
	},
	machine('ex_sys_back_extension', 'Гиперэкстензия', 'back', 60),
	bodyweight('ex_sys_inverted_row', 'Австралийские подтягивания', 'back', 75),
	machine('ex_sys_lat_pulldown_machine', 'Тяга верхнего блока в тренажёре', 'back', 90),
	barbell('ex_sys_shrug', 'Шраги со штангой', 'back', 75),
	dumbbell('ex_sys_db_shrug', 'Шраги с гантелями', 'back', 75),

	// —— Ноги ——
	barbell('ex_sys_back_squat', 'Приседания со штангой', 'legs', 180),
	barbell('ex_sys_front_squat', 'Фронтальные приседания', 'legs', 180),
	barbell('ex_sys_good_morning', 'Гудмонинг', 'legs', 120),
	machine('ex_sys_leg_press', 'Жим ногами', 'legs', 120),
	machine('ex_sys_leg_extension', 'Разгибание ног', 'legs', 75),
	machine('ex_sys_leg_curl', 'Сгибание ног', 'legs', 75),
	machine('ex_sys_hack_squat', 'Гакк-приседания', 'legs', 150),
	dumbbell('ex_sys_db_lunge', 'Выпады с гантелями', 'legs', 90),
	barbell('ex_sys_barbell_lunge', 'Выпады со штангой', 'legs', 120),
	dumbbell('ex_sys_bulgarian_split_squat', 'Болгарские выпады', 'legs', 90),
	dumbbell('ex_sys_goblet_squat', 'Гоблет-приседания', 'legs', 90, 2),
	dumbbell('ex_sys_db_romanian_deadlift', 'Румынская тяга с гантелями', 'legs', 120),
	barbell('ex_sys_sumo_deadlift', 'Становая тяга сумо', 'legs', 180),
	machine('ex_sys_adductor', 'Сведение ног в тренажёре', 'legs', 60),
	machine('ex_sys_abductor', 'Разведение ног в тренажёре', 'legs', 60),
	bodyweight('ex_sys_bodyweight_squat', 'Приседания без веса', 'legs', 60),
	bodyweight('ex_sys_walking_lunge', 'Выпады шагающие', 'legs', 60),
	machine('ex_sys_smith_squat', 'Приседания в Смите', 'legs', 150),

	// —— Ягодицы ——
	barbell('ex_sys_hip_thrust', 'Ягодичный мост со штангой', 'glutes', 120),
	dumbbell('ex_sys_db_hip_thrust', 'Ягодичный мост с гантелью', 'glutes', 90, 2),
	cable('ex_sys_cable_kickback', 'Отведение ноги на блоке', 'glutes', 60),
	machine('ex_sys_glute_kickback_machine', 'Отведение ноги в тренажёре', 'glutes', 60),
	band('ex_sys_band_side_walk', 'Боковая ходьба с резинкой', 'glutes', 45),
	bodyweight('ex_sys_glute_bridge', 'Ягодичный мост', 'glutes', 45),
	dumbbell('ex_sys_db_step_up', 'Зашагивания на платформу', 'glutes', 75),
	kettlebell('ex_sys_kb_swing_glute', 'Махи гирей', 'glutes', 75),

	// —— Икры ——
	machine('ex_sys_standing_calf_raise', 'Подъём на носки стоя', 'calves', 60, 5),
	machine('ex_sys_seated_calf_raise', 'Подъём на носки сидя', 'calves', 60, 5),
	dumbbell('ex_sys_db_calf_raise', 'Подъём на носки с гантелями', 'calves', 60),
	barbell('ex_sys_barbell_calf_raise', 'Подъём на носки со штангой', 'calves', 60),
	bodyweight('ex_sys_bw_calf_raise', 'Подъём на носки без веса', 'calves', 45),

	// —— Плечи ——
	barbell('ex_sys_overhead_press', 'Жим штанги стоя', 'shoulders', 150),
	barbell('ex_sys_military_press_seated', 'Армейский жим сидя', 'shoulders', 120),
	dumbbell('ex_sys_db_shoulder_press', 'Жим гантелей сидя', 'shoulders', 120),
	dumbbell('ex_sys_db_lateral_raise', 'Подъём гантелей через стороны', 'shoulders', 60),
	dumbbell('ex_sys_db_front_raise', 'Подъём гантелей перед собой', 'shoulders', 60),
	dumbbell('ex_sys_db_rear_delt_fly', 'Разведение гантелей в наклоне', 'shoulders', 60),
	machine('ex_sys_reverse_pec_deck', 'Обратная бабочка', 'shoulders', 60),
	cable('ex_sys_face_pull', 'Тяга каната к лицу', 'shoulders', 60),
	cable('ex_sys_cable_lateral_raise', 'Подъём руки через сторону на блоке', 'shoulders', 60),
	dumbbell('ex_sys_arnold_press', 'Жим Арнольда', 'shoulders', 90),
	barbell('ex_sys_upright_row', 'Тяга штанги к подбородку', 'shoulders', 90),
	machine('ex_sys_shoulder_press_machine', 'Жим в тренажёре на плечи', 'shoulders', 90),

	// —— Бицепс ——
	barbell('ex_sys_barbell_curl', 'Сгибание рук со штангой', 'biceps', 75),
	dumbbell('ex_sys_db_curl', 'Сгибание рук с гантелями', 'biceps', 60),
	dumbbell('ex_sys_hammer_curl', 'Молотковые сгибания', 'biceps', 60),
	machine('ex_sys_preacher_curl', 'Скамья Скотта', 'biceps', 60, 2.5),
	cable('ex_sys_cable_curl', 'Сгибание рук на нижнем блоке', 'biceps', 60),
	dumbbell('ex_sys_incline_db_curl', 'Сгибание рук на наклонной скамье', 'biceps', 60),
	dumbbell('ex_sys_concentration_curl', 'Концентрированные сгибания', 'biceps', 60),
	barbell('ex_sys_ez_bar_curl', 'Сгибание рук на EZ-грифе', 'biceps', 75),

	// —— Трицепс ——
	barbell('ex_sys_skull_crusher', 'Французский жим', 'triceps', 75),
	barbell('ex_sys_close_grip_bench', 'Жим узким хватом', 'triceps', 120),
	cable('ex_sys_triceps_pushdown', 'Разгибание рук на верхнем блоке', 'triceps', 60),
	cable('ex_sys_rope_pushdown', 'Разгибание рук с канатом', 'triceps', 60),
	dumbbell('ex_sys_overhead_triceps_ext', 'Разгибание гантели из-за головы', 'triceps', 60),
	dumbbell('ex_sys_db_kickback', 'Разгибание рук с гантелями назад', 'triceps', 60),
	bodyweight('ex_sys_bench_dip', 'Отжимания от скамьи', 'triceps', 60),
	cable('ex_sys_overhead_cable_ext', 'Разгибание из-за головы на блоке', 'triceps', 60),

	// —— Предплечья ——
	barbell('ex_sys_wrist_curl', 'Сгибание запястий со штангой', 'forearms', 45),
	barbell('ex_sys_reverse_wrist_curl', 'Разгибание запястий со штангой', 'forearms', 45),
	dumbbell('ex_sys_db_wrist_curl', 'Сгибание запястий с гантелями', 'forearms', 45),
	barbell('ex_sys_reverse_curl', 'Обратные сгибания со штангой', 'forearms', 60),
	dumbbell('ex_sys_farmer_walk', 'Прогулка фермера', 'forearms', 60, 2),

	// —— Кор ——
	bodyweight('ex_sys_crunch', 'Скручивания', 'core', 45),
	bodyweight('ex_sys_leg_raise', 'Подъём ног', 'core', 45),
	bodyweight('ex_sys_hanging_leg_raise', 'Подъём ног в висе', 'core', 60),
	bodyweight('ex_sys_plank', 'Планка', 'core', 45, 'duration'),
	bodyweight('ex_sys_side_plank', 'Боковая планка', 'core', 45, 'duration'),
	cable('ex_sys_cable_crunch', 'Скручивания на блоке', 'core', 45),
	bodyweight('ex_sys_russian_twist', 'Русские скручивания', 'core', 45),
	bodyweight('ex_sys_mountain_climber', 'Альпинист', 'core', 45),
	bodyweight('ex_sys_dead_bug', 'Мёртвый жук', 'core', 45),
	machine('ex_sys_ab_machine', 'Скручивания в тренажёре', 'core', 45, 5),
	dumbbell('ex_sys_db_side_bend', 'Наклоны с гантелью', 'core', 45),
	bodyweight('ex_sys_bicycle_crunch', 'Велосипед', 'core', 45),

	// —— Гири ——
	kettlebell('ex_sys_kb_goblet_squat', 'Гоблет-приседания с гирей', 'legs', 90),
	kettlebell('ex_sys_kb_clean', 'Взятие гири на грудь', 'full_body', 90),
	kettlebell('ex_sys_kb_press', 'Жим гири', 'shoulders', 90),
	kettlebell('ex_sys_kb_snatch', 'Рывок гири', 'full_body', 90),
	kettlebell('ex_sys_kb_row', 'Тяга гири в наклоне', 'back', 75),
	kettlebell('ex_sys_kb_deadlift', 'Становая тяга с гирей', 'legs', 90),
	kettlebell('ex_sys_kb_turkish_getup', 'Турецкий подъём', 'full_body', 90),

	// —— Резинки ——
	band('ex_sys_band_pull_apart', 'Разведение рук с резинкой', 'shoulders', 45),
	band('ex_sys_band_row', 'Тяга с резинкой', 'back', 60),
	band('ex_sys_band_chest_press', 'Жим с резинкой', 'chest', 60),
	band('ex_sys_band_squat', 'Приседания с резинкой', 'legs', 60),
	band('ex_sys_band_biceps_curl', 'Сгибание рук с резинкой', 'biceps', 45),
	band('ex_sys_band_triceps_ext', 'Разгибание рук с резинкой', 'triceps', 45),
	band('ex_sys_band_glute_bridge', 'Ягодичный мост с резинкой', 'glutes', 45),
	band('ex_sys_band_face_pull', 'Тяга к лицу с резинкой', 'shoulders', 45),

	// —— Кардио ——
	cardio('ex_sys_treadmill', 'Беговая дорожка', 'distance_duration', 60),
	cardio('ex_sys_exercise_bike', 'Велотренажёр', 'distance_duration', 60),
	cardio('ex_sys_elliptical', 'Эллиптический тренажёр', 'distance_duration', 60),
	cardio('ex_sys_rowing_machine', 'Гребной тренажёр', 'distance_duration', 60),
	cardio('ex_sys_stair_climber', 'Степпер', 'duration', 60),
	cardio('ex_sys_ski_erg', 'Лыжный тренажёр', 'distance_duration', 60),
	{
		id: 'ex_sys_jump_rope',
		name: 'Скакалка',
		category: 'cardio',
		muscleGroup: 'cardio',
		equipment: 'other',
		trackingType: 'duration',
		defaultRestSeconds: 45,
		weightStep: null,
	},
	{
		id: 'ex_sys_burpee',
		name: 'Бёрпи',
		category: 'cardio',
		muscleGroup: 'full_body',
		equipment: 'bodyweight',
		trackingType: 'bodyweight_reps',
		defaultRestSeconds: 60,
		weightStep: null,
	},
	{
		id: 'ex_sys_box_jump',
		name: 'Запрыгивания на тумбу',
		category: 'cardio',
		muscleGroup: 'legs',
		equipment: 'bodyweight',
		trackingType: 'bodyweight_reps',
		defaultRestSeconds: 75,
		weightStep: null,
	},
	{
		id: 'ex_sys_battle_ropes',
		name: 'Канаты',
		category: 'cardio',
		muscleGroup: 'full_body',
		equipment: 'other',
		trackingType: 'duration',
		defaultRestSeconds: 60,
		weightStep: null,
	},

	// —— Всё тело / другое ——
	barbell('ex_sys_clean_and_press', 'Взятие на грудь и жим', 'full_body', 150),
	barbell('ex_sys_power_clean', 'Пауэрклин', 'full_body', 150),
	dumbbell('ex_sys_db_thruster', 'Трастеры с гантелями', 'full_body', 90, 2),
	bodyweight('ex_sys_jumping_jack', 'Прыжки ноги врозь', 'full_body', 30, 'duration'),
	{
		id: 'ex_sys_medicine_ball_slam',
		name: 'Удары медболом об пол',
		category: 'strength',
		muscleGroup: 'full_body',
		equipment: 'other',
		trackingType: 'weight_reps',
		defaultRestSeconds: 60,
		weightStep: 1,
	},
	{
		id: 'ex_sys_wall_sit',
		name: 'Стульчик у стены',
		category: 'strength',
		muscleGroup: 'legs',
		equipment: 'bodyweight',
		trackingType: 'duration',
		defaultRestSeconds: 45,
		weightStep: null,
	},
] as const

export const BUILTIN_EXERCISE_COUNT = BUILTIN_EXERCISES.length

export const REQUIRED_BUILTIN_NAMES = [
	'Жим штанги лёжа',
	'Жим штанги на наклонной скамье',
	'Жим гантелей лёжа',
	'Жим гантелей на наклонной скамье',
	'Разведение гантелей лёжа',
	'Сведение рук в тренажёре',
	'Кроссовер',
	'Отжимания',
	'Отжимания на брусьях',
	'Становая тяга',
	'Тяга штанги в наклоне',
	'Тяга гантели одной рукой',
	'Тяга верхнего блока',
	'Тяга нижнего блока',
	'Подтягивания',
	'Тяга Т-грифа',
	'Пуловер на блоке',
	'Гиперэкстензия',
	'Приседания со штангой',
	'Фронтальные приседания',
	'Жим ногами',
	'Разгибание ног',
	'Сгибание ног',
	'Румынская тяга со штангой',
	'Выпады с гантелями',
	'Болгарские выпады',
	'Гакк-приседания',
	'Подъём на носки стоя',
	'Жим штанги стоя',
	'Жим гантелей сидя',
	'Подъём гантелей через стороны',
	'Подъём гантелей перед собой',
	'Разведение гантелей в наклоне',
	'Обратная бабочка',
	'Тяга каната к лицу',
	'Сгибание рук со штангой',
	'Сгибание рук с гантелями',
	'Молотковые сгибания',
	'Скамья Скотта',
	'Сгибание рук на нижнем блоке',
	'Французский жим',
	'Жим узким хватом',
	'Разгибание рук на верхнем блоке',
	'Разгибание рук с канатом',
	'Разгибание гантели из-за головы',
	'Скручивания',
	'Подъём ног',
	'Планка',
	'Боковая планка',
	'Скручивания на блоке',
] as const
