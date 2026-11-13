/**
 * First-party consent gate (shared contract, GH Issue #92).
 *
 * Zero third-party requests before a stored grant. Per-category choices
 * (`analytics`, `ads`) persist in `localStorage` under one versioned key.
 * Loaders (GA4, AdSense, recovery) import `isConsentGranted`/`subscribeConsent`
 * and must never inject scripts while a category is undecided or denied.
 * Revocation notifies subscribers immediately; loaders remove their flags and
 * the next navigation loads nothing for that category.
 *
 * The banner UI is rendered only when Core ships `consent.mode: "basic"` AND
 * at least one gated feature is enabled; `consent.mode: "off"` ships none of
 * this module (see Layout.astro). All state is local to this browser.
 */

export type ConsentCategory = "analytics" | "ads";

export type ConsentValue = boolean | null;

export type ConsentState = Readonly<Record<ConsentCategory, ConsentValue>>;

const STORAGE_KEY = "alnilam-consent:v1";
const CATEGORIES: readonly ConsentCategory[] = ["analytics", "ads"];

function parseStoredState(raw: string | null): Record<ConsentCategory, ConsentValue> {
	const state: Record<ConsentCategory, ConsentValue> = {
		analytics: null,
		ads: null,
	};
	if (!raw) return state;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return state;
		const record = parsed as Record<string, unknown>;
		for (const category of CATEGORIES) {
			const value = record[category];
			if (typeof value === "boolean") state[category] = value;
		}
	} catch {
		/* corrupted storage fails closed to undecided */
	}
	return state;
}

function writeStoredState(state: ConsentState): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* private-mode storage: choices stay session-local */
	}
}

function readState(): Record<ConsentCategory, ConsentValue> {
	let raw: string | null = null;
	try {
		raw = window.localStorage.getItem(STORAGE_KEY);
	} catch {
		/* storage unavailable */
	}
	return parseStoredState(raw);
}

let state: Record<ConsentCategory, ConsentValue> | null = null;
const listeners = new Set<(state: ConsentState) => void>();

function currentState(): Record<ConsentCategory, ConsentValue> {
	state ??= readState();
	return state;
}

function notify(): void {
	if (!state) return;
	const snapshot: ConsentState = { ...state };
	for (const listener of listeners) listener(snapshot);
}

/** Current per-category consent decisions; `null` means undecided (blocked). */
export function getConsent(): ConsentState {
	return { ...currentState() };
}

/** True only for an explicit stored grant. Undecided and denied are blocked. */
export function isConsentGranted(category: ConsentCategory): boolean {
	return currentState()[category] === true;
}

/** Persist one category decision (or reset with `null`) and notify subscribers immediately. */
export function setConsent(
	category: ConsentCategory,
	value: boolean | null,
): ConsentState {
	if (!CATEGORIES.includes(category)) {
		throw new Error(`ALNILAM: unknown consent category ${JSON.stringify(category)}`);
	}
	const next = currentState();
	next[category] = value;
	writeStoredState(next);
	notify();
	return { ...next };
}

/**
 * Subscribe to consent changes. Returns an unsubscribe function. The listener
 * receives the current snapshot immediately so loaders can self-synchronize.
 */
export function subscribeConsent(listener: (state: ConsentState) => void): () => void {
	listeners.add(listener);
	listener({ ...currentState() });
	return () => listeners.delete(listener);
}

interface ConsentGateLabels {
	title: string;
	description: string;
	analytics: string;
	ads: string;
	allow: string;
	deny: string;
	note: string;
}

const LABEL_KEYS: Record<ConsentCategory, keyof ConsentGateLabels> = {
	analytics: "analytics",
	ads: "ads",
};

function buildRow(category: ConsentCategory, label: string, labels: ConsentGateLabels): HTMLDivElement {
	const row = document.createElement("div");
	row.className = "alnilam-consent-row";
	row.dataset.category = category;

	const name = document.createElement("span");
	name.className = "alnilam-consent-label";
	name.textContent = label;
	row.append(name);

	const deny = document.createElement("button");
	deny.type = "button";
	deny.className = "alnilam-consent-btn";
	deny.dataset.action = "deny";
	deny.textContent = labels.deny;

	const allow = document.createElement("button");
	allow.type = "button";
	allow.className = "alnilam-consent-btn";
	allow.dataset.action = "allow";
	allow.textContent = labels.allow;

	row.append(deny, allow);
	return row;
}

function buildBanner(mount: HTMLElement, labels: ConsentGateLabels, categories: readonly ConsentCategory[]): void {
	mount.textContent = "";
	const panel = document.createElement("div");
	panel.className = "alnilam-consent-panel";
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", labels.title);

	const title = document.createElement("p");
	title.className = "alnilam-consent-title";
	title.textContent = labels.title;

	const description = document.createElement("p");
	description.className = "alnilam-consent-desc";
	description.textContent = labels.description;

	panel.append(title, description);
	for (const category of categories) {
		panel.append(buildRow(category, labels[LABEL_KEYS[category]], labels));
	}

	const note = document.createElement("p");
	note.className = "alnilam-consent-note";
	note.textContent = labels.note;
	panel.append(note);
	mount.append(panel);

	panel.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLButtonElement)) return;
		const row = target.closest<HTMLElement>(".alnilam-consent-row");
		const category = row?.dataset.category as ConsentCategory | null;
		if (!category || !CATEGORIES.includes(category)) return;
		if (target.dataset.action === "allow") setConsent(category, true);
		if (target.dataset.action === "deny") setConsent(category, false);
		syncBanner(mount, categories);
	});
}

function syncBanner(mount: HTMLElement, categories: readonly ConsentCategory[]): void {
	const undecided = categories.some((category) => currentState()[category] === null);
	mount.hidden = !undecided;
}

/**
 * Mount the first-party banner into `mount` (a Layout-rendered container).
 * The mount element carries data-label-* attributes; no labels are hardcoded
 * here so every locale ships its own copy.
 */
export function initConsentGate(mount: HTMLElement): void {
	if (mount.dataset.consentReady === "true") return;
	mount.dataset.consentReady = "true";

	const labels: ConsentGateLabels = {
		title: mount.dataset.labelTitle ?? "",
		description: mount.dataset.labelDescription ?? "",
		analytics: mount.dataset.labelAnalytics ?? "",
		ads: mount.dataset.labelAds ?? "",
		allow: mount.dataset.labelAllow ?? "",
		deny: mount.dataset.labelDeny ?? "",
		note: mount.dataset.labelNote ?? "",
	};
	const categories = (mount.dataset.categories ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter((value): value is ConsentCategory =>
			CATEGORIES.includes(value as ConsentCategory),
		);
	if (!categories.length) return;

	for (const token of ["--surface", "--on-surface", "--on-surface-variant", "--outline", "--primary"]) {
		mount.style.setProperty(token, `var(${token})`);
	}
	buildBanner(mount, labels, categories);
	syncBanner(mount, categories);

	// Reopen support for later withdrawal / change (documented public API):
	// dispatch `alnilam-consent:open` to reset decisions and re-show the banner.
	window.addEventListener("alnilam-consent:open", () => {
		for (const category of categories) setConsent(category, null);
		syncBanner(mount, categories);
	});
}

export const CONSENT_STORAGE_KEY = STORAGE_KEY;
