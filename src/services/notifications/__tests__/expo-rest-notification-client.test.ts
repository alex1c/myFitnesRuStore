import * as Notifications from 'expo-notifications'
import { NativeModules } from 'react-native'
import { ExpoRestNotificationClient } from '../expo-rest-notification-client'

jest.mock('react-native', () => ({
	Platform: { OS: 'android', Version: 33 },
	NativeModules: { RestAlarmAccess: {
		canScheduleExactAlarms: jest.fn(),
		requestExactAlarmAccess: jest.fn(),
	} },
}))
jest.mock('expo-notifications', () => ({
	getPermissionsAsync: jest.fn(),
	requestPermissionsAsync: jest.fn(),
	setNotificationChannelAsync: jest.fn(),
	setNotificationHandler: jest.fn(),
	AndroidImportance: { HIGH: 4 },
}))

describe('native rest notification adapter', () => {
	it('opens exact alarm settings only when access is missing', async () => {
		const bridge = NativeModules.RestAlarmAccess
		bridge.canScheduleExactAlarms.mockResolvedValue(false)
		const client = new ExpoRestNotificationClient()
		expect(await client.needsExactAlarmAccess()).toBe(true)
		await client.requestExactAlarmAccess()
		expect(bridge.requestExactAlarmAccess).toHaveBeenCalledTimes(1)
		bridge.canScheduleExactAlarms.mockResolvedValue(true)
		expect(await client.needsExactAlarmAccess()).toBe(false)
		await client.requestExactAlarmAccess()
		expect(bridge.requestExactAlarmAccess).toHaveBeenCalledTimes(1)
	})
	it.each([
		['denied', true, 'undetermined'],
		['denied', false, 'denied'],
		['granted', true, 'granted'],
	])('maps Android status %s with canAskAgain=%s to %s', async (status, canAskAgain, expected) => {
		jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
			status: status as Notifications.PermissionStatus,
			canAskAgain,
			granted: status === 'granted',
			expires: 'never',
		})
		expect(await new ExpoRestNotificationClient().getPermissionStatus()).toBe(expected)
	})

	it('uses Android default channel sound without requesting a missing raw resource', async () => {
		await new ExpoRestNotificationClient().ensureChannel()
		const [id, channel] = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls[0]!
		expect(id).toBe('rest-timer')
		expect(channel).not.toHaveProperty('sound')
		expect(channel).toMatchObject({ importance: 4, enableVibrate: true, vibrationPattern: [0, 250, 150, 250] })
	})
})
