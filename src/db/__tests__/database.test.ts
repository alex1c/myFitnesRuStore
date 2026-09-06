/**
 * Database foundation smoke tests using an in-memory SQLite adapter.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import {
	getSchemaVersion,
	LATEST_SCHEMA_VERSION,
} from '@/src/db/migrations'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'

async function setup () {
	const db = await createMemoryDatabase()
	const result = await initializeProvidedDatabase(db)
	return {
		db: result.db,
		schemaVersion: result.schemaVersion,
		exercises: new ExerciseRepository(result.db),
		templates: new WorkoutTemplateRepository(result.db),
	}
}

describe('database foundation', () => {
	it('applies migration 001 and reports schema version 1', async () => {
		const { db, schemaVersion } = await setup()

		expect(schemaVersion).toBe(1)
		expect(LATEST_SCHEMA_VERSION).toBe(1)
		expect(await getSchemaVersion(db)).toBe(1)

		const tables = await db.getAllAsync<{ name: string }>(
			`SELECT name FROM sqlite_master
			 WHERE type = 'table'
			 ORDER BY name`,
		)
		const names = tables.map((row) => row.name)

		expect(names).toEqual(
			expect.arrayContaining([
				'exercises',
				'workout_templates',
				'template_exercises',
				'workouts',
				'workout_exercises',
				'sets',
				'schema_migrations',
			]),
		)

		await db.closeAsync()
	})

	it('re-initialization does not break an existing database', async () => {
		const db = await createMemoryDatabase()
		const first = await initializeProvidedDatabase(db)
		const exerciseRepo = new ExerciseRepository(db)
		await exerciseRepo.create({ name: 'Жим лёжа' })

		const second = await initializeProvidedDatabase(db)
		expect(second.schemaVersion).toBe(first.schemaVersion)

		const listed = await exerciseRepo.list()
		expect(listed).toHaveLength(1)
		expect(listed[0]?.name).toBe('Жим лёжа')

		await db.closeAsync()
	})

	it('supports exercise CRUD and soft archive', async () => {
		const { exercises, db } = await setup()

		const created = await exercises.create({
			name: 'Приседания',
			muscleGroup: 'legs',
			equipment: 'barbell',
			trackingType: 'weight_reps',
			weightStep: 2.5,
		})

		expect(created.id).toBeTruthy()
		expect(created.name).toBe('Приседания')
		expect(created.archivedAt).toBeNull()

		const fetched = await exercises.getById(created.id)
		expect(fetched?.name).toBe('Приседания')

		const updated = await exercises.update(created.id, {
			name: 'Приседания со штангой',
			defaultRestSeconds: 120,
		})
		expect(updated.name).toBe('Приседания со штангой')
		expect(updated.defaultRestSeconds).toBe(120)

		const archived = await exercises.archive(created.id)
		expect(archived.archivedAt).not.toBeNull()

		const active = await exercises.list()
		expect(active.find((item) => item.id === created.id)).toBeUndefined()

		const withArchived = await exercises.list({ includeArchived: true })
		expect(withArchived.find((item) => item.id === created.id)).toBeTruthy()

		const stillThere = await exercises.getById(created.id)
		expect(stillThere).not.toBeNull()
		expect(stillThere?.archivedAt).not.toBeNull()

		await db.closeAsync()
	})

	it('enforces foreign keys for template → exercise links', async () => {
		const { db, exercises, templates } = await setup()

		const exercise = await exercises.create({ name: 'Тяга блока' })
		const template = await templates.create({ name: 'Спина A' })

		const link = await templates.addExercise({
			templateId: template.id,
			exerciseId: exercise.id,
			plannedSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: 90,
		})

		expect(link.templateId).toBe(template.id)
		expect(link.exerciseId).toBe(exercise.id)

		const linked = await templates.listExercises(template.id)
		expect(linked).toHaveLength(1)

		await expect(
			templates.addExercise({
				templateId: template.id,
				exerciseId: 'missing-exercise',
			}),
		).rejects.toThrow()

		await db.closeAsync()
	})

	it('restricts deleting an exercise referenced by a template', async () => {
		const { db, exercises, templates } = await setup()

		const exercise = await exercises.create({ name: 'Жим гантелей' })
		const template = await templates.create({ name: 'Грудь' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: exercise.id,
		})

		await expect(
			db.runAsync('DELETE FROM exercises WHERE id = ?', [exercise.id]),
		).rejects.toThrow()

		await db.closeAsync()
	})
})
