/**
 * Design tokens for «Мой спортзал».
 * Keep raw values here so screens never hardcode hex or spacing.
 * Light/Dark palettes share the same token shape for future theming.
 */

export const spacing = {
	xxs: 4,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
} as const

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	full: 9999,
} as const

export const typography = {
	hero: {
		fontSize: 32,
		lineHeight: 40,
		fontWeight: '700' as const,
	},
	title: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '600' as const,
	},
	subtitle: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '500' as const,
	},
	body: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '400' as const,
	},
	caption: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '400' as const,
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600' as const,
		letterSpacing: 0.4,
	},
} as const

/** Minimum comfortable tap target between heavy sets. */
export const touchTarget = {
	minHeight: 48,
	minWidth: 48,
} as const

export type ColorPalette = {
	background: string
	surface: string
	surfaceElevated: string
	border: string
	text: string
	textMuted: string
	primary: string
	primaryMuted: string
	accent: string
	success: string
	danger: string
	tabBar: string
	tabInactive: string
	overlay: string
	onPrimary: string
}

/**
 * Calm athletic palette — teal primary, soft neutrals, no neon.
 * Shape is identical for light/dark so a theme switch later is local.
 */
export const colors: { light: ColorPalette; dark: ColorPalette } = {
	light: {
		background: '#F3F6F4',
		surface: '#FFFFFF',
		surfaceElevated: '#EBF1EE',
		border: '#D5DED9',
		text: '#15201C',
		textMuted: '#5F6F68',
		primary: '#1F6B5A',
		primaryMuted: '#D8EBE5',
		accent: '#2A8F7A',
		success: '#2E7D4F',
		danger: '#C4473A',
		tabBar: '#FFFFFF',
		tabInactive: '#8A9791',
		overlay: 'rgba(21, 32, 28, 0.45)',
		onPrimary: '#FFFFFF',
	},
	dark: {
		background: '#101614',
		surface: '#1A221F',
		surfaceElevated: '#24302C',
		border: '#2F3C37',
		text: '#E8EEEB',
		textMuted: '#8E9C96',
		primary: '#3DAB93',
		primaryMuted: '#1E3A33',
		accent: '#4DBDA4',
		success: '#4CAF70',
		danger: '#E06B5E',
		tabBar: '#1A221F',
		tabInactive: '#7A8882',
		overlay: 'rgba(0, 0, 0, 0.55)',
		onPrimary: '#0B1512',
	},
}
