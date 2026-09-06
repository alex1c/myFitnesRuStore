/**
 * Backup create / atomic restore / CSV export for user workout data.
 * App version is a plain constant so Jest does not load native Expo modules.
 */
import {
	BACKUP_FORMAT_ID,
	BACKUP_FORMAT_VERSION,
	BackupValidationError,
	type BackupExerciseRow,
	type BackupPayloadData,
	type BackupWorkoutRow,
	type FitnessBackupV1,
} from '@/src/features/backup/types'
import { parseBackupJson } from '@/src/features/backup/validate'
import {
	buildWorkoutsCsv,
	type CsvSetRow,
} from '@/src/features/backup/csv'
import { nowIso } from '@/src/utils/dates'
import type { AppDatabase } from '../client'
import { upsertBuiltinExercises } from '../seed/seed-builtin-exercises'

/** Marketing version written into backup metadata (keep in sync with app.json). */
const APP_VERSION = '1.0.0'

export class BackupService {
	constructor (private readonly db: AppDatabase) {}

	async createBackup (): Promise<FitnessBackupV1> {
		const data = await this.collectUserData()
		return {
			format: BACKUP_FORMAT_ID,
			version: BACKUP_FORMAT_VERSION,
			createdAt: nowIso(),
			appVersion: APP_VERSION,
			data,
		}
	}

	serializeBackup (backup: FitnessBackupV1): string {
		return `${JSON.stringify(backup, null, 2)}\n`
	}

	/**
	 * Full replace restore. Atomic: on any error the previous DB state remains.
	 */
	async restoreFromJson (raw: string): Promise<void> {
		const backup = parseBackupJson(raw)
		await this.restoreValidated(backup)
	}

	async restoreValidated (backup: FitnessBackupV1): Promise<void> {
		await this.db.withTransactionAsync(async () => {
			await this.clearUserData()
			await upsertBuiltinExercises(this.db)
			await this.insertUserData(backup.data)
			await this.assertPostRestoreIntegrity(backup.data)
		})
	}

	async exportCompletedSetsCsv (): Promise<string> {
		const rows = await this.db.getAllAsync<{
			workout_date: string
			workout_name: string
			exercise_name: string
			exercise_id: string
			set_number: number
			set_type: string
			tracking_type: string
			weight: number | null
			reps: number | null
			duration_seconds: number | null
			distance: number | null
			workout_notes: string | null
			exercise_notes: string | null
			workout_id: string
		}>(
			`SELECT
				COALESCE(w.finished_at, w.started_at) AS workout_date,
				w.name AS workout_name,
				e.name AS exercise_name,
				e.id AS exercise_id,
				(s.position + 1) AS set_number,
				s.set_type AS set_type,
				e.tracking_type AS tracking_type,
				s.weight AS weight,
				s.reps AS reps,
				s.duration_seconds AS duration_seconds,
				s.distance AS distance,
				w.notes AS workout_notes,
				we.notes AS exercise_notes,
				w.id AS workout_id
			 FROM sets s
			 INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
			 INNER JOIN workouts w ON w.id = we.workout_id
			 INNER JOIN exercises e ON e.id = we.exercise_id
			 WHERE s.completed_at IS NOT NULL
			   AND w.finished_at IS NOT NULL
			 ORDER BY w.finished_at ASC, w.id ASC, we.position ASC, s.position ASC, s.id ASC`,
		)

		const csvRows: CsvSetRow[] = rows.map((row) => ({
			workoutDate: row.workout_date,
			workoutName: row.workout_name,
			exerciseName: row.exercise_name,
			exerciseId: row.exercise_id,
			setNumber: row.set_number,
			setType: row.set_type,
			trackingType: row.tracking_type,
			weightKg: row.weight,
			reps: row.reps,
			durationSeconds: row.duration_seconds,
			distance: row.distance,
			workoutNotes: row.workout_notes,
			exerciseNotes: row.exercise_notes,
			workoutId: row.workout_id,
		}))

		return buildWorkoutsCsv(csvRows)
	}

	private async collectUserData (): Promise<BackupPayloadData> {
		const customExercises = await this.db.getAllAsync<{
			id: string
			name: string
			category: string
			muscle_group: string
			equipment: string
			tracking_type: string
			default_rest_seconds: number
			weight_step: number | null
			notes: string | null
			is_custom: number
			created_at: string
			updated_at: string
			archived_at: string | null
		}>(
			`SELECT * FROM exercises WHERE is_custom = 1 ORDER BY id ASC`,
		)

		const exerciseUserSettings = await this.db.getAllAsync<{
			exercise_id: string
			default_rest_seconds: number | null
			weight_step: number | null
			notes: string | null
			updated_at: string
		}>(`SELECT * FROM exercise_user_settings ORDER BY exercise_id ASC`)

		const workoutTemplates = await this.db.getAllAsync<{
			id: string
			name: string
			description: string | null
			position: number
			created_at: string
			updated_at: string
			archived_at: string | null
		}>(`SELECT * FROM workout_templates ORDER BY position ASC, id ASC`)

		const templateExercises = await this.db.getAllAsync<{
			id: string
			template_id: string
			exercise_id: string
			position: number
			planned_sets: number | null
			target_reps_min: number | null
			target_reps_max: number | null
			rest_seconds: number | null
			created_at: string
			updated_at: string
		}>(`SELECT * FROM template_exercises ORDER BY template_id ASC, position ASC`)

		const workouts = await this.db.getAllAsync<{
			id: string
			template_id: string | null
			name: string
			started_at: string
			finished_at: string | null
			notes: string | null
			rest_started_at: string | null
			rest_ends_at: string | null
			rest_workout_exercise_id: string | null
			rest_set_id: string | null
			rest_notification_id: string | null
			created_at: string
			updated_at: string
		}>(`SELECT * FROM workouts ORDER BY started_at ASC, id ASC`)

		const workoutExercises = await this.db.getAllAsync<{
			id: string
			workout_id: string
			exercise_id: string
			position: number
			notes: string | null
			rest_seconds: number | null
			created_at: string
			updated_at: string
		}>(
			`SELECT * FROM workout_exercises ORDER BY workout_id ASC, position ASC`,
		)

		const sets = await this.db.getAllAsync<{
			id: string
			workout_exercise_id: string
			position: number
			set_type: string
			weight: number | null
			reps: number | null
			duration_seconds: number | null
			distance: number | null
			completed_at: string | null
			created_at: string
			updated_at: string
		}>(
			`SELECT * FROM sets ORDER BY workout_exercise_id ASC, position ASC, id ASC`,
		)

		return {
			customExercises: customExercises.map(
				(row): BackupExerciseRow => ({
					id: row.id,
					name: row.name,
					category: row.category,
					muscleGroup: row.muscle_group,
					equipment: row.equipment,
					trackingType: row.tracking_type,
					defaultRestSeconds: row.default_rest_seconds,
					weightStep: row.weight_step,
					notes: row.notes,
					isCustom: row.is_custom === 1,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
					archivedAt: row.archived_at,
				}),
			),
			exerciseUserSettings: exerciseUserSettings.map((row) => ({
				exerciseId: row.exercise_id,
				defaultRestSeconds: row.default_rest_seconds,
				weightStep: row.weight_step,
				notes: row.notes,
				updatedAt: row.updated_at,
			})),
			workoutTemplates: workoutTemplates.map((row) => ({
				id: row.id,
				name: row.name,
				description: row.description,
				position: row.position,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				archivedAt: row.archived_at,
			})),
			templateExercises: templateExercises.map((row) => ({
				id: row.id,
				templateId: row.template_id,
				exerciseId: row.exercise_id,
				position: row.position,
				plannedSets: row.planned_sets,
				targetRepsMin: row.target_reps_min,
				targetRepsMax: row.target_reps_max,
				restSeconds: row.rest_seconds,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			})),
			workouts: workouts.map(
				(row): BackupWorkoutRow => ({
					id: row.id,
					templateId: row.template_id,
					name: row.name,
					startedAt: row.started_at,
					finishedAt: row.finished_at,
					notes: row.notes,
					restStartedAt: row.rest_started_at,
					restEndsAt: row.rest_ends_at,
					restWorkoutExerciseId: row.rest_workout_exercise_id,
					restSetId: row.rest_set_id,
					restNotificationId: row.rest_notification_id,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}),
			),
			workoutExercises: workoutExercises.map((row) => ({
				id: row.id,
				workoutId: row.workout_id,
				exerciseId: row.exercise_id,
				position: row.position,
				notes: row.notes,
				restSeconds: row.rest_seconds,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			})),
			sets: sets.map((row) => ({
				id: row.id,
				workoutExerciseId: row.workout_exercise_id,
				position: row.position,
				setType: row.set_type,
				weight: row.weight,
				reps: row.reps,
				durationSeconds: row.duration_seconds,
				distance: row.distance,
				completedAt: row.completed_at,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			})),
		}
	}

	private async clearUserData (): Promise<void> {
		await this.db.runAsync('DELETE FROM sets')
		await this.db.runAsync('DELETE FROM workout_exercises')
		await this.db.runAsync('DELETE FROM workouts')
		await this.db.runAsync('DELETE FROM template_exercises')
		await this.db.runAsync('DELETE FROM workout_templates')
		await this.db.runAsync('DELETE FROM exercise_user_settings')
		await this.db.runAsync('DELETE FROM exercises WHERE is_custom = 1')
	}

	private async insertUserData (data: BackupPayloadData): Promise<void> {
		for (const exercise of data.customExercises) {
			await this.db.runAsync(
				`INSERT INTO exercises (
					id, name, category, muscle_group, equipment, tracking_type,
					default_rest_seconds, weight_step, notes, is_custom,
					created_at, updated_at, archived_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
				[
					exercise.id,
					exercise.name,
					exercise.category,
					exercise.muscleGroup,
					exercise.equipment,
					exercise.trackingType,
					exercise.defaultRestSeconds,
					exercise.weightStep,
					exercise.notes,
					exercise.createdAt,
					exercise.updatedAt,
					exercise.archivedAt,
				],
			)
		}

		for (const settings of data.exerciseUserSettings) {
			const exists = await this.db.getFirstAsync<{ id: string }>(
				'SELECT id FROM exercises WHERE id = ?',
				[settings.exerciseId],
			)
			if (!exists) {
				throw new BackupValidationError(
					'Не удалось восстановить данные. Текущие данные не изменены.',
					'INTEGRITY',
				)
			}
			await this.db.runAsync(
				`INSERT INTO exercise_user_settings (
					exercise_id, default_rest_seconds, weight_step, notes, updated_at
				) VALUES (?, ?, ?, ?, ?)`,
				[
					settings.exerciseId,
					settings.defaultRestSeconds,
					settings.weightStep,
					settings.notes,
					settings.updatedAt,
				],
			)
		}

		for (const template of data.workoutTemplates) {
			await this.db.runAsync(
				`INSERT INTO workout_templates (
					id, name, description, position, created_at, updated_at, archived_at
				) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					template.id,
					template.name,
					template.description,
					template.position,
					template.createdAt,
					template.updatedAt,
					template.archivedAt,
				],
			)
		}

		for (const item of data.templateExercises) {
			await this.db.runAsync(
				`INSERT INTO template_exercises (
					id, template_id, exercise_id, position, planned_sets,
					target_reps_min, target_reps_max, rest_seconds, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					item.id,
					item.templateId,
					item.exerciseId,
					item.position,
					item.plannedSets,
					item.targetRepsMin,
					item.targetRepsMax,
					item.restSeconds,
					item.createdAt,
					item.updatedAt,
				],
			)
		}

		for (const workout of data.workouts) {
			await this.db.runAsync(
				`INSERT INTO workouts (
					id, template_id, name, started_at, finished_at, notes,
					rest_started_at, rest_ends_at, rest_workout_exercise_id,
					rest_set_id, rest_notification_id, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
				[
					workout.id,
					workout.templateId,
					workout.name,
					workout.startedAt,
					workout.finishedAt,
					workout.notes,
					workout.restStartedAt,
					workout.restEndsAt,
					workout.restWorkoutExerciseId,
					workout.restSetId,
					workout.createdAt,
					workout.updatedAt,
				],
			)
		}

		for (const item of data.workoutExercises) {
			await this.db.runAsync(
				`INSERT INTO workout_exercises (
					id, workout_id, exercise_id, position, notes, rest_seconds,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					item.id,
					item.workoutId,
					item.exerciseId,
					item.position,
					item.notes,
					item.restSeconds,
					item.createdAt,
					item.updatedAt,
				],
			)
		}

		for (const set of data.sets) {
			await this.db.runAsync(
				`INSERT INTO sets (
					id, workout_exercise_id, position, set_type, weight, reps,
					duration_seconds, distance, completed_at, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					set.id,
					set.workoutExerciseId,
					set.position,
					set.setType,
					set.weight,
					set.reps,
					set.durationSeconds,
					set.distance,
					set.completedAt,
					set.createdAt,
					set.updatedAt,
				],
			)
		}
	}

	private async assertPostRestoreIntegrity (
		expected: BackupPayloadData,
	): Promise<void> {
		const fkIssues = await this.db.getAllAsync<{
			table: string
			rowid: number
			parent: string
			fkid: number
		}>('PRAGMA foreign_key_check')
		if (fkIssues.length > 0) {
			throw new BackupValidationError(
				'Не удалось восстановить данные. Текущие данные не изменены.',
				'INTEGRITY',
			)
		}

		const active = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM workouts WHERE finished_at IS NULL`,
		)
		if ((active?.count ?? 0) > 1) {
			throw new BackupValidationError(
				'Не удалось восстановить данные. Текущие данные не изменены.',
				'INTEGRITY',
			)
		}

		const customs = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM exercises WHERE is_custom = 1`,
		)
		if ((customs?.count ?? 0) !== expected.customExercises.length) {
			throw new BackupValidationError(
				'Не удалось восстановить данные. Текущие данные не изменены.',
				'INTEGRITY',
			)
		}

		const workouts = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM workouts`,
		)
		if ((workouts?.count ?? 0) !== expected.workouts.length) {
			throw new BackupValidationError(
				'Не удалось восстановить данные. Текущие данные не изменены.',
				'INTEGRITY',
			)
		}

		const sets = await this.db.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) AS count FROM sets`,
		)
		if ((sets?.count ?? 0) !== expected.sets.length) {
			throw new BackupValidationError(
				'Не удалось восстановить данные. Текущие данные не изменены.',
				'INTEGRITY',
			)
		}
	}
}

export function createBackupService (db: AppDatabase): BackupService {
	return new BackupService(db)
}

export function backupFileName (date = new Date()): string {
	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `moy-sportzal-backup-${yyyy}-${mm}-${dd}.json`
}

export function csvFileName (date = new Date()): string {
	const yyyy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `moy-sportzal-workouts-${yyyy}-${mm}-${dd}.csv`
}
