/**
 * Ещё — settings and secondary actions placeholder.
 */
import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import { useDatabase } from '@/src/providers/database-provider'

export default function MoreScreen () {
	const { schemaVersion } = useDatabase()

	return (
		<Screen>
			<AppText variant="title">Ещё</AppText>
			<AppText muted>
				Настройки, резервное копирование и справка появятся позже.
			</AppText>
			<SurfaceCard>
				<AppText variant="subtitle">О приложении</AppText>
				<AppText muted>
					Мой спортзал — офлайн-дневник силовых тренировок.
				</AppText>
				<AppText variant="caption" muted>
					Версия схемы данных: {schemaVersion}
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}
