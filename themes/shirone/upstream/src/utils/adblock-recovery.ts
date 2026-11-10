/**
 * Don't Kill My Ads — custom ad-blocking recovery banner (GH Issue #93).
 *
 * Active only when `ads.adsense.enabled` AND `ads.adsense.recovery.mode` is
 * `"custom"` AND ads consent permits (granted, or consent.mode off). The
 * probe is a first-party, time-bounded bait-element check (common filter-list
 * classes); a failed Google request alone is never treated as blocking.
 * The notice is a fixed overlay: no content lock, no CLS, keyboard and Esc
 * close, dismissed at most once per `recovery.dismissDays` via a versioned
 * localStorage timestamp. `mode: "google"` renders the official recovery
 * tag exactly as documented instead; the two modes are mutually exclusive
 * by schema. Disabled/off mode ships none of this module.
 */

import {
	getConsent,
	subscribeConsent,
	type ConsentState,
} from "./consent.ts";

const DISMISS_KEY = "alnilam-dkma:dismissedAt";
const PROBE_TIMEOUT_MS = 1_200;

interface DkmaLabels {
	title: string;
	description: string;
	continueReading: string;
	allowHint: string;
}

function readLabels(mount: HTMLElement): DkmaLabels {
	return {
		title: mount.dataset.labelTitle ?? "",
		description: mount.dataset.labelDescription ?? "",
		continueReading: mount.dataset.labelContinue ?? "",
		allowHint: mount.dataset.labelAllowHint ?? "",
	};
}

function dismissedWithinWindow(dismissDays: number): boolean {
	try {
		const raw = window.localStorage.getItem(DISMISS_KEY);
		if (!raw) return false;
		const dismissedAt = Number(raw);
		if (!Number.isFinite(dismissedAt)) return false;
		return Date.now() - dismissedAt < dismissDays * 24 * 60 * 60 * 1000;
	} catch {
		return false;
	}
}

function persistDismissal(): void {
	try {
		window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
	} catch {
		/* storage unavailable: banner may reappear, never blocks content */
	}
}

/**
 * High-confidence first-party bait probe: an element styled like common ad
 * containers must keep non-zero size. Filter-list hiding is a conclusive
 * local signal; anything else (offline, CSP, slow) stays UNKNOWN and shows
 * nothing.
 */
function probeAdblock(): Promise<boolean> {
	return new Promise((resolve) => {
		const bait = document.createElement("div");
		bait.className = "adsbox ad-banner banner-ads textads publicitas";
		bait.setAttribute("aria-hidden", "true");
		bait.style.cssText =
			"position:absolute;left:-9999px;top:-9999px;width:8px;height:8px;";
		document.body.append(bait);
		const finish = (blocked: boolean) => {
			bait.remove();
			resolve(blocked);
		};
		window.setTimeout(() => {
			const hidden =
				bait.offsetHeight === 0 ||
				bait.offsetParent === null ||
				window.getComputedStyle(bait).display === "none";
			finish(hidden);
		}, PROBE_TIMEOUT_MS);
	});
}

function buildBanner(mount: HTMLElement, labels: DkmaLabels): void {
	mount.textContent = "";
	const panel = document.createElement("div");
	panel.className = "alnilam-dkma-panel";
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", labels.title);

	const title = document.createElement("p");
	title.className = "alnilam-dkma-title";
	title.textContent = labels.title;

	const description = document.createElement("p");
	description.className = "alnilam-dkma-desc";
	description.textContent = labels.description;

	const hint = document.createElement("p");
	hint.className = "alnilam-dkma-hint";
	hint.textContent = labels.allowHint;

	const close = document.createElement("button");
	close.type = "button";
	close.className = "alnilam-dkma-continue";
	close.textContent = labels.continueReading;
	close.addEventListener("click", () => {
		persistDismissal();
		mount.hidden = true;
	});

	panel.append(title, description, hint, close);
	mount.append(panel);

	document.addEventListener("keydown", (event: KeyboardEvent) => {
		if (event.key === "Escape" && !mount.hidden) {
			persistDismissal();
			mount.hidden = true;
		}
	});
}

export function initAdblockRecovery(
	mount: HTMLElement,
	dismissDays: number,
	consentGated: boolean,
): void {
	if (mount.dataset.dkmaReady === "true") return;
	mount.dataset.dkmaReady = "true";

	const permitted = (state: ConsentState) => !consentGated || state.ads === true;

	const maybeRun = () => {
		if (!permitted(getConsent())) return;
		if (navigator.onLine === false) return;
		if (dismissedWithinWindow(dismissDays)) return;
		void probeAdblock().then((blocked) => {
			if (!blocked) return;
			if (dismissedWithinWindow(dismissDays)) return;
			buildBanner(mount, readLabels(mount));
			mount.hidden = false;
		});
	};

	// Never before the main content is usable.
	if (document.readyState === "complete") {
		window.setTimeout(maybeRun, 1_500);
	} else {
		window.addEventListener("load", () => window.setTimeout(maybeRun, 1_500), {
			once: true,
		});
	}

	if (consentGated) {
		subscribeConsent((state) => {
			if (!permitted(state)) mount.hidden = true;
		});
	}
}

/**
 * Official Google ad-blocking recovery path (`mode: "google"`): inject the
 * Site-declared official tag URL exactly once per document, consent-gated.
 */
export function initGoogleRecovery(tagUrl: string, consentGated: boolean): void {
	if (document.querySelector("script[data-dkma-google]")) return;
	const inject = () => {
		if (document.querySelector("script[data-dkma-google]")) return;
		const script = document.createElement("script");
		script.async = true;
		script.src = tagUrl;
		script.dataset.dkmaGoogle = tagUrl;
		document.head.append(script);
	};
	if (!consentGated) {
		inject();
	} else {
		subscribeConsent((state) => {
			if (state.ads === true) inject();
		});
	}
}
