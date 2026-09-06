/**
 * Nested stack for the Exercises tab: list → detail → form → archive.
 */
import { Stack } from 'expo-router'

import { useThemeColors } from '@/src/theme/use-theme-colors'
import { typography } from '@/src/theme'

export default function ExercisesLayout () {
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
			<Stack.Screen name="index" options={{ title: 'Упражнения' }} />
			<Stack.Screen name="[id]" options={{ title: 'Упражнение' }} />
			<Stack.Screen name="new" options={{ title: 'Своё упражнение' }} />
			<Stack.Screen name="edit/[id]" options={{ title: 'Изменить' }} />
			<Stack.Screen name="archive" options={{ title: 'Архив' }} />
		</Stack>
	)
}
