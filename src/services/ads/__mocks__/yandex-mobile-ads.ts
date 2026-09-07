/**
 * Jest stub for yandex-mobile-ads — no native bridge in unit tests.
 */
export const MobileAds = {
	initialize: jest.fn(async () => undefined),
	setLocationConsent: jest.fn(),
	enableLogging: jest.fn(),
	showDebugPanel: jest.fn(),
}

export class InterstitialAdLoader {
	static create = jest.fn(async () => new InterstitialAdLoader())

	loadAd = jest.fn(async () => {
		throw new Error('Use AdService memory client in unit tests')
	})
}

export class InterstitialAd {
	show = jest.fn(async () => undefined)
}

export const BannerAdSize = {
	stickySize: jest.fn(async (width: number) => ({
		width,
		height: 50,
		initialWidth: width,
		initialHeight: 50,
		widthInPixels: width,
		heightInPixels: 50,
		type: 'sticky',
	})),
	inlineSize: jest.fn(async (width: number, maxHeight: number) => ({
		width,
		height: Math.min(50, maxHeight),
		initialWidth: width,
		initialHeight: 50,
		widthInPixels: width,
		heightInPixels: 50,
		type: 'inline',
	})),
}

export function BannerView () {
	return null
}

export default {
	MobileAds,
	InterstitialAdLoader,
	InterstitialAd,
	BannerAdSize,
	BannerView,
}
