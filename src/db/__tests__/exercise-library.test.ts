/**
 * Built-in seed, overrides, and custom exercise lifecycle tests.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { ExerciseRepository } from '@/src/db/repositories/exercise-repository'
import {
	BUILTIN_EXERCISE_COUNT,
	BUILTIN_EXERCISES,
	REQUIRED_BUILTIN_NAMES,
} from '@/src/db/seed/builtin-exercises'
import { seedBuiltinExercises } from '@/src/db/seed/seed-builtin-exercises'
import { parseDecimalInput } from '@/src/utils/parse-decimal'

async function setup () {
	const db = await createMemoryDatabase()
	await initializeProvidedDatabase(db)
	return {
		db,
		exercises: new ExerciseRepository(db),
	}
}

describe('builtin exercise seed', () => {
	it('seeds a library in the expected size range with stable ids', async () => {
		const { db, exercises } = await setup()

		expect(BUILTIN_EXERCISE_COUNT).toBeGreaterThanOrEqual(120)
		expect(BUILTIN_EXERCISE_COUNT).toBeLessThanOrEqual(150)
		expect(await exercises.countBuiltin()).toBe(BUILTIN_EXERCISE_COUNT)

		const ids = BUILTIN_EXERCISES.map((item) => item.id)
		expect(new Set(ids).size).toBe(ids.length)

		const names = (await exercises.list()).map((item) => item.name)
		for (const required of REQUIRED_BUILTIN_NAMES) {
			expect(names).toContain(required)
		}

		await db.closeAsync()
	})

	it('does not duplicate exercises on repeated seed', async () => {
		const { db, exercises } = await setup()
		const firstCount = await exercises.countBuiltin()

		await seedBuiltinExercises(db)
		await seedBuiltinExercises(db)

		expect(await exercises.countBuiltin()).toBe(firstCount)
		await db.closeAsync()
	})

	it('keeps user settings for built-ins after re-seed', async () => {
		const { db, exercises } = await setup()
		const bench = await exercises.getById('ex_sys_bench_press')
		expect(bench).not.toBeNull()

		await exercises.update('ex_sys_bench_press', {
			defaultRestSeconds: 200,
			weightStep: 1.25,
			notes: 'Сиденье 4',
		})

		const afterUpdate = await exercises.getById('ex_sys_bench_press')
		expect(afterUpdate?.defaultRestSeconds).toBe(200)
		expect(afterUpdate?.weightStep).toBe(1.25)
		expect(afterUpdate?.notes).toBe('Сиденье 4')

		await initializeProvidedDatabase(db)
		await seedBuiltinExercises(db)

		const afterSeed = await exercises.getById('ex_sys_bench_press')
		expect(afterSeed?.defaultRestSeconds).toBe(200)
		expect(afterSeed?.weightStep).toBe(1.25)
		expect(afterSeed?.notes).toBe('Сиденье 4')
		expect(afterSeed?.name).toBe('Жим штанги лёжа')

		await db.closeAsync()
	})
})

describe('custom exercise lifecycle', () => {
	it('creates, edits, archives and restores a custom exercise', async () => {
		const { db, exercises } = await setup()

		const created = await exercises.create({
			name: '  Мой жим  ',
			muscleGroup: 'chest',
			equipment: 'dumbbell',
			trackingType: 'weight_reps',
			defaultRestSeconds: 90,
			weightStep: 1.25,
			notes: 'Скамья дома',
		})

		expect(created.name).toBe('Мой жим')
		expect(created.isCustom).toBe(true)
		expect(created.weightStep).toBe(1.25)

		const updated = await exercises.update(created.id, {
			name: 'Мой жим гантелей',
			defaultRestSeconds: 75,
			weightStep: 2.5,
		})
		expect(updated.name).toBe('Мой жим гантелей')
		expect(updated.defaultRestSeconds).toBe(75)

		const archived = await exercises.archive(created.id)
		expect(archived.archivedAt).not.toBeNull()
		expect(
			(await exercises.list()).find((item) => item.id === created.id),
		).toBeUndefined()
		expect(
			(await exercises.listArchived()).find((item) => item.id === created.id),
		).toBeTruthy()

		const restored = await exercises.restore(created.id)
		expect(restored.archivedAt).toBeNull()
		expect(
			(await exercises.list()).find((item) => item.id === created.id),
		).toBeTruthy()

		await db.closeAsync()
	})

	it('rejects empty names and protects built-ins from archive', async () => {
		const { db, exercises } = await setup()

		await expect(exercises.create({ name: '   ' })).rejects.toThrow(
			/название/i,
		)

		await expect(exercises.archive('ex_sys_bench_press')).rejects.toThrow(
			/Встроенное/,
		)

		await db.closeAsync()
	})

	it('accepts decimal comma weight steps via parser', () => {
		expect(parseDecimalInput('1,25')).toEqual({ ok: true, value: 1.25 })
	})
})
