/**
 * Notification adapter interface for rest-timer scheduling.
 * Native Expo implementation and in-memory mock both satisfy this.
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

export type ScheduleRestNotificationInput = {
	identifier: string
	fireAt: Date
	title: string
	body: string
}

export interface RestNotificationClient {
	ensureChannel (): Promise<void>
	getPermissionStatus (): Promise<PermissionStatus>
	requestPermission (): Promise<PermissionStatus>
	needsExactAlarmAccess? (): Promise<boolean>
	requestExactAlarmAccess? (): Promise<void>
	schedule (input: ScheduleRestNotificationInput): Promise<string>
	cancel (identifier: string): Promise<void>
}
