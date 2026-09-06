/**
 * Device file helpers for backup/CSV share and restore picker.
 * Uses Expo legacy FileSystem for stable cache write/read APIs.
 */
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

export type PickedTextFile =
	| { kind: 'cancelled' }
	| { kind: 'ok'; name: string; contents: string }

export async function writeCacheTextFile (
	fileName: string,
	contents: string,
): Promise<string> {
	const directory = FileSystem.cacheDirectory
	if (!directory) {
		throw new Error('Файловая система недоступна')
	}
	const uri = `${directory}${fileName}`
	await FileSystem.writeAsStringAsync(uri, contents, {
		encoding: FileSystem.EncodingType.UTF8,
	})
	return uri
}

export async function shareFile (uri: string, mimeType: string): Promise<void> {
	const available = await Sharing.isAvailableAsync()
	if (!available) {
		throw new Error('Обмен файлами недоступен на этом устройстве')
	}
	await Sharing.shareAsync(uri, {
		mimeType,
		dialogTitle: 'Сохранить файл',
		UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
	})
}

export async function deleteCacheFile (uri: string): Promise<void> {
	try {
		await FileSystem.deleteAsync(uri, { idempotent: true })
	} catch {
		// Best-effort cleanup of temporary cache files only.
	}
}

export async function pickBackupJsonFile (): Promise<PickedTextFile> {
	const result = await DocumentPicker.getDocumentAsync({
		type: ['application/json', 'text/json', 'text/plain', '*/*'],
		copyToCacheDirectory: true,
		multiple: false,
	})
	if (result.canceled || !result.assets?.[0]) {
		return { kind: 'cancelled' }
	}
	const asset = result.assets[0]
	const contents = await FileSystem.readAsStringAsync(asset.uri, {
		encoding: FileSystem.EncodingType.UTF8,
	})
	return { kind: 'ok', name: asset.name, contents }
}
