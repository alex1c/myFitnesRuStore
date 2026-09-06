/**
 * Nested stack for active and completed workout screens.
 */
import { Stack } from 'expo-router'

import { typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function WorkoutLayout () {
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
			<Stack.Screen name="[id]" options={{ title: 'Тренировка' }} />
			<Stack.Screen name="summary/[id]" options={{ title: 'Итог' }} />
			<Stack.Screen
				name="add-exercise/[workoutId]"
				options={{ title: 'Упражнение' }}
			/>
			<Stack.Screen name="history/[id]" options={{ title: 'Тренировка' }} />
		</Stack>
	)
}
