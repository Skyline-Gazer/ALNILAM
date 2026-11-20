/**
 * GA4 runtime (GH Issue #91). Single official async gtag.js tag loaded at
 * most once per document, only when `analytics.googleAnalytics.enabled` AND
 * consent permits (`consent.mode: "off"`, or `analytics` granted in basic
 * mode). `send_page_view: false` disables Enhanced Measurement duplication;
 * this module is the single `page_view` owner and emits exactly one event per
 * completed route change (initial load + `swup:page:view`), with correct
 * `page_location` including the deployment base. Revocation removes the tag
 * and flags; the next navigation loads nothing.
 */

import { subscribeConsent, type ConsentState } from "./consent.ts";

interface WindowWithGtag extends Window {
	dataLayer?: unknown[];
}

const GTAG_ORIGIN = "https://www.googletagmanager.com";
const EVENT_DOMAIN = "page_view";

function pushDataLayer(...args: unknown[]): void {
	(window as WindowWithGtag).dataLayer ??= [];
	(window as WindowWithGtag).dataLayer!.push(args);
}

function injectGtagScript(measurementId: string): HTMLScriptElement {
	const existing = document.querySelector<HTMLScriptElement>(
		`script[src^="${GTAG_ORIGIN}/gtag/js"]`,
	);
	if (existing) return existing;
	const script = document.createElement("script");
	script.async = true;
	script.src = `${GTAG_ORIGIN}/gtag/js?id=${encodeURIComponent(measurementId)}`;
	script.dataset.ga4Loader = measurementId;
	document.head.append(script);
	return script;
}

function removeGtagScript(): void {
	document
		.querySelectorAll<HTMLScriptElement>('script[data-ga4-loader]')
		.forEach((script) => script.remove());
}

function emitPageView(): void {
	pushDataLayer("event", EVENT_DOMAIN, {
		page_location: window.location.href,
		page_title: document.title,
	});
}

export function initAnalytics(measurementId: string, consentGated: boolean): void {
	if (document.documentElement.dataset.ga4Ready === "true") return;
	document.documentElement.dataset.ga4Ready = "true";

	const permitted = (state: ConsentState) =>
		!consentGated || state.analytics === true;

	let started = false;
	// The initial server-rendered view is emitted at start; if Swup also
	// announces the same first view, the equal-href guard drops the duplicate.
	let lastHref = window.location.href;
	let initialGuardArmed = true;

	const start = () => {
		if (started) return;
		started = true;
		injectGtagScript(measurementId);
		pushDataLayer("js", new Date());
		pushDataLayer("consent", "default", {
			analytics_storage: "granted",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
		pushDataLayer("config", measurementId, { send_page_view: false });
		emitPageView();
	};

	const stop = () => {
		if (!started) return;
		started = false;
		removeGtagScript();
	};

	if (!consentGated) {
		start();
	} else {
		subscribeConsent((state) => {
			if (permitted(state)) start();
			else stop();
		});
	}

	window.addEventListener("swup:page:view", () => {
		if (!started) return;
		const href = window.location.href;
		if (initialGuardArmed && href === lastHref) {
			initialGuardArmed = false;
			return;
		}
		initialGuardArmed = false;
		lastHref = href;
		emitPageView();
	});

}
