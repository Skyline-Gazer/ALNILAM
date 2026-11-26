import {
	FANCYBOX_SELECTORS,
	isLightboxEligibleArticleImage,
} from "./fancybox-config";

const RUNTIME_BOUND_KEY = "fancyboxRuntimeBound";

let cleanupFancybox: (() => void) | undefined;
let earlyHandler: ((event: MouseEvent) => void) | null = null;
let pendingTrigger: HTMLElement | null = null;

function hasMatch(root: ParentNode, selector: string): boolean {
	if (root instanceof Element && root.matches(selector)) return true;
	return root.querySelector(selector) !== null;
}

function hasFancyboxTarget(root: ParentNode): boolean {
	return Object.values(FANCYBOX_SELECTORS).some((selector) =>
		hasMatch(root, selector),
	);
}

function installEarlyCapture(): void {
	if (earlyHandler) return;
	const selector = Object.values(FANCYBOX_SELECTORS).join(",");
	earlyHandler = (event: MouseEvent) => {
		if (event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const target = event.target;
		if (!(target instanceof Element)) return;
		const trigger = target.closest(selector);
		if (!(trigger instanceof HTMLElement)) return;
		// 不可开启的图片（如普通文本链接内的配图）不拦截，保持链接默认导航。
		if (
			trigger.matches(FANCYBOX_SELECTORS.articleImages) &&
			!isLightboxEligibleArticleImage(trigger)
		) {
			return;
		}
		event.preventDefault();
		pendingTrigger = trigger;
	};
	document.addEventListener("click", earlyHandler, true);
}

function discardEarlyCapture(): void {
	if (earlyHandler) document.removeEventListener("click", earlyHandler, true);
	earlyHandler = null;
	pendingTrigger = null;
}

function flushEarlyCapture(): void {
	if (!earlyHandler) return;
	document.removeEventListener("click", earlyHandler, true);
	earlyHandler = null;
	const trigger = pendingTrigger;
	pendingTrigger = null;
	if (trigger?.isConnected) trigger.click();
}

/**
 * Loads Fancybox only when the supplied page fragment has a lightbox target.
 * The images remain normal links when the optional enhancement cannot load.
 */
export async function initFancyboxRuntime(
	root: ParentNode = document,
): Promise<void> {
	if (typeof document === "undefined" || !hasFancyboxTarget(root)) return;

	installEarlyCapture();
	try {
		const runtime = await import("./fancybox-handler");
		cleanupFancybox = runtime.cleanupFancybox;
		await runtime.initFancybox();
	} catch (error) {
		console.error("Failed to initialize Fancybox runtime", error);
	} finally {
		flushEarlyCapture();
	}
}

function bindSwupCleanup(): void {
	const bind = () => {
		if (!window.swup?.hooks) return;
		window.swup.hooks.on("visit:start", () => {
			discardEarlyCapture();
			cleanupFancybox?.();
		});
	};

	if (window.swup?.hooks) bind();
	else document.addEventListener("swup:enable", bind, { once: true });
}

/**
 * Installs the persistent-shell lifecycle for article covers, Markdown images,
 * and image grids. New encrypted content must call initFancyboxRuntime itself.
 */
export function bindFancyboxRuntime(): void {
	if (typeof document === "undefined") return;
	if (document.documentElement.dataset[RUNTIME_BOUND_KEY] === "true") return;
	document.documentElement.dataset[RUNTIME_BOUND_KEY] = "true";

	void initFancyboxRuntime();
	bindSwupCleanup();
	document.addEventListener("swup:content:replace", () => {
		queueMicrotask(() => {
			const container = document.getElementById("swup-container");
			void initFancyboxRuntime(container ?? document);
		});
	});
}
