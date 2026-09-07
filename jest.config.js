/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
		'^@appmetrica/react-native-analytics$':
			'<rootDir>/src/services/analytics/__mocks__/appmetrica.ts',
		'^yandex-mobile-ads$':
			'<rootDir>/src/services/ads/__mocks__/yandex-mobile-ads.ts',
	},
	transform: {
		'^.+\\.(ts|tsx)$': [
			'babel-jest',
			{
				presets: [
					['babel-preset-expo', { jsxRuntime: 'automatic' }],
				],
			},
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	clearMocks: true,
}
