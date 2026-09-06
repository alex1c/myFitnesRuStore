/**
 * Nested stack for workout template flows (opened from Today).
 */
import { Stack } from 'expo-router'

import { typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function TemplatesLayout () {
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
			<Stack.Screen name="new" options={{ title: 'Новая тренировка' }} />
			<Stack.Screen name="[id]" options={{ title: 'Тренировка' }} />
			<Stack.Screen name="edit/[id]" options={{ title: 'Редактор' }} />
			<Stack.Screen
				name="add-exercise/[templateId]"
				options={{ title: 'Добавить упражнение' }}
			/>
			<Stack.Screen
				name="edit-exercise/[templateExerciseId]"
				options={{ title: 'Настройки' }}
			/>
			<Stack.Screen name="archive" options={{ title: 'Архив тренировок' }} />
		</Stack>
	)
}
