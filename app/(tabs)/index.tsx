/**
 * Сегодня — home tab with brand intro block (no workout start yet).
 */
import { StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import { radius, spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function TodayScreen () {
	const palette = useThemeColors()

	return (
		<Screen>
			<View
				style={[
					styles.hero,
					{ backgroundColor: palette.primaryMuted },
				]}
			>
				<AppText variant="hero" style={{ color: palette.primary }}>
					Мой спортзал
				</AppText>
				<AppText variant="subtitle" muted>
					Ваш дневник тренировок
				</AppText>
			</View>

			<SurfaceCard>
				<AppText variant="title">Сегодня</AppText>
				<AppText muted>
					Здесь появится быстрый старт тренировки: прошлый результат
					и следующий подход за пару касаний.
				</AppText>
			</SurfaceCard>

			<SurfaceCard>
				<AppText variant="subtitle">Пока спокойно</AppText>
				<AppText muted>
					Фундамент приложения готов. Активные тренировки подключим
					в следующих фазах.
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	hero: {
		borderRadius: radius.xl,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.lg,
		gap: spacing.xs,
		minHeight: 148,
		justifyContent: 'center',
	},
})
