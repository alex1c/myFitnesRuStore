/**
 * Compact non-blocking PR banner for the active workout screen.
 */
import React, { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import type { PersonalRecordEvent } from '@/src/db/services/progress-service'
import { radius, spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	event: PersonalRecordEvent
	onDismiss: () => void
}

export function PersonalRecordBanner ({ event, onDismiss }: Props) {
	const palette = useThemeColors()

	useEffect(() => {
		const timer = setTimeout(onDismiss, 4500)
		return () => clearTimeout(timer)
	}, [event, onDismiss])

	return (
		<Pressable
			onPress={onDismiss}
			style={[
				styles.banner,
				{
					backgroundColor: palette.primaryMuted,
					borderColor: palette.primary,
				},
			]}
		>
			<View style={styles.text}>
				<AppText variant="subtitle">Личный рекорд</AppText>
				<AppText>{event.exerciseName}</AppText>
				<AppText muted>{event.valueLabel}</AppText>
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	banner: {
		marginHorizontal: spacing.lg,
		marginBottom: spacing.sm,
		borderWidth: 1,
		borderRadius: radius.lg,
		padding: spacing.md,
	},
	text: {
		gap: 2,
	},
})
