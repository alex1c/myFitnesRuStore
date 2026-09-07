/**
 * Root layout: database → theme preference → themed navigation shell.
 */
import {
	DarkTheme,
	DefaultTheme,
	Stack,
	ThemeProvider,
} from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, type ReactNode } from 'react'
import 'react-native-reanimated'

import { DatabaseProvider } from '@/src/providers/database-provider'
import { ThemePreferenceProvider } from '@/src/providers/theme-preference-provider'
import { initializeAnalytics } from '@/src/services/analytics'
import { configureRestNotificationHandler } from '@/src/services/notifications/expo-rest-notification-client'
import { colors } from '@/src/theme'
import { useResolvedColorScheme } from '@/src/theme/use-theme-colors'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
	initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()
configureRestNotificationHandler()
initializeAnalytics()

const LightNavTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: colors.light.background,
		card: colors.light.surface,
		text: colors.light.text,
		border: colors.light.border,
		primary: colors.light.primary,
	},
}

const DarkNavTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		background: colors.dark.background,
		card: colors.dark.surface,
		text: colors.dark.text,
		border: colors.dark.border,
		primary: colors.dark.primary,
	},
}

function ThemedNavigation ({ children }: { children: ReactNode }) {
	const colorScheme = useResolvedColorScheme()

	return (
		<ThemeProvider
			value={colorScheme === 'dark' ? DarkNavTheme : LightNavTheme}
		>
			<StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
			{children}
		</ThemeProvider>
	)
}

export default function RootLayout () {
	useEffect(() => {
		SplashScreen.hideAsync()
	}, [])

	return (
		<DatabaseProvider>
			<ThemePreferenceProvider>
				<ThemedNavigation>
					<Stack>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="templates" options={{ headerShown: false }} />
						<Stack.Screen name="workout" options={{ headerShown: false }} />
						<Stack.Screen name="progress" options={{ headerShown: false }} />
					</Stack>
				</ThemedNavigation>
			</ThemePreferenceProvider>
		</DatabaseProvider>
	)
}
