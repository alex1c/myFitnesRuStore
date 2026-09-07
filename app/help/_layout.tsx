/**
 * Help stack — offline «Как пользоваться» guide.
 */
import { Stack } from 'expo-router'

import { typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function HelpLayout () {
	const palette = useThemeColors()

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: palette.surface },
				headerTitleStyle: {
					...typography.subtitle,
					color: palette.text,
				},
				headerTintColor: palette.primary,
				headerShadowVisible: false,
				contentStyle: { backgroundColor: palette.background },
			}}
		>
			<Stack.Screen
				name="how-to-use"
				options={{ title: 'Как пользоваться' }}
			/>
		</Stack>
	)
}
