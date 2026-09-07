/**
 * Theme preference provider — System / Light / Dark with live OS updates.
 */
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { useColorScheme } from 'react-native'

import { PreferencesService } from '@/src/db/services/preferences-service'
import {
	DEFAULT_THEME_PREFERENCE,
	resolveColorScheme,
	type ResolvedColorScheme,
	type ThemePreference,
} from '@/src/features/settings/theme-preference'
import { useDatabase } from '@/src/providers/database-provider'

type ThemePreferenceContextValue = {
	preference: ThemePreference
	resolvedScheme: ResolvedColorScheme
	setPreference: (next: ThemePreference) => Promise<void>
	isReady: boolean
}

const ThemePreferenceContext =
	createContext<ThemePreferenceContextValue | null>(null)

type Props = {
	children: React.ReactNode
}

export function ThemePreferenceProvider ({ children }: Props) {
	const { db } = useDatabase()
	const systemScheme = useColorScheme()
	const [preference, setPreferenceState] = useState<ThemePreference>(
		DEFAULT_THEME_PREFERENCE,
	)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		let active = true
		const service = new PreferencesService(db)
		void (async () => {
			const stored = await service.getOrCreateThemePreference()
			if (active) {
				setPreferenceState(stored)
				setIsReady(true)
			}
		})()
		return () => {
			active = false
		}
	}, [db])

	const setPreference = useCallback(
		async (next: ThemePreference) => {
			setPreferenceState(next)
			const service = new PreferencesService(db)
			await service.setThemePreference(next)
		},
		[db],
	)

	const resolvedScheme = useMemo(
		() => resolveColorScheme(preference, systemScheme),
		[preference, systemScheme],
	)

	const value = useMemo(
		() => ({
			preference,
			resolvedScheme,
			setPreference,
			isReady,
		}),
		[preference, resolvedScheme, setPreference, isReady],
	)

	return (
		<ThemePreferenceContext.Provider value={value}>
			{children}
		</ThemePreferenceContext.Provider>
	)
}

export function useThemePreference (): ThemePreferenceContextValue {
	const value = useContext(ThemePreferenceContext)
	if (!value) {
		throw new Error(
			'useThemePreference must be used within ThemePreferenceProvider',
		)
	}
	return value
}

export function useThemePreferenceOptional (): ThemePreferenceContextValue | null {
	return useContext(ThemePreferenceContext)
}
