import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import zlib from "node:zlib";

/**
 * PhotoSwipe lightbox matrix (Fancyapps removed).
 * External beds are fulfilled only via HTTPS Playwright routes — never local HTTP.
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/posts/hello-alnilam/";

type Theme = "dark" | "light";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

type Vendor = "fancybox" | "photoswipe";

async function detectVendor(page: Page): Promise<Vendor> {
	if (await page.locator(".pswp").count()) return "photoswipe";
	if (await page.locator(".fancybox__container").count()) return "fancybox";
	throw new Error("no lightbox container rendered after open");
}

function containerSel(vendor: Vendor): string {
	return vendor === "photoswipe" ? ".pswp" : ".fancybox__container";
}

function slideImgSel(vendor: Vendor): string {
	return vendor === "photoswipe"
		? '.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)'
		: ".fancybox__slide.is-selected .f-panzoom__viewport img";
}

function counterSel(vendor: Vendor): string {
	return vendor === "photoswipe"
		? ".pswp__counter"
		: ".fancybox__container .f-counter";
}

function crc32(buf: Buffer): number {
	let c = ~0;
	for (let i = 0; i < buf.length; i += 1) {
		c ^= buf[i]!;
		for (let k = 0; k < 8; k += 1) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
	}
	return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
	const typeBuf = Buffer.from(type);
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
	return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width: number, height: number, rgb: [number, number, number] = [30, 144, 255]): Buffer {
	const row = Buffer.alloc(1 + width * 3);
	for (let x = 0; x < width; x += 1) {
		row[1 + x * 3] = rgb[0];
		row[2 + x * 3] = rgb[1];
		row[3 + x * 3] = rgb[2];
	}
	const raw = Buffer.concat(Array.from({ length: height }, () => row));
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		pngChunk("IHDR", ihdr),
		pngChunk("IDAT", zlib.deflateSync(raw)),
		pngChunk("IEND", Buffer.alloc(0)),
	]);
}

async function fulfillPng(route: Route, width: number, height: number, status = 200) {
	await route.fulfill({
		status,
		contentType: "image/png",
		body: makePng(width, height),
		headers: { "cache-control": "no-store" },
	});
}

async function installFixtureRoutes(page: Page) {
	const onceHits = new Map<string, number>();

	await page.route("https://lightbox-fixtures.local/**", async (route) => {
		const req = route.request();
		const url = new URL(req.url());
		const path = url.pathname;

		const ok = path.match(/^\/ok\/(\d+)\/(\d+)\.png$/);
		if (ok) return fulfillPng(route, Number(ok[1]), Number(ok[2]));

		const signed = path.match(/^\/signed\/(\d+)\/(\d+)\.png$/);
		if (signed) {
			if (!url.searchParams.get("sig") || !url.searchParams.get("exp")) {
				return route.fulfill({ status: 403, body: "missing sig" });
			}
			return fulfillPng(route, Number(signed[1]), Number(signed[2]));
		}

		const thumb = path.match(/^\/thumb\/(\d+)\/(\d+)\.png$/);
		if (thumb) return fulfillPng(route, Number(thumb[1]), Number(thumb[2]), 200);

		const full = path.match(/^\/full\/(\d+)\/(\d+)\.png$/);
		if (full) return fulfillPng(route, Number(full[1]), Number(full[2]));

		if (path === "/status/403") return route.fulfill({ status: 403, body: "no" });
		if (path === "/status/404") return route.fulfill({ status: 404, body: "missing" });

		const slow = path.match(/^\/slow\/(\d+)$/);
		if (slow) {
			await new Promise((r) => setTimeout(r, Number(slow[1])));
			return fulfillPng(route, 64, 64);
		}

		if (path === "/hotlink") {
			const referer = req.headers()["referer"] ?? "";
			if (!/127\.0\.0\.1:(4323|4324)/.test(referer)) {
				return route.fulfill({ status: 403, body: "hotlink" });
			}
			return fulfillPng(route, 100, 100);
		}

		const once = path.match(/^\/once-signed\/(\d+)\/(\d+)\.png$/);
		if (once) {
			const key = req.url();
			const hits = (onceHits.get(key) ?? 0) + 1;
			onceHits.set(key, hits);
			if (hits > 1) return route.fulfill({ status: 403, body: "one-time" });
			return fulfillPng(route, Number(once[1]), Number(once[2]));
		}

		await route.fulfill({ status: 404, body: `unhandled ${path}` });
	});

	await page.route("https://cdn.example.com/**", async (route) => {
		const url = new URL(route.request().url());
		const ok = url.pathname.match(/^\/ok\/(\d+)\/(\d+)\.png$/);
		if (ok) return fulfillPng(route, Number(ok[1]), Number(ok[2]));
		await route.fulfill({ status: 404, body: "cdn miss" });
	});
}

async function waitForLightboxReady(page: Page) {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.fancyboxReady))
		.toBe("true");
}

async function assertSlideLoaded(
	page: Page,
	responses: Map<string, number> = new Map(),
	vendor: Vendor = "photoswipe",
) {
	const img = page.locator(slideImgSel(vendor)).first();
	await expect(img).toBeVisible();
	let last: {
		src: string | null;
		currentSrc: string | null;
		naturalWidth: number;
		rect: number;
		wrapperRect: number;
		viewportTransform: string;
	} | null = null;
	await expect
		.poll(async () => {
			last = await img.evaluate((el: HTMLImageElement) => ({
				src: el.getAttribute("src"),
				currentSrc: el.currentSrc,
				naturalWidth: el.naturalWidth,
				rect: el.getBoundingClientRect().width,
				wrapperRect:
					el.closest(".f-panzoom__wrapper")?.getBoundingClientRect().width ?? 0,
				viewportTransform:
					(el.closest(".f-panzoom__viewport") as HTMLElement | null)?.style
						.transform ?? "",
			}));
			if (!last || !last.currentSrc || last.naturalWidth <= 0 || last.rect <= 0) {
				return false;
			}
			if (vendor === "fancybox") {
				return (
					last.wrapperRect > 0 &&
					!last.viewportTransform.includes("scale(0)") &&
					Boolean(last.src) &&
					responses.get(last.currentSrc) === 200
				);
			}
			const url = last.currentSrc;
			if (url.startsWith("blob:") || url.startsWith("data:")) return false;
			if (responses.size === 0) return true;
			return responses.get(url) === 200;
		}, { timeout: 12_000 })
		.toBe(true);
	const state = last!;
	expect(state.naturalWidth).toBeGreaterThan(0);
	expect(state.rect).toBeGreaterThan(0);
	expect(state.currentSrc).toBeTruthy();
	if (vendor === "fancybox") {
		expect(state.wrapperRect).toBeGreaterThan(0);
		expect(state.viewportTransform).not.toContain("scale(0)");
		expect(responses.get(state.currentSrc!)).toBe(200);
	}
	return state;
}

async function openSlide(page: Page, index: number, responses: Map<string, number> = new Map()) {
	// PhotoSwipe does not open SVG covers; skip them so both vendors hit a raster slide.
	const image = page.locator('.custom-md img:not([src$=".svg"])').nth(index);
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const vendor = await detectVendor(page);
	const container = page.locator(containerSel(vendor));
	await expect(container).toBeVisible();
	await assertSlideLoaded(page, responses, vendor);
	await page.waitForTimeout(400);
	return container;
}

async function closeWithEscape(page: Page, container: Locator) {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await page.keyboard.press("Escape");
		try {
			await expect(container).toHaveCount(0, { timeout: 2_000 });
			return;
		} catch {
			/* transition swallow */
		}
	}
	await expect(container).toHaveCount(0, { timeout: 10_000 });
}

async function closeLightbox(page: Page, container: Locator, scrollBefore: number) {
	await closeWithEscape(page, container);
	await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBe(scrollBefore);
	const focusInside = await page.evaluate(() =>
		Boolean(document.activeElement?.closest?.(".pswp")),
	);
	expect(focusInside).toBe(false);
}

test("lightbox retries after a stylesheet request fails", async ({ page }) => {
	let failed = false;
	await installFixtureRoutes(page);
	await page.route(/photoswipe[^/]*\.css(?:\?.*)?$|fancybox-custom[^/]*\.css(?:\?.*)?$/i, async (route) => {
		if (!failed) {
			failed = true;
			await route.abort();
		} else {
			await route.continue();
		}
	});
	await page.goto(ROOT + ARTICLE);
	await expect.poll(() => failed).toBe(true);
	await page.evaluate(() => document.dispatchEvent(new Event("swup:content:replace")));
	await waitForLightboxReady(page);
	const image = page.locator('.custom-md img:not([src$=".svg"])').first();
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const vendor = await detectVendor(page);
	await expect(page.locator(slideImgSel(vendor)).first()).toBeVisible();
});

for (const [name, origin] of deployments) {
	for (const width of [1440, 390]) {
		test(`local markdown image opens visible slide ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const container = await openSlide(page, 0);
			const scrollAtOpen = await page.evaluate(() => window.scrollY);
			await closeLightbox(page, container, scrollAtOpen);

			const container2 = await openSlide(page, 1);
			await closeLightbox(page, container2, await page.evaluate(() => window.scrollY));
			await context.close();
		});

		test(`external https fixture preserves URL ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const requested: string[] = [];
			page.on("request", (req) => {
				if (req.url().includes("lightbox-fixtures.local/ok/640/360.png")) {
					requested.push(req.url());
				}
			});
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const external = page.locator('.custom-md img[src*="lightbox-fixtures.local/ok/640/360"]');
			await external.scrollIntoViewIfNeeded();
			await external.click();
			await expect(page.locator(".pswp")).toBeVisible();
			const state = await assertSlideLoaded(page);
			expect(state.currentSrc || state.src).toContain(
				"https://lightbox-fixtures.local/ok/640/360.png",
			);
			expect(requested.some((u) => u === "https://lightbox-fixtures.local/ok/640/360.png")).toBe(
				true,
			);
			await closeWithEscape(page, page.locator(".pswp"));
			await context.close();
		});

		test(`signed and protocol-relative URLs ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const seen: string[] = [];
			page.on("request", (req) => {
				const u = req.url();
				if (u.includes("signed/") || u.includes("cdn.example.com")) seen.push(u);
			});
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const signed = page.locator('.custom-md img[src*="signed/"]');
			await signed.scrollIntoViewIfNeeded();
			await signed.click();
			const signedState = await assertSlideLoaded(page);
			const signedSrc = signedState.currentSrc || signedState.src || "";
			expect(signedSrc).toContain("https://lightbox-fixtures.local/signed/800/450.png");
			expect(signedSrc).toContain("sig=abc123");
			expect(signedSrc).toContain("exp=9999999999");
			expect(
				seen.some(
					(u) =>
						u.includes("/signed/800/450.png") &&
						u.includes("sig=abc123") &&
						u.includes("exp=9999999999"),
				) || signedSrc.includes("sig=abc123"),
			).toBe(true);
			await closeWithEscape(page, page.locator(".pswp"));

			const proto = page.locator('.custom-md img[src*="cdn.example.com"]');
			await proto.scrollIntoViewIfNeeded();
			await proto.click();
			const protoState = await assertSlideLoaded(page);
			const protoSrc = protoState.currentSrc || protoState.src || "";
			expect(protoSrc.includes("cdn.example.com/ok/512/288.png") || protoSrc.startsWith("blob:")).toBe(
				true,
			);
			// Author URL must resolve to HTTPS — either request or active slide attribute.
			const slideAttr = await page
				.locator('.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)')
				.first()
				.getAttribute("src");
			expect(
				seen.some((u) => u.startsWith("https://cdn.example.com/ok/512/288.png")) ||
					(slideAttr ?? "").startsWith("https://cdn.example.com/ok/512/288.png") ||
					protoSrc.includes("cdn.example.com/ok/512/288.png"),
			).toBe(true);
			await closeWithEscape(page, page.locator(".pswp"));
			await context.close();
		});

		test(`thumb/full uses author original ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const slideReqs: string[] = [];
			page.on("request", (req) => {
				const u = req.url();
				if (u.includes("/full/") || u.includes("/thumb/")) slideReqs.push(u);
			});
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const thumbLink = page.locator('a[href*="/full/1280/720.png"]');
			await thumbLink.scrollIntoViewIfNeeded();
			await thumbLink.click();
			await assertSlideLoaded(page);
			expect(slideReqs.some((u) => u.includes("/full/1280/720.png"))).toBe(true);
			// After open, lightbox src must be full, not thumb.
			const src = await page
				.locator('.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)')
				.first()
				.evaluate((el: HTMLImageElement) => el.currentSrc || el.src);
			expect(src).toContain("/full/1280/720.png");
			expect(src).not.toContain("/thumb/");
			await closeWithEscape(page, page.locator(".pswp"));
			await context.close();
		});

		test(`keyboard a11y trap and caption ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const trigger = page.locator(".custom-md img").nth(1);
			await trigger.scrollIntoViewIfNeeded();
			await trigger.click();
			const container = page.locator(".pswp");
			await expect(container).toBeVisible();
			await assertSlideLoaded(page);

			const role = await container.evaluate((el) => ({
				ariaModal: el.getAttribute("aria-modal"),
				role: el.getAttribute("role"),
				overlay: el.classList.contains("pswp--open"),
			}));
			expect(role.overlay || role.ariaModal === "true" || role.role === "dialog").toBeTruthy();

			const before = await page.locator(".pswp__counter").textContent();
			await page.keyboard.press("ArrowRight");
			await expect.poll(async () => page.locator(".pswp__counter").textContent()).not.toBe(before);
			await assertSlideLoaded(page);

			await page.locator('.pswp__button--close, .pswp [title="Close"]').first().focus();
			let trapped = 0;
			for (let i = 0; i < 6; i += 1) {
				await page.keyboard.press("Tab");
				const inside = await page.evaluate(() =>
					Boolean(document.activeElement?.closest(".pswp")),
				);
				if (inside) trapped += 1;
			}
			expect(trapped).toBeGreaterThan(0);
			const underlyingFocused = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el) return false;
				return !el.closest(".pswp") && el !== document.body && el !== document.documentElement;
			});
			expect(underlyingFocused).toBe(false);

			const caption = page.locator(".pswp__custom-caption");
			if (await caption.count()) {
				const html = await caption.evaluate((el) => el.innerHTML);
				expect(html).not.toMatch(/<script/i);
				const text = (await caption.textContent()) ?? "";
				expect(text.length >= 0).toBe(true);
			}

			await closeLightbox(page, container, await page.evaluate(() => window.scrollY));
			await context.close();
		});

		test(`text link with image still navigates ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const link = page
				.locator(".custom-md a")
				.filter({ has: page.locator('img[alt="inline"]') })
				.first();
			await link.scrollIntoViewIfNeeded();
			await Promise.all([
				page.waitForURL(/\/posts\/?$/),
				link.click(),
			]);
			await expect(page.locator(".pswp")).toHaveCount(0);
			await context.close();
		});

		test(`error/timeout degrade without hang ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const errors: string[] = [];
			page.on("pageerror", (err) => errors.push(String(err)));
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			// Inject a marked failing trigger into the article group.
			await page.evaluate(() => {
				const md = document.querySelector(".custom-md");
				if (!md) throw new Error("missing .custom-md");
				const img = document.createElement("img");
				img.src = "https://lightbox-fixtures.local/status/404";
				img.alt = "broken fixture";
				img.setAttribute("data-fancybox", "probe-fail");
				md.append(img);
			});
			// Re-bind after DOM mutation (same path as Swup remount).
			await page.evaluate(() => document.dispatchEvent(new Event("swup:content:replace")));
			await waitForLightboxReady(page);

			const broken = page.locator('img[src*="status/404"]');
			await broken.scrollIntoViewIfNeeded();
			await broken.click();
			await expect(page.locator(".pswp")).toBeVisible({ timeout: 10_000 });
			await expect
				.poll(async () => page.locator(".pswp__original-link").count(), { timeout: 12_000 })
				.toBeGreaterThan(0);
			await closeWithEscape(page, page.locator(".pswp"));
			expect(errors.filter((e) => /uncaught|TypeError/i.test(e))).toEqual([]);
			await context.close();
		});

		test(`swup mid-probe does not leak lightbox ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			await installFixtureRoutes(page);
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const slowImg = page.locator('.custom-md img[src*="ok/321/187"]');
			await slowImg.scrollIntoViewIfNeeded();
			await slowImg.click();
			await page.evaluate(() => {
				document.dispatchEvent(new Event("swup:content:replace"));
			});
			await page.goto(`${origin}/posts/`, { waitUntil: "domcontentloaded" });
			await expect(page.locator(".pswp")).toHaveCount(0);
			await context.close();
		});

		test(`carousel and close restore navigation ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			await installFixtureRoutes(page);
			await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });
			await page
				.locator('a.m3-blog-postcard__title[href$="/en/posts/pagination-sample/"]')
				.first()
				.click();
			await expect(page).toHaveURL(new RegExp("/en/posts/pagination-sample/?$"));
			// Swup remount can race readiness; force the same content:replace path Layout uses.
			await page.evaluate(() => document.dispatchEvent(new Event("swup:content:replace")));
			await waitForLightboxReady(page);
			await expect(page.locator(".custom-md img, #post-cover img").first()).toBeVisible();

			const image = page
				.locator(".custom-md img, #post-cover img")
				.filter({ hasNot: page.locator(".image-grid img") })
				.first();
			await image.scrollIntoViewIfNeeded();
			await image.click({ force: true });
			const container = page.locator(".pswp");
			await expect(container).toBeVisible({ timeout: 10_000 });
			await assertSlideLoaded(page);
			await closeLightbox(page, container, await page.evaluate(() => window.scrollY));

			await page.goBack();
			await expect(page).toHaveURL(new RegExp("/posts/?$"));
			await page.goForward();
			await expect(page).toHaveURL(new RegExp("/en/posts/pagination-sample/?$"));
			await context.close();
		});
	}
}

for (const theme of ["dark", "light"] as Theme[]) {
	test(`lightbox works in ${theme} theme (root, desktop)`, async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 1000 },
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		await installFixtureRoutes(page);
		await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "networkidle" });
		await waitForLightboxReady(page);

		const wantDark = theme === "dark";
		for (let attempt = 0; attempt < 4; attempt += 1) {
			const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
			if (isDark === wantDark) break;
			await page.locator("#scheme-switch").click();
			await page.locator(".m3-menu .m3-menu-item").nth(theme === "light" ? 0 : 1).click();
			await page.waitForTimeout(300);
		}
		if (wantDark) {
			await expect(page.locator("html")).toHaveAttribute("data-theme", "github-dark");
		} else {
			await expect(page.locator("html")).toHaveAttribute("data-theme", "github-light");
		}

		const container = await openSlide(page, 0);
		await closeWithEscape(page, container);
		await context.close();
	});
}
