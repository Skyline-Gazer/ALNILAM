/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />
declare module "virtual:ec-runtime";
declare module "virtual:alnilam-privacy" {
	export interface PrivacyConfig {
		consent: { mode: "off" | "basic" };
		analytics: { googleAnalytics: { enabled: boolean; measurementId: string } };
		ads: {
			adsense: {
				enabled: boolean;
				clientId: string;
				recovery: { mode: "off" | "google" | "custom" };
			};
		};
	}
	export const privacyConfig: PrivacyConfig;
}

declare module "virtual:shirone-music-sidebar" {
	const component:
		| typeof import("@components/organisms/music/MusicSidebar.astro").default
		| null;
	export default component;
}

declare module "*scripts/anime/providers/bangumi.mjs" {
	export function fetchBangumiData(config: unknown): Promise<{
		provider: "bangumi";
		accountRef: string;
		rawItems: unknown[];
	}>;
}

declare module "*scripts/anime/providers/bilibili.mjs" {
	export function fetchBilibiliData(config: unknown): Promise<{
		provider: "bilibili";
		accountRef: string;
		rawItems: unknown[];
	}>;
}
