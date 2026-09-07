/**
 * Offline in-app guide — short practical lessons, no ads.
 */
import { useRouter, type Href } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { AppText } from '@/src/components/app-text'
import { Screen } from '@/src/components/screen'
import { SurfaceCard } from '@/src/components/surface-card'
import { SetLoggingMockup } from '@/src/features/help/components/set-logging-mockup'
import {
	HELP_INTRO,
	getHelpLessons,
	type HelpLesson,
} from '@/src/features/help/lessons'
import { radius, spacing, touchTarget } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function HowToUseScreen () {
	const lessons = getHelpLessons()

	return (
		<Screen>
			<AppText variant="title" accessibilityRole="header">
				Как пользоваться
			</AppText>
			<AppText>{HELP_INTRO}</AppText>

			{lessons.map((lesson) => (
				<LessonCard key={lesson.id} lesson={lesson} />
			))}
		</Screen>
	)
}

function LessonCard ({ lesson }: { lesson: HelpLesson }) {
	const palette = useThemeColors()
	const router = useRouter()

	return (
		<SurfaceCard
			accessibilityLabel={`Урок ${lesson.order}. ${lesson.title}`}
		>
			<View style={styles.headerRow}>
				<View
					style={[
						styles.badge,
						{ backgroundColor: palette.primaryMuted },
					]}
				>
					<AppText
						variant="subtitle"
						style={{ color: palette.primary }}
					>
						{lesson.order}
					</AppText>
				</View>
				<AppText
					variant="subtitle"
					style={styles.title}
					accessibilityRole="header"
				>
					{lesson.title}
				</AppText>
			</View>

			{lesson.paragraphs.map((paragraph) => (
				<AppText key={paragraph} muted>
					{paragraph}
				</AppText>
			))}

			{lesson.emphasis ? (
				<AppText style={{ color: palette.primary }}>
					{lesson.emphasis}
				</AppText>
			) : null}

			{lesson.showSetMockup ? <SetLoggingMockup /> : null}

			{lesson.action ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={lesson.action.label}
					onPress={() => {
						router.push(lesson.action!.href as Href)
					}}
					style={[
						styles.action,
						{ borderColor: palette.primary },
					]}
				>
					<AppText style={{ color: palette.primary }}>
						{lesson.action.label}
					</AppText>
				</Pressable>
			) : null}
		</SurfaceCard>
	)
}

const styles = StyleSheet.create({
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	badge: {
		width: 36,
		minHeight: 36,
		borderRadius: radius.full,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		flex: 1,
		flexShrink: 1,
	},
	action: {
		marginTop: spacing.xs,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
})
