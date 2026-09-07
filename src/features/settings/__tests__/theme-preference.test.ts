/**
 * Theme preference resolver and persistence parsing tests.
 */
import {
	DEFAULT_THEME_PREFERENCE,
	parseThemePreference,
	resolveColorScheme,
} from '@/src/features/settings/theme-preference'
import { createMemoryDatabase } from '@/src/db/memory-client'
import { initializeProvidedDatabase } from '@/src/db/init'
import { PreferencesService } from '@/src/db/services/preferences-service'
import {
	formatActiveWorkoutDuration,
} from '@/src/features/workout/set-logic'

describe('theme preference helpers', () => {
	it('defaults to system', () => {
		expect(DEFAULT_THEME_PREFERENCE).toBe('system')
		expect(parseThemePreference(null)).toBe('system')
		expect(parseThemePreference(undefined)).toBe('system')
		expect(parseThemePreference('weird')).toBe('system')
	})

	it('parses valid stored values', () => {
		expect(parseThemePreference('light')).toBe('light')
		expect(parseThemePreference('dark')).toBe('dark')
		expect(parseThemePreference('system')).toBe('system')
	})

	it('resolves system / light / dark schemes', () => {
		expect(resolveColorScheme('light', 'dark')).toBe('light')
		expect(resolveColorScheme('dark', 'light')).toBe('dark')
		expect(resolveColorScheme('system', 'dark')).toBe('dark')
		expect(resolveColorScheme('system', 'light')).toBe('light')
		expect(resolveColorScheme('system', null)).toBe('light')
	})
})

describe('theme preference persistence', () => {
	it('persists light and dark and falls back for invalid rows', async () => {
		const db = await createMemoryDatabase()
		await initializeProvidedDatabase(db)
		const prefs = new PreferencesService(db)

		expect(await prefs.getOrCreateThemePreference()).toBe('system')
		expect(await prefs.getThemePreference()).toBe('system')

		await prefs.setThemePreference('light')
		expect(await prefs.getThemePreference()).toBe('light')

		await prefs.setThemePreference('dark')
		expect(await prefs.getThemePreference()).toBe('dark')

		await db.runAsync(
			`INSERT INTO app_meta (key, value) VALUES (?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			['ui_theme_preference', 'not-a-theme'],
		)
		expect(await prefs.getThemePreference()).toBe('system')

		await db.closeAsync()
	})
})

describe('active workout duration formatting', () => {
	it('formats compact duration for Today card', () => {
		const started = '2026-09-07T10:00:00.000Z'
		expect(
			formatActiveWorkoutDuration(started, Date.parse(started) + 42 * 60_000),
		).toBe('42 мин')
		expect(
			formatActiveWorkoutDuration(started, Date.parse(started) + 30_000),
		).toBe('меньше минуты')
		expect(
			formatActiveWorkoutDuration(
				started,
				Date.parse(started) + 65 * 60_000,
			),
		).toBe('1 ч 5 мин')
	})
})
