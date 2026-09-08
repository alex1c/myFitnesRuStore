const { withGradleProperties } = require('@expo/config-plugins')

module.exports = function withProductionAbis (config) {
	return withGradleProperties(config, (configWithProperties) => {
		const property = configWithProperties.modResults.find(
			(item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
		)

		if (property) {
			property.value = 'armeabi-v7a,arm64-v8a'
		} else {
			configWithProperties.modResults.push({
				type: 'property',
				key: 'reactNativeArchitectures',
				value: 'armeabi-v7a,arm64-v8a'
			})
		}

		return configWithProperties
	})
}
