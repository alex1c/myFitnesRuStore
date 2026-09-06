/**
 * Create a named workout template, then open the editor.
 */
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native'

import { AppText } from '@/src/components/app-text'
import { validateTemplateMeta } from '@/src/features/templates/form-validation'
import { useTemplateRepository } from '@/src/providers/database-provider'
import { radius, spacing, touchTarget, typography } from '@/src/theme'
import { useThemeColors } from '@/src/theme/use-theme-colors'

export default function NewTemplateScreen () {
	const palette = useThemeColors()
	const templates = useTemplateRepository()
	const router = useRouter()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const handleSave = async () => {
		const result = validateTemplateMeta({ name, description })
		if (!result.ok) {
			setError(result.errors.name ?? 'Проверьте название')
			return
		}
		setError(null)
		setIsSaving(true)
		try {
			const created = await templates.create({
				name: result.name,
				description: result.description,
			})
			router.replace(`/templates/edit/${created.id}`)
		} catch (err) {
			Alert.alert(
				'Не удалось сохранить',
				err instanceof Error ? err.message : 'Попробуйте ещё раз',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.content}>
				<AppText variant="label" muted>
					Название
				</AppText>
				<TextInput
					value={name}
					onChangeText={setName}
					placeholder="Например, Грудь + трицепс"
					placeholderTextColor={palette.textMuted}
					style={[
						styles.input,
						{
							color: palette.text,
							borderColor: error ? palette.danger : palette.border,
							backgroundColor: palette.surface,
						},
					]}
					maxLength={80}
					returnKeyType="next"
					autoFocus
				/>
				{error ? (
					<AppText variant="caption" style={{ color: palette.danger }}>
						{error}
					</AppText>
				) : null}

				<AppText variant="label" muted style={styles.label}>
					Описание
				</AppText>
				<TextInput
					value={description}
					onChangeText={setDescription}
					placeholder="Необязательно"
					placeholderTextColor={palette.textMuted}
					multiline
					style={[
						styles.input,
						styles.notes,
						{
							color: palette.text,
							borderColor: palette.border,
							backgroundColor: palette.surface,
						},
					]}
				/>

				<AppText muted>
					После сохранения можно сразу добавить упражнения.
				</AppText>

				<Pressable
					accessibilityRole="button"
					disabled={isSaving}
					onPress={() => {
						void handleSave()
					}}
					style={({ pressed }) => [
						styles.submit,
						{
							backgroundColor: palette.primary,
							opacity: pressed || isSaving ? 0.85 : 1,
						},
					]}
				>
					<AppText variant="subtitle" style={{ color: palette.onPrimary }}>
						{isSaving ? 'Сохранение…' : 'Продолжить'}
					</AppText>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	content: {
		padding: spacing.lg,
		gap: spacing.sm,
	},
	label: {
		marginTop: spacing.sm,
	},
	input: {
		minHeight: touchTarget.minHeight,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	notes: {
		minHeight: 88,
		textAlignVertical: 'top',
		paddingTop: spacing.sm,
	},
	submit: {
		marginTop: spacing.lg,
		minHeight: touchTarget.minHeight,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
