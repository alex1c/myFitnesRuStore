/**
 * Root layout: database bootstrap → themed navigation shell.
 */
import {
	DarkTheme,
	DefaultTheme,
	Stack,
	ThemeProvider,
} from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import 'react-native-reanimated'

import { DatabaseProvider } from '@/src/providers/database-provider'
import { configureRestNotificationHandler } from '@/src/services/notifications/expo-rest-notification-client'
import { colors } from '@/src/theme'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
	initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()
configureRestNotificationHandler()

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

export default function RootLayout () {
	const colorScheme = useColorScheme()

	useEffect(() => {
		SplashScreen.hideAsync()
	}, [])

	return (
		<DatabaseProvider>
			<ThemeProvider
				value={colorScheme === 'dark' ? DarkNavTheme : LightNavTheme}
			>
				<StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="templates" options={{ headerShown: false }} />
					<Stack.Screen name="workout" options={{ headerShown: false }} />
					<Stack.Screen name="progress" options={{ headerShown: false }} />
				</Stack>
			</ThemeProvider>
		</DatabaseProvider>
	)
}
