/**
 * Упражнения — placeholder for the exercise library.
 */
import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'

export default function ExercisesScreen () {
	return (
		<Screen>
			<AppText variant="title">Упражнения</AppText>
			<AppText muted>
				Библиотека движений и пользовательские упражнения.
			</AppText>
			<SurfaceCard>
				<AppText variant="subtitle">Скоро каталог</AppText>
				<AppText muted>
					База упражнений уже заложена в приложении. Наполнение
					библиотеки — в следующей фазе.
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}
