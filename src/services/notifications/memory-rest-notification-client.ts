/**
 * In-memory notification client for unit/service tests.
 */
import type {
	PermissionStatus,
	RestNotificationClient,
	ScheduleRestNotificationInput,
} from './rest-notification-client'

export class MemoryRestNotificationClient implements RestNotificationClient {
	permission: PermissionStatus = 'granted'
	scheduled: ScheduleRestNotificationInput[] = []
	cancelled: string[] = []
	channelEnsured = 0

	async ensureChannel (): Promise<void> {
		this.channelEnsured += 1
	}

	async getPermissionStatus (): Promise<PermissionStatus> {
		return this.permission
	}

	async requestPermission (): Promise<PermissionStatus> {
		if (this.permission === 'undetermined') {
			this.permission = 'granted'
		}
		return this.permission
	}

	async schedule (input: ScheduleRestNotificationInput): Promise<string> {
		this.scheduled = this.scheduled.filter(
			(item) => item.identifier !== input.identifier,
		)
		this.scheduled.push({ ...input })
		return input.identifier
	}

	async cancel (identifier: string): Promise<void> {
		this.cancelled.push(identifier)
		this.scheduled = this.scheduled.filter(
			(item) => item.identifier !== identifier,
		)
	}
}
