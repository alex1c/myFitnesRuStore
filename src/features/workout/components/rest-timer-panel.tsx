/**
 * Isolated rest-timer panel — own 1s tick so exercise rows do not re-render.
 */
import React, { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import {
	formatCountdown,
	isRestActive,
	remainingMs,
} from '@/src/features/workout/rest-timer-logic'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	endsAt: string
	onAdd15: () => void
	onMinus15: () => void
	onSkip: () => void
	onExpired: () => void
}

export function RestTimerPanel ({
	endsAt,
	onAdd15,
	onMinus15,
	onSkip,
	onExpired,
}: Props) {
	const palette = useThemeColors()
	const [now, setNow] = useState(0)
	const expiredHandledFor = useRef<string | null>(null)
	const onExpiredRef = useRef(onExpired)

	useEffect(() => {
		onExpiredRef.current = onExpired
	}, [onExpired])

	useEffect(() => {
		const tick = () => setNow(Date.now())
		tick()
		const timer = setInterval(tick, 1000)
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				tick()
			}
		})
		return () => {
			clearInterval(timer)
			sub.remove()
		}
	}, [])

	const active = now > 0 && isRestActive(endsAt, now)
	const showFinished = now > 0 && !active

	useEffect(() => {
		if (!showFinished) {
			return
		}
		if (expiredHandledFor.current === endsAt) {
			return
		}
		expiredHandledFor.current = endsAt
		onExpiredRef.current()
	}, [endsAt, showFinished])

	if (!now) {
		return null
	}

	if (showFinished) {
		return (
			<View
				style={[
					styles.panel,
					{
						backgroundColor: palette.primaryMuted,
						borderColor: palette.primary,
					},
				]}
			>
				<AppText variant="subtitle">Отдых закончен</AppText>
			</View>
		)
	}

	return (
		<View
			style={[
				styles.panel,
				{
					backgroundColor: palette.surfaceElevated,
					borderColor: palette.primary,
				},
			]}
		>
			<View style={styles.top}>
				<AppText variant="caption" muted>
					Отдых
				</AppText>
				<AppText style={styles.countdown}>
					{formatCountdown(remainingMs(endsAt, now))}
				</AppText>
			</View>
			<View style={styles.actions}>
				<Pressable
					onPress={onMinus15}
					style={[styles.btn, { borderColor: palette.border }]}
				>
					<AppText>−15 сек</AppText>
				</Pressable>
				<Pressable
					onPress={onAdd15}
					style={[styles.btn, { borderColor: palette.border }]}
				>
					<AppText>+15 сек</AppText>
				</Pressable>
				<Pressable
					onPress={onSkip}
					style={[
						styles.btn,
						styles.skip,
						{ backgroundColor: palette.primary },
					]}
				>
					<AppText style={{ color: palette.onPrimary }}>Пропустить</AppText>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	panel: {
		marginHorizontal: spacing.lg,
		marginBottom: spacing.sm,
		borderWidth: 1.5,
		borderRadius: radius.lg,
		padding: spacing.md,
		gap: spacing.sm,
	},
	top: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	countdown: {
		...typography.title,
		fontVariant: ['tabular-nums'],
	},
	actions: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	btn: {
		flex: 1,
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xs,
	},
	skip: {
		borderWidth: 0,
		flex: 1.2,
	},
})
