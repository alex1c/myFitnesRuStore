/**
 * Expo Notifications adapter for rest-timer local notifications.
 *
 * Local notifications work in Expo Go on Android; remote push does not
 * (SDK 53+). Production/dev builds are still preferred for QA.
 */
import { NativeModules, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

import type {
	PermissionStatus,
	RestNotificationClient,
	ScheduleRestNotificationInput,
} from './rest-notification-client'

export const REST_TIMER_CHANNEL_ID = 'rest-timer'

let handlerConfigured = false

export function configureRestNotificationHandler (): void {
	if (handlerConfigured) {
		return
	}
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	})
	handlerConfigured = true
}

function mapPermission (
	status: Notifications.PermissionStatus,
): PermissionStatus {
	if (status === 'granted') {
		return 'granted'
	}
	if (status === 'denied') {
		return 'denied'
	}
	return 'undetermined'
}

export class ExpoRestNotificationClient implements RestNotificationClient {
	async needsExactAlarmAccess (): Promise<boolean> {
		if (Platform.OS !== 'android' || Number(Platform.Version) < 31) {
			return false
		}
		return !(await NativeModules.RestAlarmAccess.canScheduleExactAlarms())
	}

	async requestExactAlarmAccess (): Promise<void> {
		if (await this.needsExactAlarmAccess()) {
			await NativeModules.RestAlarmAccess.requestExactAlarmAccess()
		}
	}

	async ensureChannel (): Promise<void> {
		configureRestNotificationHandler()
		if (Platform.OS !== 'android') {
			return
		}
		await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
			name: 'Таймер отдыха',
			description:
				'Уведомления об окончании отдыха между подходами',
			importance: Notifications.AndroidImportance.HIGH,
			vibrationPattern: [0, 250, 150, 250],
			enableVibrate: true,
			// Omit sound to use Android's default; SDK 57 treats strings as raw filenames.
		})
	}

	async getPermissionStatus (): Promise<PermissionStatus> {
		const current = await Notifications.getPermissionsAsync()
		// Android 13+ can report denied before the first request because
		// notifications are not enabled yet. canAskAgain identifies a requestable state.
		if (current.status === 'denied' && current.canAskAgain) {
			return 'undetermined'
		}
		return mapPermission(current.status)
	}

	async requestPermission (): Promise<PermissionStatus> {
		const current = await Notifications.getPermissionsAsync()
		if (current.status === 'granted') {
			return 'granted'
		}
		if (current.status === 'denied' && !current.canAskAgain) {
			return 'denied'
		}
		const requested = await Notifications.requestPermissionsAsync()
		return mapPermission(requested.status)
	}

	async schedule (input: ScheduleRestNotificationInput): Promise<string> {
		await this.ensureChannel()
		// Cancel any leftover with the same id before rescheduling.
		await Notifications.cancelScheduledNotificationAsync(input.identifier)
		const id = await Notifications.scheduleNotificationAsync({
			identifier: input.identifier,
			content: {
				title: input.title,
				body: input.body,
				sound: true,
				...(Platform.OS === 'android'
					? { channelId: REST_TIMER_CHANNEL_ID }
					: {}),
			},
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.DATE,
				date: input.fireAt,
				...(Platform.OS === 'android'
					? { channelId: REST_TIMER_CHANNEL_ID }
					: {}),
			},
		})
		return id
	}

	async cancel (identifier: string): Promise<void> {
		try {
			await Notifications.cancelScheduledNotificationAsync(identifier)
		} catch {
			// Already fired or missing — treat as cancelled.
		}
	}
}

let sharedClient: ExpoRestNotificationClient | null = null

export function getExpoRestNotificationClient (): ExpoRestNotificationClient {
	if (!sharedClient) {
		sharedClient = new ExpoRestNotificationClient()
	}
	return sharedClient
}
