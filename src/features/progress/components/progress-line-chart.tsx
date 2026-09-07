/**
 * Lightweight SVG line chart for progress time series.
 */
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg'

import { AppText } from '@/src/components/app-text'
import type { ChartPoint } from '@/src/db/services/progress-service'
import { formatHistoryDate } from '@/src/features/workout/history-format'
import { spacing } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

type Props = {
	points: ChartPoint[]
	height?: number
}

export function ProgressLineChart ({ points, height = 180 }: Props) {
	const palette = useThemeColors()
	const width = 320

	const geometry = useMemo(() => {
		if (points.length < 2) {
			return null
		}
		const padX = 28
		const padY = 20
		const values = points
			.map((point) => point.value)
			.filter((value) => Number.isFinite(value))
		if (values.length < 2) {
			return null
		}
		const minY = Math.min(...values)
		const maxY = Math.max(...values)
		const spanY = maxY - minY || 1
		const stepX = (width - padX * 2) / (points.length - 1)

		const mapped = points.map((point, index) => {
			const safeValue = Number.isFinite(point.value) ? point.value : minY
			const x = padX + index * stepX
			const y =
				padY + ((maxY - safeValue) / spanY) * (height - padY * 2)
			return { x, y, point }
		})

		const polyline = mapped
			.map((item) => `${item.x},${item.y}`)
			.join(' ')

		const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1]
			.filter((value, index, all) => all.indexOf(value) === index)

		return { mapped, polyline, minY, maxY, labelIndexes }
	}, [height, points])

	if (!geometry) {
		return (
			<AppText muted>
				Пока недостаточно данных для графика.
			</AppText>
		)
	}

	return (
		<View style={styles.wrap}>
			<Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
				<Polyline
					points={geometry.polyline}
					fill="none"
					stroke={palette.primary}
					strokeWidth={2.5}
				/>
				{geometry.mapped.map((item) => (
					<Circle
						key={item.point.workoutId}
						cx={item.x}
						cy={item.y}
						r={3}
						fill={palette.primary}
					/>
				))}
				{geometry.labelIndexes.map((index) => {
					const item = geometry.mapped[index]
					if (!item) {
						return null
					}
					return (
						<SvgText
							key={`label-${item.point.workoutId}`}
							x={item.x}
							y={height - 4}
							fontSize="10"
							fill={palette.textMuted}
							textAnchor="middle"
						>
							{formatHistoryDate(item.point.finishedAt)}
						</SvgText>
					)
				})}
			</Svg>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		marginTop: spacing.sm,
		minHeight: 160,
	},
})
