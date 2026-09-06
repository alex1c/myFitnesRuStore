/**
 * История — placeholder for past workouts.
 */
import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'

export default function HistoryScreen () {
	return (
		<Screen>
			<AppText variant="title">История</AppText>
			<AppText muted>
				Список завершённых тренировок появится здесь.
			</AppText>
			<SurfaceCard>
				<AppText variant="subtitle">Пока пусто</AppText>
				<AppText muted>
					Когда появятся первые подходы, вы сможете вернуться к ним
					и сравнить результат.
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}
