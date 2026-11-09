/**
 * FancyboxHandler — public API façade over PhotoSwipe 5.4.4.
 * Filenames/exports stay Fancybox* so Shirone callers need no signature edits.
 */

import PhotoSwipeLightbox from "photoswipe/lightbox";
import type PhotoSwipe from "photoswipe";
import type { DataSource, SlideData } from "photoswipe";
import { FANCYBOX_SELECTORS } from "./fancybox-config";
import pswpCss from "photoswipe/style.css?url";
import skinCss from "../styles/fancybox-custom.css?url";


const LIGHTBOX_DEFAULTS = {
	bgOpacity: 0.88,
	showHideAnimationType: "fade" as const,
	padding: { top: 20, bottom: 40, left: 20, right: 20 },
};
type GalleryItem = { src: string; caption?: string };

type ResolvedSlide = {
	src: string;
	msrc?: string;
	width?: number;
	height?: number;
	alt?: string;
	caption?: string;
	element?: HTMLElement;
	pendingSize?: boolean;
};

type Dim = { width: number; height: number };

type SlideExtras = SlideData & {
	pendingSize?: boolean;
	degraded?: boolean;
	caption?: string;
	failSrc?: string;
};

const STYLE_ATTR = "data-alnilam-lightbox-css";
const PROBE_TIMEOUT_MS = 8_000;
const PLACEHOLDER_SIZE = 1;

function isSitePath(raw: string): boolean {
	if (!raw) return false;
	if (raw.startsWith("//")) return false;
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return false;
	return raw.startsWith("/") || !raw.includes("://");
}

function resolveProtocolRelative(raw: string): string {
	if (!raw.startsWith("//")) return raw;
	return `https:${raw}`;
}

function isSafeImageUrl(raw: string): boolean {
	if (!raw || typeof raw !== "string") return false;
	const trimmed = raw.trim();
	if (!trimmed) return false;
	if (trimmed.startsWith("//")) {
		try {
			const u = new URL(`https:${trimmed}`);
			return u.protocol === "https:";
		} catch {
			return false;
		}
	}
	if (isSitePath(trimmed)) return true;
	try {
		const u = new URL(trimmed);
		if (u.protocol === "https:") return true;
		// Same-origin http is a local preview of a site path, not an external bed.
		if (
			u.protocol === "http:" &&
			typeof location !== "undefined" &&
			u.origin === location.origin
		) {
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

function applySiteBase(raw: string): string {
	const base = import.meta.env?.BASE_URL ?? "/";
	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
	if (
		normalizedBase !== "/" &&
		(normalizedPath === base || normalizedPath.startsWith(normalizedBase))
	) {
		return normalizedPath;
	}
	const baseParts = normalizedBase.split("/").filter(Boolean);
	const pathParts = normalizedPath.split("/").filter(Boolean);
	return `/${[...baseParts, ...pathParts].join("/")}`;
}

function canonicalizeSrc(raw: string): string | null {
	if (!isSafeImageUrl(raw)) return null;
	if (raw.startsWith("//")) return resolveProtocolRelative(raw);
	if (isSitePath(raw)) return applySiteBase(raw);
	try {
		const u = new URL(raw);
		if (
			u.protocol === "http:" &&
			typeof location !== "undefined" &&
			u.origin === location.origin
		) {
			return applySiteBase(`${u.pathname}${u.search}${u.hash}`);
		}
	} catch {
		/* keep raw */
	}
	return raw;
}

function parsePositiveInt(value: string | null): number | null {
	if (value == null || value === "") return null;
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}

function isPluginManagedLocalHref(link: HTMLAnchorElement): boolean {
	if (!link.classList.contains("image-grid__link")) return false;
	if (!link.closest(".image-grid")) return false;
	if (link.hasAttribute("data-pswp-src") || link.hasAttribute("data-full-src"))
		return false;
	const href = link.getAttribute("href") ?? "";
	return isSitePath(href);
}

function looksLikePageHref(href: string): boolean {
	if (!href) return true;
	if (href.startsWith("#")) return true;
	if (href.startsWith("../") || href.startsWith("./")) return true;
	if (href.endsWith("/")) return true;
	if (href.includes("/posts/")) return true;
	return /\.(?:html?|md|pdf|zip|json)(?:[?#]|$)/i.test(href);
}

function looksLikeImageHref(href: string): boolean {
	if (!href || looksLikePageHref(href)) return false;
	if (/\.(?:avif|bmp|gif|jpe?g|png|svg|webp|heic|heif)(?:[?#]|$)/i.test(href))
		return true;
	// HTTPS / protocol-relative beds often omit extensions (signed URLs).
	return href.startsWith("https:") || href.startsWith("//");
}

function captionFromElement(el: HTMLElement, img: HTMLImageElement | null): string {
	const dataCaption =
		el.getAttribute("data-caption") ??
		img?.getAttribute("data-caption") ??
		"";
	if (dataCaption.trim()) return dataCaption.trim();
	const figure = el.closest("figure");
	const fig = figure?.querySelector("figcaption")?.textContent?.trim() ?? "";
	if (fig) return fig;
	return (img?.alt ?? "").trim();
}

function dimensionsFromImg(
	img: HTMLImageElement,
	lightboxSrc: string,
): Dim | null {
	const attrW =
		parsePositiveInt(img.getAttribute("data-pswp-width")) ??
		parsePositiveInt(img.getAttribute("width"));
	const attrH =
		parsePositiveInt(img.getAttribute("data-pswp-height")) ??
		parsePositiveInt(img.getAttribute("height"));
	if (attrW && attrH) {
		const sameResource =
			lightboxSrc === (img.currentSrc || img.src) ||
			lightboxSrc === img.getAttribute("src");
		if (sameResource || img.hasAttribute("data-pswp-width")) {
			return { width: attrW, height: attrH };
		}
	}
	if (
		img.complete &&
		img.naturalWidth > 0 &&
		(lightboxSrc === img.currentSrc || lightboxSrc === img.src)
	) {
		return { width: img.naturalWidth, height: img.naturalHeight };
	}
	return null;
}

function resolveSlideFromTrigger(el: HTMLElement): ResolvedSlide | null {
	const img =
		el instanceof HTMLImageElement
			? el
			: (el.querySelector("img") ??
				(el.closest("a")?.querySelector("img") ?? null));

	const attrSrc = img?.getAttribute("src") ?? "";
	const liveSrc = img ? img.currentSrc || img.src || "" : "";
	// Prefer authored // or site-path attrs over absolute currentSrc from http preview.
	const display = attrSrc.startsWith("//") || isSitePath(attrSrc)
		? attrSrc
		: liveSrc || attrSrc;
	let original: string | null = null;

	const explicit =
		el.getAttribute("data-pswp-src") ||
		el.getAttribute("data-full-src") ||
		img?.getAttribute("data-pswp-src") ||
		img?.getAttribute("data-full-src") ||
		"";
	if (explicit) original = explicit;

	if (!original) {
		const anchor =
			el instanceof HTMLAnchorElement ? el : el.closest("a");
		if (anchor instanceof HTMLAnchorElement) {
			const href = anchor.getAttribute("href") ?? "";
			if (
				href &&
				isSafeImageUrl(href) &&
				looksLikeImageHref(href) &&
				(href.startsWith("https:") ||
					href.startsWith("//") ||
					(Boolean(display) &&
						href !== display &&
						href !== img?.getAttribute("src")))
			) {
				original = href;
			} else if (isPluginManagedLocalHref(anchor) && display) {
				original = display;
			}
		}
	}

	if (!original && img) {
		const dataSrc = img.getAttribute("data-src") ?? "";
		if (dataSrc && isSafeImageUrl(dataSrc) && dataSrc !== display && dataSrc !== attrSrc) {
			original = dataSrc;
		}
	}

	if (!original) original = display || attrSrc || "";
	// Upgrade accidental http absolute from protocol-relative authoring on http pages.
	if (
		original.startsWith("http://") &&
		(attrSrc.startsWith("//") || explicit.startsWith("//"))
	) {
		original = `https://${original.slice("http://".length)}`;
	}

	const src = canonicalizeSrc(original);
	if (!src) return null;

	const dims = img ? dimensionsFromImg(img, src) : null;
	const caption = captionFromElement(el, img);

	return {
		src,
		...(dims ? { width: dims.width, height: dims.height } : {}),
		...(img?.alt ? { alt: img.alt } : {}),
		...(caption ? { caption } : {}),
		element: el,
		pendingSize: !(dims?.width && dims?.height),
	};
}

function toSlideData(slide: ResolvedSlide): SlideExtras {
	const data: SlideExtras = {
		src: slide.src,
		width: slide.width ?? PLACEHOLDER_SIZE,
		height: slide.height ?? PLACEHOLDER_SIZE,
	};
	if (slide.msrc) data.msrc = slide.msrc;
	if (slide.alt) data.alt = slide.alt;
	if (slide.element) data.element = slide.element;
	if (slide.caption) data.caption = slide.caption;
	if (slide.pendingSize || !slide.width || !slide.height) {
		data.pendingSize = true;
	}
	return data;
}

function buildDegradedHtml(originalSrc: string): string {
	const wrap = document.createElement("div");
	wrap.className = "pswp__error-msg-container";
	wrap.style.cssText =
		"display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:2rem;color:#fff;min-height:40vh;text-align:center;";
	const msg = document.createElement("p");
	msg.textContent = "Image unavailable";
	const link = document.createElement("a");
	link.className = "pswp__original-link";
	link.href = originalSrc;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	link.textContent = "Open original";
	wrap.append(msg, link);
	return wrap.outerHTML;
}

export class FancyboxHandler {
	private generation = 0;
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private bound = false;
	private openPswp: PhotoSwipe | null = null;
	private lightbox: PhotoSwipeLightbox | null = null;
	private styleLinks: HTMLLinkElement[] = [];
	private stylesLoaded = false;
	private stylesPromise: Promise<void> | null = null;
	private probeCache = new Map<string, Promise<Dim | null>>();
	private lastTrigger: HTMLElement | null = null;
	private readonly onClick = (event: MouseEvent) => this.handleActivate(event);
	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		this.handleActivate(event);
	};

	async init(): Promise<void> {
		if (!this.checkForImages()) return;
		this.initPromise ??= this.doInit().catch((error) => {
			this.initPromise = null;
			throw error;
		});
		await this.initPromise;
	}

	private async doInit(): Promise<void> {
		const gen = this.generation;
		await this.ensureStylesheets();
		if (gen !== this.generation) return;
		if (this.bound) return;
		this.syncPluginManagedGridLinks();
		this.bindDelegates();
		this.initialized = true;
		document.documentElement.dataset.fancyboxReady = "true";
	}

	private checkForImages(): boolean {
		return (
			document.querySelector(FANCYBOX_SELECTORS.articleImages) !== null ||
			document.querySelector(FANCYBOX_SELECTORS.imageGrids) !== null ||
			document.querySelector(FANCYBOX_SELECTORS.singleFancybox) !== null
		);
	}

	private syncPluginManagedGridLinks(): void {
		for (const link of document.querySelectorAll<HTMLAnchorElement>(
			".image-grid__link",
		)) {
			if (!isPluginManagedLocalHref(link)) continue;
			const img = link.querySelector("img");
			const target = img?.currentSrc || img?.src;
			if (target) link.href = target;
		}
	}

	private bindDelegates(): void {
		document.addEventListener("click", this.onClick);
		document.addEventListener("keydown", this.onKeyDown);
		this.bound = true;
	}

	private unbindDelegates(): void {
		document.removeEventListener("click", this.onClick);
		document.removeEventListener("keydown", this.onKeyDown);
		this.bound = false;
	}

	private resolveTrigger(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof Element)) return null;

		const articleImg = target.closest(FANCYBOX_SELECTORS.articleImages);
		if (articleImg instanceof HTMLImageElement) {
			const wrappingLink = articleImg.closest("a");
			if (wrappingLink instanceof HTMLAnchorElement) {
				const marked =
					wrappingLink.hasAttribute("data-fancybox") ||
					wrappingLink.hasAttribute("data-pswp-src") ||
					wrappingLink.classList.contains("image-grid__link") ||
					Boolean(wrappingLink.closest(".image-grid"));
				if (!marked) return null;
			}
			return articleImg;
		}

		const gridControl = target.closest(FANCYBOX_SELECTORS.imageGrids);
		if (gridControl instanceof HTMLElement) return gridControl;

		const single = target.closest(FANCYBOX_SELECTORS.singleFancybox);
		if (single instanceof HTMLElement) return single;

		const anchor = target.closest("a");
		if (anchor instanceof HTMLAnchorElement) {
			const marked =
				anchor.hasAttribute("data-fancybox") ||
				anchor.hasAttribute("data-pswp-src") ||
				anchor.classList.contains("image-grid__link") ||
				Boolean(anchor.closest(".image-grid"));
			if (!marked) return null;
			const img = anchor.querySelector("img");
			if (!img) return null;
			const meaningful = [...anchor.childNodes].filter((n) => {
				if (n.nodeType === Node.TEXT_NODE)
					return Boolean(n.textContent?.trim());
				if (n.nodeType === Node.ELEMENT_NODE) {
					const el = n as Element;
					if (el === img || el.contains(img)) return false;
					return true;
				}
				return false;
			});
			if (meaningful.length === 0) return anchor;
		}
		return null;
	}

	private handleActivate(event: Event): void {
		if (event.defaultPrevented) return;
		if (event instanceof MouseEvent) {
			if (event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
				return;
		}
		const trigger = this.resolveTrigger(event.target);
		if (!trigger) return;
		event.preventDefault();
		if (event instanceof KeyboardEvent) event.stopPropagation();
		this.lastTrigger = trigger;
		void this.openFromTrigger(trigger);
	}

	private collectGroup(trigger: HTMLElement): {
		items: ResolvedSlide[];
		index: number;
	} {
		if (trigger.matches(FANCYBOX_SELECTORS.articleImages)) {
			const nodes = [
				...document.querySelectorAll<HTMLElement>(
					FANCYBOX_SELECTORS.articleImages,
				),
			];
			const items = nodes
				.map((el) => resolveSlideFromTrigger(el))
				.filter((s): s is ResolvedSlide => s !== null);
			const found = items.findIndex((s) => s.element === trigger);
			return { items, index: found < 0 ? 0 : found };
		}

		const groupId =
			trigger.getAttribute("data-fancybox") ||
			trigger.closest("[data-fancybox]")?.getAttribute("data-fancybox") ||
			"";
		if (groupId) {
			const nodes = [
				...document.querySelectorAll<HTMLElement>(
					`[data-fancybox="${CSS.escape(groupId)}"]`,
				),
			];
			const items = nodes
				.map((el) => resolveSlideFromTrigger(el))
				.filter((s): s is ResolvedSlide => s !== null);
			const groupEl = trigger.closest("[data-fancybox]");
			const found = items.findIndex(
				(s) => s.element === trigger || s.element === groupEl,
			);
			return { items, index: found < 0 ? 0 : found };
		}

		const single = resolveSlideFromTrigger(trigger);
		return { items: single ? [single] : [], index: 0 };
	}

	private async openFromTrigger(trigger: HTMLElement): Promise<void> {
		const gen = this.generation;
		const { items, index } = this.collectGroup(trigger);
		if (!items.length) return;
		await this.openDataSource(items.map(toSlideData), index, gen);
	}

	async showGallery(
		items: GalleryItem[],
		startIndex = 0,
	): Promise<void> {
		const gen = this.generation;
		await this.ensureStylesheets();
		if (gen !== this.generation) return;

		const requested = items[startIndex];
		const filtered: ResolvedSlide[] = [];
		for (const item of items) {
			const src = canonicalizeSrc(item.src);
			if (!src) continue;
			filtered.push({
				src,
				...(item.caption ? { caption: item.caption } : {}),
				pendingSize: true,
			});
		}
		if (!filtered.length) return;

		let index = 0;
		if (requested) {
			const wanted = canonicalizeSrc(requested.src);
			const match = filtered.findIndex((s) => s.src === wanted);
			index = match >= 0 ? match : 0;
		}
		await this.openDataSource(filtered.map(toSlideData), index, gen);
	}

	private async ensureStylesheets(): Promise<void> {
		if (this.stylesLoaded || typeof document === "undefined")
			return Promise.resolve();
		this.stylesPromise ??= (async () => {
			for (const href of [pswpCss, skinCss]) {
				const existing = [
					...document.head.querySelectorAll<HTMLLinkElement>(
						`link[${STYLE_ATTR}]`,
					),
				].find((link) => link.getAttribute("href") === href);
				if (existing) {
					if (!this.styleLinks.includes(existing))
						this.styleLinks.push(existing);
					continue;
				}
				const { promise, resolve, reject } = Promise.withResolvers<void>();
				const link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = href;
				link.setAttribute(STYLE_ATTR, "");
				link.onload = () => resolve();
				link.onerror = () => {
					link.remove();
					reject(new Error(`Lightbox stylesheet failed: ${href}`));
				};
				document.head.append(link);
				this.styleLinks.push(link);
				await promise;
			}
			this.stylesLoaded = true;
		})().catch((error) => {
			this.stylesPromise = null;
			throw error;
		});
		return this.stylesPromise;
	}

	private async openDataSource(
		dataSource: SlideExtras[],
		index: number,
		gen: number,
	): Promise<void> {
		if (!dataSource.length) return;
		await this.ensureStylesheets();
		if (gen !== this.generation) return;

		this.closeOpenInstance();

		const lightbox = new PhotoSwipeLightbox({
			dataSource: dataSource as DataSource,
			index,
			bgOpacity: LIGHTBOX_DEFAULTS.bgOpacity,
			showHideAnimationType: LIGHTBOX_DEFAULTS.showHideAnimationType,
			padding: LIGHTBOX_DEFAULTS.padding,
			pswpModule: () => import("photoswipe"),
		});
		this.lightbox = lightbox;

		lightbox.on("uiRegister", () => {
			const pswp = lightbox.pswp;
			if (!pswp?.ui) return;
			pswp.ui.registerElement({
				name: "custom-caption",
				order: 9,
				isButton: false,
				appendTo: "root",
				onInit: (el) => {
					const update = () => {
						const slide = pswp.currSlide?.data as SlideExtras | null;
						const caption =
							(typeof slide?.caption === "string" && slide.caption) ||
							slide?.alt ||
							"";
						el.textContent = caption;
						el.hidden = !caption;
					};
					pswp.on("change", update);
					update();
				},
			});
		});

		lightbox.on("beforeOpen", () => {
			this.openPswp = lightbox.pswp ?? null;
		});

		lightbox.on("change", () => {
			if (gen !== this.generation) return;
			void this.probeAround(lightbox.pswp, gen);
		});

		lightbox.on("destroy", () => {
			if (this.lightbox === lightbox) this.lightbox = null;
			if (this.openPswp === lightbox.pswp) this.openPswp = null;
			this.restoreFocus();
		});

		lightbox.init();
		const opened = lightbox.loadAndOpen(index, dataSource as DataSource);
		if (!opened) {
			lightbox.destroy();
			return;
		}
		if (gen !== this.generation) {
			lightbox.destroy();
			return;
		}
		void this.probeAround(lightbox.pswp, gen);
	}

	private async probeAround(
		pswp: PhotoSwipe | null | undefined,
		gen: number,
	): Promise<void> {
		if (!pswp || gen !== this.generation) return;
		const curr = pswp.currIndex;
		const order = [curr, curr + 1, curr - 1].filter(
			(i) => i >= 0 && i < pswp.getNumItems(),
		);
		await Promise.all(order.map((i) => this.probeSlide(pswp, i, gen)));
	}

	private async probeSlide(
		pswp: PhotoSwipe,
		index: number,
		gen: number,
	): Promise<void> {
		const data = pswp.getItemData(index) as SlideExtras;
		if (!data) return;
		if (data.degraded) return;
		const src = typeof data.src === "string" ? data.src : "";
		if (!src) return;
		if (!data.pendingSize && data.width && data.height && data.width > 1)
			return;

		const dim = await this.probeDimensions(src, gen);
		if (gen !== this.generation) return;

		if (dim) {
			data.width = dim.width;
			data.height = dim.height;
			delete data.pendingSize;
			pswp.refreshSlideContent(index);
			const slide = pswp.currSlide;
			if (slide && slide.index === index) slide.updateContentSize(true);
			return;
		}

		data.degraded = true;
		data.failSrc = src;
		delete data.pendingSize;
		delete data.src;
		delete data.msrc;
		data.type = "html";
		data.html = buildDegradedHtml(src);
		data.width = 800;
		data.height = 600;
		pswp.refreshSlideContent(index);
	}

	private async probeDimensions(
		src: string,
		gen: number,
	): Promise<Dim | null> {
		const existing = this.probeCache.get(src);
		if (existing) return existing;

		const { promise, resolve } = Promise.withResolvers<Dim | null>();
		const img = new Image();
		img.decoding = "async";
		let settled = false;
		const finish = (value: Dim | null) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			img.onload = null;
			img.onerror = null;
			resolve(value);
		};
		const timer = window.setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
		img.onload = () => {
			if (gen !== this.generation) {
				finish(null);
				return;
			}
			if (img.naturalWidth > 0 && img.naturalHeight > 0) {
				finish({ width: img.naturalWidth, height: img.naturalHeight });
			} else finish(null);
		};
		img.onerror = () => finish(null);
		img.src = src;

		this.probeCache.set(src, promise);
		return promise;
	}

	private closeOpenInstance(): void {
		try {
			this.openPswp?.close();
		} catch {
			/* already closing */
		}
		try {
			this.lightbox?.destroy();
		} catch {
			/* already destroyed */
		}
		this.openPswp = null;
		this.lightbox = null;
	}

	private restoreFocus(): void {
		const trigger = this.lastTrigger;
		if (trigger && document.contains(trigger)) {
			try {
				trigger.focus({ preventScroll: true });
			} catch {
				/* non-focusable */
			}
		}
	}

	cleanup(): void {
		this.generation += 1;
		this.closeOpenInstance();
		this.unbindDelegates();
		this.probeCache.clear();
		this.initPromise = null;
		this.initialized = false;
		delete document.documentElement.dataset.fancyboxReady;
	}

	destroy(): void {
		this.cleanup();
		for (const link of this.styleLinks) link.remove();
		this.styleLinks = [];
		this.stylesLoaded = false;
		this.stylesPromise = null;
		this.lastTrigger = null;
	}

	isInitialized(): boolean {
		return this.initialized;
	}
}

let globalFancyboxHandler: FancyboxHandler | null = null;

export function getFancyboxHandler(): FancyboxHandler {
	if (!globalFancyboxHandler) {
		globalFancyboxHandler = new FancyboxHandler();
	}
	return globalFancyboxHandler;
}

export async function initFancybox(): Promise<void> {
	await getFancyboxHandler().init();
}

export function cleanupFancybox(): void {
	getFancyboxHandler().cleanup();
}

export async function openFancyboxGallery(
	items: { src: string; caption?: string }[],
	startIndex = 0,
): Promise<void> {
	await getFancyboxHandler().showGallery(items, startIndex);
}
