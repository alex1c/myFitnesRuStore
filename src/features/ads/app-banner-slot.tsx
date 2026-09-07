/**
 * Shared sticky banner placement — layout in flow, collapses on failure.
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
	Platform,
	StyleSheet,
	View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'

import { useWorkoutService } from '@/src/providers/database-provider'
import { getBannerAdUnitId } from '@/src/services/ads'
import { shouldShowBanner } from '@/src/services/ads/eligibility'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type BannerSizeLike = {
	width: number
	height: number
}

type AppBannerSlotProps = {
	/**
	 * When provided, skips the active-workout DB query
	 * (e.g. Today already knows the active state).
	 */
	suppress?: boolean
}

/**
 * One banner placement for tab screens.
 * Hidden while an active workout exists; never overlays content.
 */
export function AppBannerSlot ({ suppress }: AppBannerSlotProps) {
	const palette = useThemeColors()
	const workouts = useWorkoutService()
	const [availableWidth, setAvailableWidth] = useState(0)
	// null = unknown — hide until we know there is no active workout
	const [queriedActive, setQueriedActive] = useState<boolean | null>(null)
	const [size, setSize] = useState<BannerSizeLike | null>(null)
	const [failed, setFailed] = useState(false)
	const [loaded, setLoaded] = useState(false)

	useFocusEffect(
		useCallback(() => {
			if (typeof suppress === 'boolean') {
				return
			}
			let cancelled = false
			setQueriedActive(null)
			void (async () => {
				try {
					const active = await workouts.workouts.getActiveWorkout()
					if (!cancelled) {
						setQueriedActive(active !== null)
					}
				} catch {
					if (!cancelled) {
						// Fail closed: active-workout safety wins over ad availability.
						setQueriedActive(true)
					}
				}
			})()
			return () => {
				cancelled = true
			}
		}, [suppress, workouts]),
	)

	const hasActiveWorkout =
		typeof suppress === 'boolean' ? suppress : (queriedActive ?? true)
	const hidden = !shouldShowBanner(hasActiveWorkout)

	useEffect(() => {
		if (hidden || availableWidth <= 0 || Platform.OS === 'web') {
			return
		}
		let cancelled = false
		void (async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const { BannerAdSize } = require('yandex-mobile-ads') as {
					BannerAdSize: {
						stickySize: (width: number) => Promise<BannerSizeLike>
					}
				}
				const next = await BannerAdSize.stickySize(
					availableWidth,
				)
				if (!cancelled) {
					setSize(next)
					setFailed(false)
					setLoaded(false)
				}
			} catch {
				if (!cancelled) {
					setFailed(true)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [hidden, availableWidth])

	if (hidden || failed || Platform.OS === 'web') {
		return null
	}

	// Lazy require keeps Jest (node) from loading the native view.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { BannerView } = require('yandex-mobile-ads') as {
		BannerView: React.ComponentType<{
			size: BannerSizeLike
			adRequest: { adUnitId: string }
			onAdLoaded?: () => void
			onAdFailedToLoad?: () => void
			style?: object
		}>
	}

	return (
		<View
			onLayout={(event) => setAvailableWidth(Math.floor(event.nativeEvent.layout.width))}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				styles.slot,
				{
					// Reserve height only after SDK size is known — avoids empty white gap.
					height: loaded && size ? size.height : 0,
					overflow: 'hidden',
					backgroundColor: palette.surface,
				},
			]}
		>
			{size && <BannerView
				size={size}
				adRequest={{ adUnitId: getBannerAdUnitId() }}
				onAdLoaded={() => {
					setLoaded(true)
				}}
				onAdFailedToLoad={() => {
					setFailed(true)
					setLoaded(false)
				}}
				style={{ width: size.width, height: size.height }}
			/>}
		</View>
	)
}

const styles = StyleSheet.create({
	slot: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
})
