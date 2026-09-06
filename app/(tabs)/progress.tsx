/**
 * Прогресс — placeholder for strength trends.
 */
import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'

export default function ProgressScreen () {
	return (
		<Screen>
			<AppText variant="title">Прогресс</AppText>
			<AppText muted>
				Динамика весов и личные рекорды появятся позже.
			</AppText>
			<SurfaceCard>
				<AppText variant="subtitle">Без графиков пока</AppText>
				<AppText muted>
					Сначала фиксируем подходы. Статистика строится на честных
					данных дневника.
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}
