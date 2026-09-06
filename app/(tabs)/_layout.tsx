/**
 * Bottom tabs: Сегодня, История, Прогресс, Упражнения, Ещё.
 */
import { SymbolView } from 'expo-symbols'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

import { useThemeColors } from '@/src/theme/use-theme-colors'
import { typography } from '@/src/theme'

type TabIconProps = {
	color: string
	ios: string
	android: string
}

function TabIcon ({ color, ios, android }: TabIconProps) {
	return (
		<SymbolView
			name={{
				ios: ios as 'circle',
				android: android as 'circle',
				web: android as 'circle',
			}}
			tintColor={color}
			size={26}
		/>
	)
}

function toColorString (color: string | { toString: () => string }): string {
	return typeof color === 'string' ? color : String(color)
}

export default function TabLayout () {
	const palette = useThemeColors()

	return (
		<Tabs
			screenOptions={{
				headerStyle: {
					backgroundColor: palette.surface,
				},
				headerTitleStyle: {
					...typography.subtitle,
					color: palette.text,
				},
				headerShadowVisible: false,
				headerTintColor: palette.text,
				tabBarActiveTintColor: palette.primary,
				tabBarInactiveTintColor: palette.tabInactive,
				tabBarStyle: {
					backgroundColor: palette.tabBar,
					borderTopColor: palette.border,
					height: Platform.OS === 'android' ? 64 : 84,
					paddingBottom: Platform.OS === 'android' ? 10 : 24,
					paddingTop: 8,
				},
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: '600',
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Сегодня',
					tabBarIcon: ({ color }) => (
						<TabIcon
							color={toColorString(color)}
							ios="sun.max.fill"
							android="today"
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					title: 'История',
					tabBarIcon: ({ color }) => (
						<TabIcon
							color={toColorString(color)}
							ios="clock.fill"
							android="history"
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="progress"
				options={{
					title: 'Прогресс',
					tabBarIcon: ({ color }) => (
						<TabIcon
							color={toColorString(color)}
							ios="chart.line.uptrend.xyaxis"
							android="insights"
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="exercises"
				options={{
					title: 'Упражнения',
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<TabIcon
							color={toColorString(color)}
							ios="dumbbell.fill"
							android="fitness_center"
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="more"
				options={{
					title: 'Ещё',
					tabBarIcon: ({ color }) => (
						<TabIcon
							color={toColorString(color)}
							ios="ellipsis.circle.fill"
							android="more_horiz"
						/>
					),
				}}
			/>
		</Tabs>
	)
}
