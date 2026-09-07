/**
 * Lightweight user preferences stored in app_meta (no extra migration).
 */
import {
	ONBOARDING_HELP_DISMISSED_KEY,
	parseOnboardingHelpDismissed,
	serializeOnboardingHelpDismissed,
} from '@/src/features/help/onboarding-preference'
import {
	DEFAULT_THEME_PREFERENCE,
	THEME_PREFERENCE_KEY,
	parseThemePreference,
	type ThemePreference,
} from '@/src/features/settings/theme-preference'
import type { AppDatabase } from '../client'

export class PreferencesService {
	constructor (private readonly db: AppDatabase) {}

	async getThemePreference (): Promise<ThemePreference> {
		const row = await this.db.getFirstAsync<{ value: string }>(
			'SELECT value FROM app_meta WHERE key = ?',
			[THEME_PREFERENCE_KEY],
		)
		return parseThemePreference(row?.value ?? null)
	}

	async setThemePreference (preference: ThemePreference): Promise<void> {
		await this.db.runAsync(
			`INSERT INTO app_meta (key, value) VALUES (?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			[THEME_PREFERENCE_KEY, preference],
		)
	}

	async getOrCreateThemePreference (): Promise<ThemePreference> {
		const current = await this.getThemePreference()
		if (current === DEFAULT_THEME_PREFERENCE) {
			const row = await this.db.getFirstAsync<{ value: string }>(
				'SELECT value FROM app_meta WHERE key = ?',
				[THEME_PREFERENCE_KEY],
			)
			// Persist explicit default so later reads are stable across upgrades.
			if (!row) {
				await this.setThemePreference(DEFAULT_THEME_PREFERENCE)
			}
		}
		return current
	}

	async isOnboardingHelpDismissed (): Promise<boolean> {
		const row = await this.db.getFirstAsync<{ value: string }>(
			'SELECT value FROM app_meta WHERE key = ?',
			[ONBOARDING_HELP_DISMISSED_KEY],
		)
		return parseOnboardingHelpDismissed(row?.value ?? null)
	}

	async setOnboardingHelpDismissed (dismissed: boolean): Promise<void> {
		await this.db.runAsync(
			`INSERT INTO app_meta (key, value) VALUES (?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			[
				ONBOARDING_HELP_DISMISSED_KEY,
				serializeOnboardingHelpDismissed(dismissed),
			],
		)
	}
}

export function createPreferencesService (db: AppDatabase): PreferencesService {
	return new PreferencesService(db)
}
