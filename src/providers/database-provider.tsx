/**
 * Provides initialized AppDatabase to the React tree.
 * Shows a Russian fallback UI when bootstrap fails.
 */
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'

import {
	ExerciseRepository,
	initializeDatabase,
	WorkoutService,
	WorkoutTemplateRepository,
	type AppDatabase,
} from '@/src/db'
import { getExpoRestNotificationClient } from '@/src/services/notifications/expo-rest-notification-client'
import { colors, radius, spacing, typography } from '@/src/theme'

type DatabaseContextValue = {
	db: AppDatabase
	exercises: ExerciseRepository
	templates: WorkoutTemplateRepository
	workouts: WorkoutService
	schemaVersion: number
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

type Status =
	| { kind: 'loading' }
	| { kind: 'ready'; value: DatabaseContextValue }
	| { kind: 'error'; message: string }

type Props = {
	children: React.ReactNode
}

export function DatabaseProvider ({ children }: Props) {
	const [status, setStatus] = useState<Status>({ kind: 'loading' })
	const [attempt, setAttempt] = useState(0)

	useEffect(() => {
		let isActive = true

		void (async () => {
			try {
				const { db, schemaVersion } = await initializeDatabase()
				if (!isActive) {
					return
				}
				setStatus({
					kind: 'ready',
					value: {
						db,
						schemaVersion,
						exercises: new ExerciseRepository(db),
						templates: new WorkoutTemplateRepository(db),
						workouts: new WorkoutService(
							db,
							getExpoRestNotificationClient(),
						),
					},
				})
			} catch (error) {
				console.error('Database initialization failed', error)
				if (!isActive) {
					return
				}
				setStatus({
					kind: 'error',
					message: 'Не удалось открыть данные приложения.',
				})
			}
		})()

		return () => {
			isActive = false
		}
	}, [attempt])

	const handleRetry = useCallback(() => {
		setStatus({ kind: 'loading' })
		setAttempt((current) => current + 1)
	}, [])

	if (status.kind === 'loading') {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={colors.light.primary} />
			</View>
		)
	}

	if (status.kind === 'error') {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorTitle}>{status.message}</Text>
				<Text style={styles.errorHint}>
					Проверьте свободное место на устройстве и попробуйте снова.
				</Text>
				<Pressable
					accessibilityRole="button"
					onPress={handleRetry}
					style={({ pressed }) => [
						styles.retryButton,
						pressed && styles.retryPressed,
					]}
				>
					<Text style={styles.retryLabel}>Повторить</Text>
				</Pressable>
			</View>
		)
	}

	return (
		<DatabaseContext.Provider value={status.value}>
			{children}
		</DatabaseContext.Provider>
	)
}

export function useDatabase (): DatabaseContextValue {
	const value = useContext(DatabaseContext)
	if (!value) {
		throw new Error('useDatabase must be used within DatabaseProvider')
	}
	return value
}

export function useDatabaseOptional (): DatabaseContextValue | null {
	return useContext(DatabaseContext)
}

export function useExerciseRepository (): ExerciseRepository {
	return useDatabase().exercises
}

export function useTemplateRepository (): WorkoutTemplateRepository {
	const { templates } = useDatabase()
	return useMemo(() => templates, [templates])
}

export function useWorkoutService (): WorkoutService {
	return useDatabase().workouts
}

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
		backgroundColor: colors.light.background,
		gap: spacing.md,
	},
	errorTitle: {
		...typography.title,
		color: colors.light.text,
		textAlign: 'center',
	},
	errorHint: {
		...typography.body,
		color: colors.light.textMuted,
		textAlign: 'center',
	},
	retryButton: {
		marginTop: spacing.sm,
		minHeight: 48,
		minWidth: 160,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.md,
		backgroundColor: colors.light.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryPressed: {
		opacity: 0.85,
	},
	retryLabel: {
		...typography.subtitle,
		color: colors.light.onPrimary,
	},
})
