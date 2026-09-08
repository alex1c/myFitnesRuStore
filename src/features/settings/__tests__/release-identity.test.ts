/**
 * Release identity and production config assertions for Phase 12A.
 */
import fs from 'node:fs'
import path from 'node:path'

import appConfig from '../../../../app.json'
import {
	ANDROID_PACKAGE,
	APP_DISPLAY_NAME,
	APP_VERSION_CODE,
	APP_VERSION_NAME,
	PRIVACY_POLICY_URL,
	SUPPORT_EMAIL,
	SUPPORT_MAILTO_URL,
} from '@/src/features/settings/release-identity'
import { APPMETRICA_API_KEY } from '@/src/services/analytics/config'
import {
	PRODUCTION_BANNER_AD_UNIT_ID,
	PRODUCTION_INTERSTITIAL_AD_UNIT_ID,
	UNUSED_AD_UNIT_IDS,
	getProductionAdUnitIds,
} from '@/src/services/ads/config'

describe('release identity', () => {
	it('locks display name, package and version for 1.0.0', () => {
		expect(APP_DISPLAY_NAME).toBe('Мой спортзал')
		expect(ANDROID_PACKAGE).toBe('com.calculatorplatform.myfitness')
		expect(APP_VERSION_NAME).toBe('1.0.0')
		expect(APP_VERSION_CODE).toBe(1)

		expect(appConfig.expo.name).toBe(APP_DISPLAY_NAME)
		expect(appConfig.expo.android.package).toBe(ANDROID_PACKAGE)
		expect(appConfig.expo.version).toBe(APP_VERSION_NAME)
		expect(appConfig.expo.android.versionCode).toBe(APP_VERSION_CODE)
	})

	it('uses production support email and privacy URL', () => {
		expect(SUPPORT_EMAIL).toBe('rustore-alex1c@yandex.ru')
		expect(SUPPORT_MAILTO_URL).toBe('mailto:rustore-alex1c@yandex.ru')
		expect(PRIVACY_POLICY_URL).toBe(
			'https://alex1c.github.io/myFitnesRuStore/privacy.html',
		)
		expect(SUPPORT_EMAIL).not.toMatch(/forest-music/i)
	})

	it('ships privacy.html under docs for GitHub Pages /docs', () => {
		const privacyPath = path.join(process.cwd(), 'docs', 'privacy.html')
		expect(fs.existsSync(privacyPath)).toBe(true)
		const html = fs.readFileSync(privacyPath, 'utf8')
		expect(html).toMatch(/Политика конфиденциальности/)
		expect(html).toMatch(/rustore-alex1c@yandex\.ru/)
		expect(html).toMatch(/AppMetrica/)
		expect(html).toMatch(/Yandex Mobile Ads/)
		expect(html).toMatch(/locationTracking=false/)
	})

	it('points Expo icon assets at the approved generated set', () => {
		expect(appConfig.expo.icon).toBe('./assets/images/icon.png')
		expect(appConfig.expo.android.adaptiveIcon.foregroundImage).toBe(
			'./assets/images/android-icon-foreground.png',
		)
		expect(appConfig.expo.android.adaptiveIcon.backgroundColor).toBe(
			'#0190E8',
		)

		const master = path.join(process.cwd(), 'assets', 'icon_gpt.png')
		const storeIcon = path.join(
			process.cwd(),
			'release-artifacts',
			'store-icon.png',
		)
		expect(fs.existsSync(master)).toBe(true)
		expect(fs.existsSync(storeIcon)).toBe(true)
	})
})

describe('production monetization and analytics config', () => {
	it('keeps production AppMetrica key', () => {
		expect(APPMETRICA_API_KEY).toBe(
			'a32d999f-baf6-47ee-bb66-ba951790be65',
		)
	})

	it('keeps production banner/interstitial IDs and unused formats unused', () => {
		const ids = getProductionAdUnitIds()
		expect(ids.bannerId).toBe('R-M-19996564-1')
		expect(ids.interstitialId).toBe('R-M-19996564-2')
		expect(PRODUCTION_BANNER_AD_UNIT_ID).toBe('R-M-19996564-1')
		expect(PRODUCTION_INTERSTITIAL_AD_UNIT_ID).toBe('R-M-19996564-2')
		expect(UNUSED_AD_UNIT_IDS.appOpen).toBe('R-M-19996564-4')
		expect(UNUSED_AD_UNIT_IDS.rewarded).toBe('R-M-19996564-3')
	})
})
