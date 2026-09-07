/**
 * Ещё — theme, data portability, about.
 */
import Constants from 'expo-constants'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import {
	backupFileName,
	csvFileName,
} from '@/src/db'
import { BackupValidationError } from '@/src/features/backup/types'
import {
	deleteCacheFile,
	pickBackupJsonFile,
	shareFile,
	writeCacheTextFile,
} from '@/src/features/backup/file-io'
import {
	THEME_PREFERENCES,
	THEME_PREFERENCE_LABELS,
	type ThemePreference,
} from '@/src/features/settings/theme-preference'
import {
	useBackupService,
	useDatabase,
} from '@/src/providers/database-provider'
import { useThemePreference } from '@/src/providers/theme-preference-provider'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'
import { getAppVersion } from '@/src/utils/app-version'

function isUserCancelled (error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}
	const message = String((error as { message?: string }).message ?? '')
		.toLowerCase()
	return (
		message.includes('cancel')
		|| message.includes('dismiss')
		|| message.includes('отмен')
	)
}

export default function MoreScreen () {
	const palette = useThemeColors()
	const { schemaVersion, refreshAfterRestore } = useDatabase()
	const backup = useBackupService()
	const { preference, setPreference } = useThemePreference()
	const [busy, setBusy] = useState(false)
	const appVersion = getAppVersion()

	const handleCreateBackup = useCallback(async () => {
		if (busy) {
			return
		}
		setBusy(true)
		let uri: string | null = null
		try {
			const payload = await backup.createBackup()
			const contents = backup.serializeBackup(payload)
			uri = await writeCacheTextFile(backupFileName(), contents)
			await shareFile(uri, 'application/json')
			Alert.alert('Резервная копия создана')
		} catch (error) {
			if (isUserCancelled(error)) {
				return
			}
			Alert.alert(
				'Не удалось создать копию',
				'Проверьте свободное место и попробуйте снова.',
			)
		} finally {
			if (uri) {
				await deleteCacheFile(uri)
			}
			setBusy(false)
		}
	}, [backup, busy])

	const runRestore = useCallback(
		async (raw: string) => {
			try {
				const safety = await backup.createBackup()
				await writeCacheTextFile(
					`pre-restore-backup-${Date.now()}.json`,
					backup.serializeBackup(safety),
				)
			} catch {
				// Safety copy is best-effort; do not block restore.
			}

			await backup.restoreFromJson(raw)
			await refreshAfterRestore()
			Alert.alert('Данные восстановлены')
		},
		[backup, refreshAfterRestore],
	)

	const handleRestore = useCallback(async () => {
		if (busy) {
			return
		}
		setBusy(true)
		try {
			const picked = await pickBackupJsonFile()
			if (picked.kind === 'cancelled') {
				return
			}

			Alert.alert(
				'Восстановить данные?',
				'Текущие тренировки и настройки будут заменены данными из резервной копии.',
				[
					{ text: 'Отмена', style: 'cancel' },
					{
						text: 'Восстановить',
						style: 'destructive',
						onPress: () => {
							void (async () => {
								setBusy(true)
								try {
									await runRestore(picked.contents)
								} catch (error) {
									if (error instanceof BackupValidationError) {
										Alert.alert(
											error.code === 'VERSION'
												? error.message
												: error.code === 'INTEGRITY'
													? 'Не удалось восстановить данные. Текущие данные не изменены.'
													: 'Не удалось прочитать резервную копию.',
										)
										return
									}
									Alert.alert(
										'Не удалось восстановить данные. Текущие данные не изменены.',
									)
								} finally {
									setBusy(false)
								}
							})()
						},
					},
				],
			)
		} catch (error) {
			if (isUserCancelled(error)) {
				return
			}
			Alert.alert('Не удалось прочитать резервную копию.')
		} finally {
			setBusy(false)
		}
	}, [busy, runRestore])

	const handleExportCsv = useCallback(async () => {
		if (busy) {
			return
		}
		setBusy(true)
		let uri: string | null = null
		try {
			const csv = await backup.exportCompletedSetsCsv()
			uri = await writeCacheTextFile(csvFileName(), csv)
			await shareFile(uri, 'text/csv')
			Alert.alert('Экспорт готов')
		} catch (error) {
			if (isUserCancelled(error)) {
				return
			}
			Alert.alert(
				'Не удалось экспортировать',
				'Проверьте свободное место и попробуйте снова.',
			)
		} finally {
			if (uri) {
				await deleteCacheFile(uri)
			}
			setBusy(false)
		}
	}, [backup, busy])

	return (
		<Screen scroll>
			<AppText variant="title">Ещё</AppText>
			<AppText muted>Данные хранятся на устройстве.</AppText>

			<SurfaceCard>
				<AppText variant="subtitle">Интерфейс</AppText>
				<AppText muted style={styles.sectionHint}>
					Тема
				</AppText>
				<View style={styles.themeRow}>
					{THEME_PREFERENCES.map((option) => (
						<ThemeChip
							key={option}
							label={THEME_PREFERENCE_LABELS[option]}
							selected={preference === option}
							disabled={busy}
							onPress={() => {
								void setPreference(option as ThemePreference)
							}}
						/>
					))}
				</View>
			</SurfaceCard>

			<SurfaceCard>
				<AppText variant="subtitle">Данные</AppText>
				<ActionRow
					title="Резервная копия"
					subtitle="Создать файл со всеми данными."
					disabled={busy}
					onPress={() => {
						void handleCreateBackup()
					}}
				/>
				<ActionRow
					title="Восстановить"
					subtitle="Заменить текущие данные из резервной копии."
					disabled={busy}
					onPress={() => {
						void handleRestore()
					}}
				/>
				<ActionRow
					title="Экспорт тренировок"
					subtitle="CSV для Excel и таблиц."
					disabled={busy}
					onPress={() => {
						void handleExportCsv()
					}}
				/>
				{busy ? (
					<View style={styles.busyRow}>
						<ActivityIndicator color={palette.primary} />
						<AppText muted>Подождите…</AppText>
					</View>
				) : null}
			</SurfaceCard>

			<SurfaceCard>
				<AppText variant="subtitle">О приложении</AppText>
				<AppText muted>
					Мой спортзал — офлайн-дневник силовых тренировок.
				</AppText>
				<AppText variant="caption" muted>
					Версия {appVersion}
					{Constants.expoConfig?.android?.versionCode
						? ` (${Constants.expoConfig.android.versionCode})`
						: ''}
				</AppText>
				<AppText variant="caption" muted>
					Схема данных: {schemaVersion}
				</AppText>
			</SurfaceCard>
		</Screen>
	)
}

type ThemeChipProps = {
	label: string
	selected: boolean
	disabled?: boolean
	onPress: () => void
}

function ThemeChip ({ label, selected, disabled, onPress }: ThemeChipProps) {
	const palette = useThemeColors()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={`Тема: ${label}`}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.chip,
				{
					backgroundColor: selected
						? palette.primary
						: palette.surfaceElevated,
					borderColor: selected ? palette.primary : palette.border,
					opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
				},
			]}
		>
			<AppText
				variant="caption"
				style={{ color: selected ? palette.onPrimary : palette.text }}
			>
				{label}
			</AppText>
		</Pressable>
	)
}

type ActionRowProps = {
	title: string
	subtitle: string
	disabled?: boolean
	onPress: () => void
}

function ActionRow ({ title, subtitle, disabled, onPress }: ActionRowProps) {
	const palette = useThemeColors()
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.action,
				{
					borderColor: palette.border,
					opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
				},
			]}
		>
			<AppText variant="subtitle">{title}</AppText>
			<AppText muted>{subtitle}</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	sectionHint: {
		marginTop: spacing.xxs,
	},
	themeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
		paddingTop: spacing.sm,
	},
	chip: {
		minHeight: touchTarget.minHeight,
		paddingHorizontal: spacing.md,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
	},
	action: {
		minHeight: touchTarget.minHeight,
		paddingVertical: spacing.sm,
		borderTopWidth: StyleSheet.hairlineWidth,
		gap: spacing.xxs,
	},
	busyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingTop: spacing.sm,
	},
})
