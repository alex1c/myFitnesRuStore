/**
 * Fallback route for unknown paths.
 */
import { Link, Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function NotFoundScreen () {
	const palette = useThemeColors()

	return (
		<>
			<Stack.Screen options={{ title: 'Не найдено' }} />
			<View style={[styles.container, { backgroundColor: palette.background }]}>
				<AppText variant="title">Экран не найден</AppText>
				<Link href="/" style={styles.link}>
					<AppText style={{ color: palette.primary }}>
						На экран «Сегодня»
					</AppText>
				</Link>
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.md,
	},
	link: {
		marginTop: spacing.sm,
		paddingVertical: spacing.sm,
	},
})
