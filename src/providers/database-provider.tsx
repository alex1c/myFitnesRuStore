/**
 * Provides initialized AppDatabase to the React tree.
 * Shows a Russian fallback UI when bootstrap fails.
 * After restore, remounts the app tree so every screen reloads fresh data.
 */
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
	BackupService,
	ExerciseRepository,
	initializeDatabase,
	ProgressService,
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
	backup: BackupService
	schemaVersion: number
	/** Bumped after restore to remount navigation/screens. */
	dataRevision: number
	/** Rebuild services and remount UI after a successful restore. */
	refreshAfterRestore: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

type Status =
	| { kind: 'loading' }
	| { kind: 'ready'; value: DatabaseContextValue }
	| { kind: 'error'; message: string }

type Props = {
	children: React.ReactNode
}

type ServiceBundle = Omit<DatabaseContextValue, 'refreshAfterRestore'>

function buildServices (
	db: AppDatabase,
	schemaVersion: number,
	dataRevision: number,
): ServiceBundle {
	const workouts = new WorkoutService(db, getExpoRestNotificationClient())
	return {
		db,
		schemaVersion,
		dataRevision,
		exercises: new ExerciseRepository(db),
		templates: new WorkoutTemplateRepository(db),
		workouts,
		backup: new BackupService(db),
	}
}

export function DatabaseProvider ({ children }: Props) {
	const [status, setStatus] = useState<Status>({ kind: 'loading' })
	const [attempt, setAttempt] = useState(0)
	const readyRef = useRef<DatabaseContextValue | null>(null)
	const refreshRef = useRef<() => Promise<void>>(async () => {})

	const refreshAfterRestore = useCallback(async () => {
		const current = readyRef.current
		if (!current) {
			return
		}
		const next: DatabaseContextValue = {
			...buildServices(
				current.db,
				current.schemaVersion,
				current.dataRevision + 1,
			),
			refreshAfterRestore: () => refreshRef.current(),
		}
		readyRef.current = next
		setStatus({ kind: 'ready', value: next })

		// Reconcile rest timer via RestTimerService only (no DB-side notification insert).
		try {
			await next.workouts.getActiveDetail()
		} catch {
			// Native notifications may be unavailable; data restore still succeeded.
		}
	}, [])

	useEffect(() => {
		refreshRef.current = refreshAfterRestore
	}, [refreshAfterRestore])

	useEffect(() => {
		let isActive = true

		void (async () => {
			try {
				const { db, schemaVersion } = await initializeDatabase()
				if (!isActive) {
					return
				}
				const value: DatabaseContextValue = {
					...buildServices(db, schemaVersion, 0),
					refreshAfterRestore: () => refreshRef.current(),
				}
				readyRef.current = value
				setStatus({ kind: 'ready', value })
			} catch (error) {
				console.error('Database initialization failed', error)
				if (!isActive) {
					return
				}
				readyRef.current = null
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
		readyRef.current = null
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
			{/* Remount the tree after restore so every screen reloads from SQLite. */}
			<React.Fragment key={status.value.dataRevision}>
				{children}
			</React.Fragment>
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

export function useProgressService (): ProgressService {
	return useDatabase().workouts.progress
}

export function useBackupService (): BackupService {
	return useDatabase().backup
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
