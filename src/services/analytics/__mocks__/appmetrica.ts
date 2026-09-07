/**
 * Jest stub for the native AppMetrica package.
 */
const AppMetrica = {
	activate: jest.fn(),
	reportEvent: jest.fn(),
	reportError: jest.fn(),
	setLocationTracking: jest.fn(),
	setAdvIdentifiersTracking: jest.fn(),
}

export default AppMetrica
