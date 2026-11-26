/**
 * Lightbox selector module.
 * Public filenames stay Fancybox* for Shirone fork stability; runtime is PhotoSwipe.
 */

export const FANCYBOX_SELECTORS = {
	// 文章正文图片和封面图（排除画廊内图片，避免被整篇轮播组重复捕获）
	articleImages: ".custom-md img:not(.image-grid img), #post-cover img",

	// 画廊网格内带独立分组 ID 的链接（按 data-fancybox 值分组轮播）
	imageGrids: ".image-grid [data-fancybox]",

	// 带 data-fancybox 属性的其他元素（排除画廊链接，防止双绑）
	singleFancybox: "[data-fancybox]:not(.image-grid [data-fancybox])",
} as const;

export function isSitePath(raw: string): boolean {
	if (!raw) return false;
	if (raw.startsWith("//")) return false;
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return false;
	return raw.startsWith("/") || !raw.includes("://");
}

export function isSafeImageUrl(raw: string): boolean {
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

function looksLikePageHref(href: string): boolean {
	if (!href) return true;
	if (href.startsWith("#")) return true;
	if (href.startsWith("../") || href.startsWith("./")) return true;
	if (href.endsWith("/")) return true;
	if (href.includes("/posts/")) return true;
	return /\.(?:html?|md|pdf|zip|json)(?:[?#]|$)/i.test(href);
}

export function looksLikeImageHref(href: string): boolean {
	if (!href || looksLikePageHref(href)) return false;
	if (/\.(?:avif|bmp|gif|jpe?g|png|svg|webp|heic|heif)(?:[?#]|$)/i.test(href))
		return true;
	// HTTPS / protocol-relative beds often omit extensions (signed URLs).
	return href.startsWith("https:") || href.startsWith("//");
}

export function isMarkedLightboxAnchor(anchor: HTMLAnchorElement): boolean {
	return (
		anchor.hasAttribute("data-fancybox") ||
		anchor.hasAttribute("data-pswp-src") ||
		anchor.classList.contains("image-grid__link") ||
		Boolean(anchor.closest(".image-grid"))
	);
}

function isImageOnlyAnchor(anchor: HTMLAnchorElement): boolean {
	const img = anchor.querySelector("img");
	if (!img) return false;
	return ![...anchor.childNodes].some((n) => {
		if (n.nodeType === Node.TEXT_NODE) return Boolean(n.textContent?.trim());
		if (n.nodeType === Node.ELEMENT_NODE) {
			const el = n as Element;
			if (el === img || el.contains(img)) return false;
			return true;
		}
		return false;
	});
}

export function isAuthorImageOriginalLink(anchor: HTMLAnchorElement): boolean {
	if (!isImageOnlyAnchor(anchor)) return false;
	const href = anchor.getAttribute("href") ?? "";
	return isSafeImageUrl(href) && looksLikeImageHref(href);
}

/**
 * Article images open the lightbox only when bare, wrapped in a marked
 * lightbox/grid anchor, or inside an author image-original link; any other
 * wrapping anchor keeps its ordinary navigation semantics.
 */
export function isLightboxEligibleArticleImage(el: HTMLElement): boolean {
	const wrappingLink = el.closest("a");
	if (!(wrappingLink instanceof HTMLAnchorElement)) return true;
	return (
		isMarkedLightboxAnchor(wrappingLink) ||
		isAuthorImageOriginalLink(wrappingLink)
	);
}
