/**
 * AdSense Auto Ads runtime (GH Issue #90). The official async head loader is
 * injected at most once per document, only when `ads.adsense.enabled` AND
 * consent permits (`consent.mode: "off"`, or `ads` granted in basic mode).
 * No ad slot DOM, no resource hints, and no requests in disabled state.
 * Revocation removes the loader; the next navigation loads nothing. Manual
 * slots are deferred; Auto Ads placement is Google-controlled and audited
 * separately after account approval (owner-gated activation).
 */

import { subscribeConsent, type ConsentState } from "./consent.ts";

const LOADER_ORIGIN = "https://pagead2.googlesyndication.com";

export function initAdsense(clientId: string, consentGated: boolean): void {
	if (document.documentElement.dataset.adsenseReady === "true") return;
	document.documentElement.dataset.adsenseReady = "true";

	const permitted = (state: ConsentState) =>
		!consentGated || state.ads === true;

	let started = false;

	const start = () => {
		if (started) return;
		started = true;
		if (!document.querySelector(`script[data-adsense-client]`)) {
			const script = document.createElement("script");
			script.async = true;
			script.crossOrigin = "anonymous";
			script.src = `${LOADER_ORIGIN}/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
			script.dataset.adsenseClient = clientId;
			document.head.append(script);
		}
	};

	const stop = () => {
		if (!started) return;
		started = false;
		document
			.querySelectorAll<HTMLScriptElement>("script[data-adsense-client]")
			.forEach((script) => script.remove());
	};

	if (!consentGated) {
		start();
	} else {
		subscribeConsent((state) => {
			if (permitted(state)) start();
			else stop();
		});
	}
}
