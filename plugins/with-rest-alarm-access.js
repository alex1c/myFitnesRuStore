/* global __dirname */
const fs = require('node:fs/promises')
const path = require('node:path')
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins')

module.exports = function withRestAlarmAccess (config) {
	config = withMainApplication(config, (mod) => {
		const marker = 'PackageList(this).packages.apply {'
		if (!mod.modResults.contents.includes('add(RestAlarmPackage())')) {
			if (mod.modResults.language !== 'kt' || !mod.modResults.contents.includes(marker)) {
				throw new Error('Rest alarm access requires the Expo Kotlin MainApplication package list')
			}
			mod.modResults.contents = mod.modResults.contents.replace(marker, `${marker}\n          add(RestAlarmPackage())`)
		}
		return mod
	})
	return withDangerousMod(config, ['android', async (mod) => {
		const packageName = mod.android.package
		const destination = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'))
		await fs.mkdir(destination, { recursive: true })
		const source = await fs.readFile(path.join(__dirname, 'android/RestAlarmPackage.kt'), 'utf8')
		await fs.writeFile(path.join(destination, 'RestAlarmPackage.kt'), source.replace('__PACKAGE_NAME__', packageName))
		return mod
	}])
}
