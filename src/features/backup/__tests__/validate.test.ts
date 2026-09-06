/**
 * Backup validation unit tests — format, version, integrity.
 */
import {
	BACKUP_FORMAT_ID,
	BACKUP_FORMAT_VERSION,
	BackupValidationError,
} from '@/src/features/backup/types'
import { parseBackupJson, validateBackup } from '@/src/features/backup/validate'

function minimalBackup (overrides: Record<string, unknown> = {}) {
	return {
		format: BACKUP_FORMAT_ID,
		version: BACKUP_FORMAT_VERSION,
		createdAt: '2026-09-07T00:00:00.000Z',
		appVersion: '1.0.0',
		data: {
			customExercises: [],
			exerciseUserSettings: [],
			workoutTemplates: [],
			templateExercises: [],
			workouts: [],
			workoutExercises: [],
			sets: [],
		},
		...overrides,
	}
}

describe('backup validation', () => {
	it('rejects malformed JSON', () => {
		expect(() => parseBackupJson('{not-json')).toThrow(BackupValidationError)
		try {
			parseBackupJson('{not-json')
		} catch (error) {
			expect(error).toBeInstanceOf(BackupValidationError)
			expect((error as BackupValidationError).message).toBe(
				'Не удалось прочитать резервную копию.',
			)
		}
	})

	it('rejects wrong format magic', () => {
		expect(() =>
			validateBackup({
				...minimalBackup(),
				format: 'other-backup',
			}),
		).toThrow(BackupValidationError)
	})

	it('rejects unsupported future version', () => {
		try {
			validateBackup(minimalBackup({ version: 999 }))
			throw new Error('expected throw')
		} catch (error) {
			expect(error).toBeInstanceOf(BackupValidationError)
			expect((error as BackupValidationError).code).toBe('VERSION')
			expect((error as BackupValidationError).message).toContain(
				'более новой версией',
			)
		}
	})

	it('rejects duplicate primary keys', () => {
		expect(() =>
			validateBackup(
				minimalBackup({
					data: {
						...minimalBackup().data,
						workouts: [
							{
								id: 'wo_1',
								templateId: null,
								name: 'A',
								startedAt: '2026-01-01T00:00:00.000Z',
								finishedAt: '2026-01-01T01:00:00.000Z',
								notes: null,
								restStartedAt: null,
								restEndsAt: null,
								restWorkoutExerciseId: null,
								restSetId: null,
								restNotificationId: null,
								createdAt: '2026-01-01T00:00:00.000Z',
								updatedAt: '2026-01-01T00:00:00.000Z',
							},
							{
								id: 'wo_1',
								templateId: null,
								name: 'B',
								startedAt: '2026-01-02T00:00:00.000Z',
								finishedAt: '2026-01-02T01:00:00.000Z',
								notes: null,
								restStartedAt: null,
								restEndsAt: null,
								restWorkoutExerciseId: null,
								restSetId: null,
								restNotificationId: null,
								createdAt: '2026-01-02T00:00:00.000Z',
								updatedAt: '2026-01-02T00:00:00.000Z',
							},
						],
					},
				}),
			),
		).toThrow(BackupValidationError)
	})

	it('rejects two active workouts', () => {
		expect(() =>
			validateBackup(
				minimalBackup({
					data: {
						...minimalBackup().data,
						workouts: [
							{
								id: 'wo_a',
								templateId: null,
								name: 'A',
								startedAt: '2026-01-01T00:00:00.000Z',
								finishedAt: null,
								notes: null,
								restStartedAt: null,
								restEndsAt: null,
								restWorkoutExerciseId: null,
								restSetId: null,
								restNotificationId: null,
								createdAt: '2026-01-01T00:00:00.000Z',
								updatedAt: '2026-01-01T00:00:00.000Z',
							},
							{
								id: 'wo_b',
								templateId: null,
								name: 'B',
								startedAt: '2026-01-02T00:00:00.000Z',
								finishedAt: null,
								notes: null,
								restStartedAt: null,
								restEndsAt: null,
								restWorkoutExerciseId: null,
								restSetId: null,
								restNotificationId: null,
								createdAt: '2026-01-02T00:00:00.000Z',
								updatedAt: '2026-01-02T00:00:00.000Z',
							},
						],
					},
				}),
			),
		).toThrow(BackupValidationError)
	})

	it('accepts a valid empty backup', () => {
		const backup = validateBackup(minimalBackup())
		expect(backup.format).toBe(BACKUP_FORMAT_ID)
		expect(backup.version).toBe(BACKUP_FORMAT_VERSION)
	})
})
