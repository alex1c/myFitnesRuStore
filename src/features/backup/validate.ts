/**
 * Parse and validate unknown JSON into FitnessBackupV1 without unsafe casts.
 */
import {
	BACKUP_FORMAT_ID,
	BACKUP_FORMAT_VERSION,
	BackupValidationError,
	type BackupExerciseRow,
	type BackupExerciseSettingsRow,
	type BackupPayloadData,
	type BackupSetRow,
	type BackupTemplateExerciseRow,
	type BackupTemplateRow,
	type BackupWorkoutExerciseRow,
	type BackupWorkoutRow,
	type FitnessBackupV1,
} from './types'

export function parseBackupJson (raw: string): FitnessBackupV1 {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'PARSE',
		)
	}
	return validateBackup(parsed)
}

export function validateBackup (input: unknown): FitnessBackupV1 {
	if (!isRecord(input)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'FORMAT',
		)
	}
	if (input.format !== BACKUP_FORMAT_ID) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'FORMAT',
		)
	}
	if (typeof input.version !== 'number' || !Number.isInteger(input.version)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'FORMAT',
		)
	}
	if (input.version > BACKUP_FORMAT_VERSION) {
		throw new BackupValidationError(
			'Эта резервная копия создана более новой версией приложения. Обновите приложение и попробуйте снова.',
			'VERSION',
		)
	}
	if (input.version < 1) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'VERSION',
		)
	}
	if (typeof input.createdAt !== 'string' || typeof input.appVersion !== 'string') {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	if (!isRecord(input.data)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}

	const data = validateData(input.data)
	validateIntegrity(data)

	return {
		format: BACKUP_FORMAT_ID,
		version: BACKUP_FORMAT_VERSION,
		createdAt: input.createdAt,
		appVersion: input.appVersion,
		data,
	}
}

function validateData (data: Record<string, unknown>): BackupPayloadData {
	return {
		customExercises: asArray(data.customExercises).map(parseExercise),
		exerciseUserSettings: asArray(data.exerciseUserSettings).map(
			parseSettings,
		),
		workoutTemplates: asArray(data.workoutTemplates).map(parseTemplate),
		templateExercises: asArray(data.templateExercises).map(
			parseTemplateExercise,
		),
		workouts: asArray(data.workouts).map(parseWorkout),
		workoutExercises: asArray(data.workoutExercises).map(
			parseWorkoutExercise,
		),
		sets: asArray(data.sets).map(parseSet),
	}
}

function validateIntegrity (data: BackupPayloadData): void {
	assertUniqueIds(
		data.customExercises.map((item) => item.id),
		'customExercises',
	)
	assertUniqueIds(
		data.exerciseUserSettings.map((item) => item.exerciseId),
		'exerciseUserSettings',
	)
	assertUniqueIds(
		data.workoutTemplates.map((item) => item.id),
		'workoutTemplates',
	)
	assertUniqueIds(
		data.templateExercises.map((item) => item.id),
		'templateExercises',
	)
	assertUniqueIds(
		data.workouts.map((item) => item.id),
		'workouts',
	)
	assertUniqueIds(
		data.workoutExercises.map((item) => item.id),
		'workoutExercises',
	)
	assertUniqueIds(
		data.sets.map((item) => item.id),
		'sets',
	)

	const active = data.workouts.filter((item) => item.finishedAt === null)
	if (active.length > 1) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'INTEGRITY',
		)
	}

	const customIds = new Set(data.customExercises.map((item) => item.id))
	const templateIds = new Set(data.workoutTemplates.map((item) => item.id))
	const workoutIds = new Set(data.workouts.map((item) => item.id))
	const workoutExerciseIds = new Set(
		data.workoutExercises.map((item) => item.id),
	)
	const setIds = new Set(data.sets.map((item) => item.id))

	for (const exercise of data.customExercises) {
		if (!exercise.isCustom) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
	}

	for (const row of data.templateExercises) {
		if (!templateIds.has(row.templateId)) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
	}

	for (const row of data.workoutExercises) {
		if (!workoutIds.has(row.workoutId)) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
	}

	for (const row of data.sets) {
		if (!workoutExerciseIds.has(row.workoutExerciseId)) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
	}

	for (const workout of data.workouts) {
		if (
			workout.restSetId
			&& !setIds.has(workout.restSetId)
		) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
		if (
			workout.restWorkoutExerciseId
			&& !workoutExerciseIds.has(workout.restWorkoutExerciseId)
		) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
		if (workout.templateId && !templateIds.has(workout.templateId)) {
			throw new BackupValidationError(
				'Не удалось прочитать резервную копию.',
				'INTEGRITY',
			)
		}
	}

	// Settings may reference built-in exercise ids (not in customExercises).
	for (const settings of data.exerciseUserSettings) {
		if (customIds.has(settings.exerciseId)) {
			continue
		}
		if (!settings.exerciseId.startsWith('ex_sys_') && !settings.exerciseId.startsWith('ex_')) {
			// Allow any non-empty id; FK checked at restore against seeded+custom.
			if (!settings.exerciseId) {
				throw new BackupValidationError(
					'Не удалось прочитать резервную копию.',
					'INTEGRITY',
				)
			}
		}
	}
}

function assertUniqueIds (ids: string[], label: string): void {
	const seen = new Set<string>()
	for (const id of ids) {
		if (seen.has(id)) {
			throw new BackupValidationError(
				`Не удалось прочитать резервную копию. (${label})`,
				'INTEGRITY',
			)
		}
		seen.add(id)
	}
}

function parseExercise (input: unknown): BackupExerciseRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		name: requireString(row.name),
		category: requireString(row.category),
		muscleGroup: requireString(row.muscleGroup),
		equipment: requireString(row.equipment),
		trackingType: requireString(row.trackingType),
		defaultRestSeconds: requireNumber(row.defaultRestSeconds),
		weightStep: optionalNumber(row.weightStep),
		notes: optionalString(row.notes),
		isCustom: requireBoolean(row.isCustom),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
		archivedAt: optionalString(row.archivedAt),
	}
}

function parseSettings (input: unknown): BackupExerciseSettingsRow {
	const row = requireRecord(input)
	return {
		exerciseId: requireString(row.exerciseId),
		defaultRestSeconds: optionalNumber(row.defaultRestSeconds),
		weightStep: optionalNumber(row.weightStep),
		notes: optionalString(row.notes),
		updatedAt: requireString(row.updatedAt),
	}
}

function parseTemplate (input: unknown): BackupTemplateRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		name: requireString(row.name),
		description: optionalString(row.description),
		position: requireNumber(row.position),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
		archivedAt: optionalString(row.archivedAt),
	}
}

function parseTemplateExercise (input: unknown): BackupTemplateExerciseRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		templateId: requireString(row.templateId),
		exerciseId: requireString(row.exerciseId),
		position: requireNumber(row.position),
		plannedSets: optionalNumber(row.plannedSets),
		targetRepsMin: optionalNumber(row.targetRepsMin),
		targetRepsMax: optionalNumber(row.targetRepsMax),
		restSeconds: optionalNumber(row.restSeconds),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
	}
}

function parseWorkout (input: unknown): BackupWorkoutRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		templateId: optionalString(row.templateId),
		name: requireString(row.name),
		startedAt: requireString(row.startedAt),
		finishedAt: optionalString(row.finishedAt),
		notes: optionalString(row.notes),
		restStartedAt: optionalString(row.restStartedAt),
		restEndsAt: optionalString(row.restEndsAt),
		restWorkoutExerciseId: optionalString(row.restWorkoutExerciseId),
		restSetId: optionalString(row.restSetId),
		restNotificationId: optionalString(row.restNotificationId),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
	}
}

function parseWorkoutExercise (input: unknown): BackupWorkoutExerciseRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		workoutId: requireString(row.workoutId),
		exerciseId: requireString(row.exerciseId),
		position: requireNumber(row.position),
		notes: optionalString(row.notes),
		restSeconds: optionalNumber(row.restSeconds),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
	}
}

function parseSet (input: unknown): BackupSetRow {
	const row = requireRecord(input)
	return {
		id: requireString(row.id),
		workoutExerciseId: requireString(row.workoutExerciseId),
		position: requireNumber(row.position),
		setType: requireString(row.setType),
		weight: optionalNumber(row.weight),
		reps: optionalInteger(row.reps),
		durationSeconds: optionalInteger(row.durationSeconds),
		distance: optionalNumber(row.distance),
		completedAt: optionalString(row.completedAt),
		createdAt: requireString(row.createdAt),
		updatedAt: requireString(row.updatedAt),
	}
}

function isRecord (value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord (value: unknown): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}

function asArray (value: unknown): unknown[] {
	if (!Array.isArray(value)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}

function requireString (value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}

function optionalString (value: unknown): string | null {
	if (value === null || value === undefined) {
		return null
	}
	if (typeof value !== 'string') {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}

function requireNumber (value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}

function optionalNumber (value: unknown): number | null {
	if (value === null || value === undefined) {
		return null
	}
	return requireNumber(value)
}

function optionalInteger (value: unknown): number | null {
	const number = optionalNumber(value)
	if (number === null) {
		return null
	}
	if (!Number.isInteger(number)) {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return number
}

function requireBoolean (value: unknown): boolean {
	if (typeof value !== 'boolean') {
		throw new BackupValidationError(
			'Не удалось прочитать резервную копию.',
			'STRUCTURE',
		)
	}
	return value
}
