/**
 * Onboarding visibility, preference parsing, and lesson structure.
 */
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { PreferencesService } from '@/src/db/services/preferences-service'
import {
	HELP_INTRO,
	HELP_LESSONS,
	getHelpLessons,
} from '@/src/features/help/lessons'
import {
	ONBOARDING_HELP_DISMISSED_KEY,
	parseOnboardingHelpDismissed,
} from '@/src/features/help/onboarding-preference'
import { shouldShowOnboardingHelpCard } from '@/src/features/help/onboarding-visibility'

describe('onboarding help visibility', () => {
	it('shows for a brand-new user', () => {
		expect(
			shouldShowOnboardingHelpCard({
				dismissed: false,
				hasActiveWorkout: false,
				finishedWorkoutCount: 0,
			}),
		).toBe(true)
	})

	it('hides after dismiss', () => {
		expect(
			shouldShowOnboardingHelpCard({
				dismissed: true,
				hasActiveWorkout: false,
				finishedWorkoutCount: 0,
			}),
		).toBe(false)
	})

	it('hides when history exists', () => {
		expect(
			shouldShowOnboardingHelpCard({
				dismissed: false,
				hasActiveWorkout: false,
				finishedWorkoutCount: 1,
			}),
		).toBe(false)
	})

	it('hides while an active workout exists', () => {
		expect(
			shouldShowOnboardingHelpCard({
				dismissed: false,
				hasActiveWorkout: true,
				finishedWorkoutCount: 0,
			}),
		).toBe(false)
	})

	it('hides after restored history even if preference is missing', () => {
		expect(
			shouldShowOnboardingHelpCard({
				dismissed: false,
				hasActiveWorkout: false,
				finishedWorkoutCount: 4,
			}),
		).toBe(false)
	})
})

describe('onboarding help preference', () => {
	it('defaults to not dismissed and parses invalid values safely', () => {
		expect(parseOnboardingHelpDismissed(null)).toBe(false)
		expect(parseOnboardingHelpDismissed(undefined)).toBe(false)
		expect(parseOnboardingHelpDismissed('nope')).toBe(false)
		expect(parseOnboardingHelpDismissed('true')).toBe(true)
		expect(parseOnboardingHelpDismissed('1')).toBe(true)
		expect(parseOnboardingHelpDismissed('YES')).toBe(true)
	})

	it('persists dismissal in app_meta', async () => {
		const db = await createMemoryDatabase()
		await initializeProvidedDatabase(db)
		const prefs = new PreferencesService(db)

		expect(await prefs.isOnboardingHelpDismissed()).toBe(false)

		await prefs.setOnboardingHelpDismissed(true)
		expect(await prefs.isOnboardingHelpDismissed()).toBe(true)

		await db.runAsync(
			`INSERT INTO app_meta (key, value) VALUES (?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			[ONBOARDING_HELP_DISMISSED_KEY, 'garbage'],
		)
		expect(await prefs.isOnboardingHelpDismissed()).toBe(false)

		await db.closeAsync()
	})
})

describe('help lessons data', () => {
	it('has a non-empty Russian intro', () => {
		expect(HELP_INTRO.trim().length).toBeGreaterThan(20)
		expect(HELP_INTRO).toMatch(/подход/i)
	})

	it('exposes eight ordered unique lessons', () => {
		const lessons = getHelpLessons()
		expect(lessons).toHaveLength(8)
		expect(HELP_LESSONS).toHaveLength(8)

		const ids = lessons.map((lesson) => lesson.id)
		expect(new Set(ids).size).toBe(ids.length)

		expect(lessons.map((lesson) => lesson.order)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8,
		])

		for (const lesson of lessons) {
			expect(lesson.title.trim().length).toBeGreaterThan(3)
			expect(lesson.paragraphs.length).toBeGreaterThan(0)
			for (const paragraph of lesson.paragraphs) {
				expect(paragraph.trim().length).toBeGreaterThan(10)
			}
		}

		expect(lessons[0]?.action?.href).toBe('/templates/new')
		expect(lessons[2]?.showSetMockup).toBe(true)
		expect(lessons[5]?.action?.href).toBe('/(tabs)/history')
		expect(lessons[6]?.action?.href).toBe('/(tabs)/progress')
	})
})
