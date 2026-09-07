import { AndroidConfig } from '@expo/config-plugins'
import appConfig from '../../../app.json'

describe('Android production permissions', () => {
	it('declares user-controlled exact alarm access for the rest timer', () => {
		expect(appConfig.expo.android.permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM')
		expect(appConfig.expo.android.permissions).not.toContain('android.permission.USE_EXACT_ALARM')
		expect(appConfig.expo.plugins).toContain('./plugins/with-rest-alarm-access')
	})
	it('removes the template overlay permission during manifest generation', () => {
		const permission = 'android.permission.SYSTEM_ALERT_WINDOW'
		expect(appConfig.expo.android.blockedPermissions).toContain(permission)
		const manifest = AndroidConfig.Permissions.addBlockedPermissions(
			{
				manifest: {
					$: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
					queries: [],
					'uses-permission': [
						{ $: { 'android:name': permission } },
						{ $: { 'android:name': 'android.permission.INTERNET' } },
					],
				},
			},
			appConfig.expo.android.blockedPermissions,
		)
		expect(manifest.manifest['uses-permission']).toEqual([
			{ $: { 'android:name': 'android.permission.INTERNET' } },
			{ $: { 'android:name': permission, 'tools:node': 'remove' } },
		])
	})
})
