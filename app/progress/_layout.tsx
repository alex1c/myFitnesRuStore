/**
 * Nested stack for exercise progress detail.
 */
import { Stack } from 'expo-router'

import { typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function ProgressLayout () {
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
				name="[exerciseId]"
				options={{ title: 'Упражнение' }}
			/>
		</Stack>
	)
}
