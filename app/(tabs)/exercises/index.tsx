/**
 * Exercises library list: search, filters, FlatList, create CTA.
 */
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppText } from '@/src/components/app-text'
import type { Exercise } from '@/src/domain/types'
import { AppBannerSlot } from '@/src/features/ads/app-banner-slot'
import { ExerciseListRow } from '@/src/features/exercises/components/exercise-list-row'
import {
	MORE_FILTERS,
	PRIMARY_FILTERS,
	filterExercises,
	type ExerciseFilterId,
} from '@/src/features/exercises/search-exercises'
import { useExerciseRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function ExercisesScreen () {
	const palette = useThemeColors()
	const router = useRouter()
	const exercisesRepo = useExerciseRepository()

	const [items, setItems] = useState<Exercise[]>([])
	const [query, setQuery] = useState('')
	const [filter, setFilter] = useState<ExerciseFilterId>('all')
	const [moreOpen, setMoreOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	const load = useCallback(async () => {
		setIsLoading(true)
		try {
			const list = await exercisesRepo.list()
			setItems(list)
		} finally {
			setIsLoading(false)
		}
	}, [exercisesRepo])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load]),
	)

	const visible = useMemo(
		() => filterExercises(items, { query, filter }),
		[items, query, filter],
	)

	const filterLabel =
		[...PRIMARY_FILTERS, ...MORE_FILTERS].find((item) => item.id === filter)
			?.label ?? 'Все'

	const isMoreFilter = MORE_FILTERS.some((item) => item.id === filter)

	const openCreate = () => {
		router.push('/exercises/new')
	}

	return (
		<SafeAreaView
			edges={['bottom']}
			style={[styles.root, { backgroundColor: palette.background }]}
		>
			<View style={styles.header}>
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Поиск упражнения"
					placeholderTextColor={palette.textMuted}
					style={[
						styles.search,
						{
							color: palette.text,
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
					autoCorrect={false}
					clearButtonMode="while-editing"
					returnKeyType="search"
				/>

				<View style={styles.filters}>
					{PRIMARY_FILTERS.map((item) => (
						<FilterChip
							key={item.id}
							label={item.label}
							selected={filter === item.id}
							onPress={() => setFilter(item.id)}
						/>
					))}
					<FilterChip
						label={isMoreFilter ? filterLabel : 'Ещё'}
						selected={isMoreFilter || moreOpen}
						onPress={() => setMoreOpen(true)}
					/>
				</View>

				<View style={styles.actions}>
					<Pressable
						accessibilityRole="button"
						onPress={openCreate}
						style={({ pressed }) => [
							styles.createButton,
							{
								backgroundColor: palette.primary,
								opacity: pressed ? 0.88 : 1,
							},
						]}
					>
						<AppText
							variant="subtitle"
							style={{ color: palette.onPrimary }}
						>
							+ Своё упражнение
						</AppText>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						onPress={() => router.push('/exercises/archive')}
						style={styles.archiveLink}
					>
						<AppText variant="caption" style={{ color: palette.primary }}>
							Архив упражнений
						</AppText>
					</Pressable>
				</View>
			</View>

			<FlatList
				data={visible}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
				keyboardShouldPersistTaps="handled"
				ListFooterComponent={<AppBannerSlot />}
				ListEmptyComponent={
					isLoading ? (
						<AppText muted style={styles.empty}>
							Загрузка…
						</AppText>
					) : (
						<View style={styles.emptyBox}>
							<AppText variant="title">Ничего не найдено</AppText>
							<AppText muted>
								Попробуйте другой запрос или создайте своё упражнение.
							</AppText>
							<Pressable
								accessibilityRole="button"
								onPress={openCreate}
								style={[
									styles.createButton,
									{ backgroundColor: palette.primary, marginTop: spacing.md },
								]}
							>
								<AppText
									variant="subtitle"
									style={{ color: palette.onPrimary }}
								>
									Создать своё упражнение
								</AppText>
							</Pressable>
						</View>
					)
				}
				renderItem={({ item }) => (
					<ExerciseListRow
						exercise={item}
						onPress={(exercise) => {
							router.push(`/exercises/${exercise.id}`)
						}}
					/>
				)}
			/>

			<Modal
				visible={moreOpen}
				transparent
				animationType="slide"
				onRequestClose={() => setMoreOpen(false)}
			>
				<Pressable
					style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}
					onPress={() => setMoreOpen(false)}
				/>
				<View
					style={[
						styles.sheet,
						{
							backgroundColor: palette.surface,
							borderColor: palette.border,
						},
					]}
				>
					<AppText variant="title">Ещё фильтры</AppText>
					<View style={styles.filters}>
						{MORE_FILTERS.map((item) => (
							<FilterChip
								key={item.id}
								label={item.label}
								selected={filter === item.id}
								onPress={() => {
									setFilter(item.id)
									setMoreOpen(false)
								}}
							/>
						))}
					</View>
					<Pressable
						onPress={() => setMoreOpen(false)}
						style={styles.sheetClose}
					>
						<AppText style={{ color: palette.primary }}>Закрыть</AppText>
					</Pressable>
				</View>
			</Modal>
		</SafeAreaView>
	)
}

function FilterChip ({
	label,
	selected,
	onPress,
}: {
	label: string
	selected: boolean
	onPress: () => void
}) {
	const palette = useThemeColors()
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={[
				styles.filterChip,
				{
					backgroundColor: selected
						? palette.primaryMuted
						: palette.surface,
					borderColor: selected ? palette.primary : palette.border,
				},
			]}
		>
			<AppText
				variant="caption"
				style={{ color: selected ? palette.primary : palette.text }}
			>
				{label}
			</AppText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	header: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.md,
		gap: spacing.sm,
	},
	search: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	filters: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	filterChip: {
		minHeight: 36,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: radius.full,
		borderWidth: StyleSheet.hairlineWidth,
		justifyContent: 'center',
	},
	actions: {
		gap: spacing.xs,
		marginBottom: spacing.xs,
	},
	createButton: {
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	archiveLink: {
		alignSelf: 'flex-start',
		minHeight: 40,
		justifyContent: 'center',
	},
	listContent: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xxl,
		flexGrow: 1,
	},
	empty: {
		textAlign: 'center',
		marginTop: spacing.xl,
	},
	emptyBox: {
		marginTop: spacing.xl,
		gap: spacing.sm,
	},
	modalBackdrop: {
		flex: 1,
	},
	sheet: {
		padding: spacing.lg,
		gap: spacing.md,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopLeftRadius: radius.xl,
		borderTopRightRadius: radius.xl,
	},
	sheetClose: {
		minHeight: touchTarget.minHeight,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
