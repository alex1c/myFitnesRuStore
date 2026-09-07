/**
 * App marketing version for About screen (Expo config when available).
 */
import Constants from 'expo-constants'

export function getAppVersion (): string {
	const fromConfig = Constants.expoConfig?.version
	if (typeof fromConfig === 'string' && fromConfig.length > 0) {
		return fromConfig
	}
	const native = Constants.nativeAppVersion
	if (typeof native === 'string' && native.length > 0) {
		return native
	}
	return '1.0.0'
}
