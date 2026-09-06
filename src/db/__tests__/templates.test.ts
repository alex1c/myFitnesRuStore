/**
 * Workout template repository and planning lifecycle tests.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import { WorkoutTemplateRepository } from '@/src/db/repositories/workout-template-repository'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	return {
		db,
		exercises: new ExerciseRepository(db),
		templates: new WorkoutTemplateRepository(db),
	}
}

describe('workout template CRUD', () => {
	it('creates, updates, lists, archives and restores templates', async () => {
		const { db, templates } = await setup()

		const created = await templates.create({
			name: '  Грудь + трицепс  ',
			description: 'Зал',
		})
		expect(created.name).toBe('Грудь + трицепс')
		expect(created.archivedAt).toBeNull()

		const updated = await templates.update(created.id, {
			name: 'Push A',
			description: null,
		})
		expect(updated.name).toBe('Push A')
		expect(updated.description).toBeNull()

		expect((await templates.list()).some((item) => item.id === created.id)).toBe(
			true,
		)

		await templates.archive(created.id)
		expect(
			(await templates.list()).find((item) => item.id === created.id),
		).toBeUndefined()
		expect(
			(await templates.listArchived()).find((item) => item.id === created.id),
		).toBeTruthy()

		await templates.restore(created.id)
		expect(
			(await templates.list()).find((item) => item.id === created.id),
		).toBeTruthy()

		await db.closeAsync()
	})

	it('rejects empty template names', async () => {
		const { db, templates } = await setup()
		await expect(templates.create({ name: '   ' })).rejects.toThrow(/название/i)
		await db.closeAsync()
	})
})

describe('template exercises planning', () => {
	it('adds, updates, reorders and removes exercises without deleting globals', async () => {
		const { db, exercises, templates } = await setup()
		const template = await templates.create({ name: 'Спина' })
		const pull = await exercises.getById('ex_sys_pull_up')
		const row = await exercises.getById('ex_sys_seated_cable_row')
		expect(pull).not.toBeNull()
		expect(row).not.toBeNull()

		const first = await templates.addExercise({
			templateId: template.id,
			exerciseId: pull!.id,
			plannedSets: 4,
			targetRepsMin: 6,
			targetRepsMax: 8,
			restSeconds: 120,
		})
		const second = await templates.addExercise({
			templateId: template.id,
			exerciseId: row!.id,
			plannedSets: 3,
			targetRepsMin: 10,
			targetRepsMax: 10,
			restSeconds: 90,
		})

		let list = await templates.listExercises(template.id)
		expect(list.map((item) => item.id)).toEqual([first.id, second.id])

		await templates.updateExercise(first.id, {
			plannedSets: 5,
			targetRepsMin: 5,
			targetRepsMax: 7,
			restSeconds: 150,
		})
		const updated = await templates.getTemplateExerciseById(first.id)
		expect(updated?.plannedSets).toBe(5)
		expect(updated?.targetRepsMin).toBe(5)
		expect(updated?.targetRepsMax).toBe(7)
		expect(updated?.restSeconds).toBe(150)

		list = await templates.moveExercise(second.id, 'up')
		expect(list.map((item) => item.id)).toEqual([second.id, first.id])

		await templates.removeExercise(second.id)
		list = await templates.listExercises(template.id)
		expect(list).toHaveLength(1)
		expect(list[0]?.id).toBe(first.id)
		expect(list[0]?.position).toBe(0)

		const stillThere = await exercises.getById(row!.id)
		expect(stillThere).not.toBeNull()

		await db.closeAsync()
	})

	it('keeps template valid when linked custom exercise is archived', async () => {
		const { db, exercises, templates } = await setup()
		const custom = await exercises.create({ name: 'Мой жим' })
		const template = await templates.create({ name: 'Дома' })
		await templates.addExercise({
			templateId: template.id,
			exerciseId: custom.id,
			plannedSets: 3,
			targetRepsMin: 8,
			targetRepsMax: 12,
			restSeconds: 90,
		})

		await exercises.archive(custom.id)
		expect(
			(await exercises.list()).find((item) => item.id === custom.id),
		).toBeUndefined()

		const detail = await templates.getDetail(template.id)
		expect(detail?.exercises).toHaveLength(1)
		expect(detail?.exercises[0]?.exerciseId).toBe(custom.id)

		await db.closeAsync()
	})
})

describe('template duplicate', () => {
	it('duplicates template and child rows with new ids', async () => {
		const { db, exercises, templates } = await setup()
		const source = await templates.create({ name: 'Ноги' })
		const squat = await exercises.getById('ex_sys_back_squat')
		expect(squat).not.toBeNull()

		await templates.addExercise({
			templateId: source.id,
			exerciseId: squat!.id,
			plannedSets: 4,
			targetRepsMin: 5,
			targetRepsMax: 8,
			restSeconds: 180,
		})
		await templates.addExercise({
			templateId: source.id,
			exerciseId: 'ex_sys_leg_press',
			plannedSets: 3,
			targetRepsMin: 10,
			targetRepsMax: 12,
			restSeconds: 120,
		})

		const copy = await templates.duplicate(source.id)
		expect(copy.id).not.toBe(source.id)
		expect(copy.name).toBe('Ноги — копия')

		const sourceExercises = await templates.listExercises(source.id)
		const copyExercises = await templates.listExercises(copy.id)
		expect(copyExercises).toHaveLength(2)
		expect(copyExercises.map((item) => item.id)).not.toEqual(
			sourceExercises.map((item) => item.id),
		)
		expect(copyExercises.map((item) => item.exerciseId)).toEqual(
			sourceExercises.map((item) => item.exerciseId),
		)
		expect(sourceExercises).toHaveLength(2)

		await db.closeAsync()
	})
})
