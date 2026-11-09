import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Article image lightbox regression coverage (Issue #123 / #75).
 *
 * Compatible with Fancybox v6 (current `dev`) and PhotoSwipe 5 (follow-up PR).
 * Trusted-gate browser tests are target-owned, so this file must stay green
 * against either product runtime.
 *
 * Fancybox empty-frame guard (#123): require sized panzoom wrapper + non-zero
 * scale + HTTP 200 on currentSrc. PhotoSwipe has no panzoom wrapper; there the
 * painted-slide path requires naturalWidth/rect and a real http(s) currentSrc
 * with status 200 (blob/data placeholders alone are not enough).
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/posts/hello-alnilam/";

type Theme = "dark" | "light";
type Vendor = "fancybox" | "photoswipe";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

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

test("lightbox retries after a stylesheet request fails", async ({ page }) => {
	let failed = false;
	await page.route(
		/fancybox[^/]*\.css(?:\?.*)?$|photoswipe[^/]*\.css(?:\?.*)?$|fancybox-custom[^/]*\.css(?:\?.*)?$/i,
		async (route) => {
			if (!failed) {
				failed = true;
				await route.abort();
			} else {
				await route.continue();
			}
		},
	);
	await page.goto(ROOT + ARTICLE);
	await expect.poll(() => failed).toBe(true);
	await page.evaluate(() => document.dispatchEvent(new Event("swup:content:replace")));
	await waitForLightboxReady(page);
	const image = page.locator(".custom-md img").first();
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const vendor = await detectVendor(page);
	await expect(page.locator(slideImgSel(vendor)).first()).toBeVisible();
});

async function waitForLightboxReady(page: Page) {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.fancyboxReady))
		.toBe("true");
}

async function assertSlideLoaded(
	page: Page,
	responses: Map<string, number>,
	vendor: Vendor,
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
			// PhotoSwipe: no panzoom wrapper. Require a real network image (not
			// blob/data-only placeholders) with HTTP 200.
			const url = last.currentSrc;
			if (url.startsWith("blob:") || url.startsWith("data:")) return false;
			return responses.get(url) === 200;
		}, { timeout: 10_000 })
		.toBe(true);

	const state = last!;
	expect(state.naturalWidth).toBeGreaterThan(0);
	expect(state.rect).toBeGreaterThan(0);
	expect(state.currentSrc).toBeTruthy();
	if (vendor === "fancybox") {
		expect(state.wrapperRect).toBeGreaterThan(0);
		expect(state.viewportTransform).not.toContain("scale(0)");
		expect(state.src).toBeTruthy();
	}
	expect(responses.get(state.currentSrc!)).toBe(200);
	return state;
}

async function openSlide(page: Page, index: number, responses: Map<string, number>) {
	const image = page.locator(".custom-md img").nth(index);
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const vendor = await detectVendor(page);
	const container = page.locator(containerSel(vendor));
	await expect(container).toBeVisible();
	await assertSlideLoaded(page, responses, vendor);
	await page.waitForTimeout(700);
	return { container, vendor };
}

async function closeWithEscape(page: Page, container: Locator) {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await page.keyboard.press("Escape");
		try {
			await expect(container).toHaveCount(0, { timeout: 2_000 });
			return;
		} catch {
			/* Fancybox swallows the first Escape during its open transition. */
		}
	}
	await expect(container).toHaveCount(0, { timeout: 10_000 });
}

async function closeLightbox(page: Page, container: Locator, scrollBefore: number) {
	await closeWithEscape(page, container);
	await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBe(scrollBefore);
	const focusInside = await page.evaluate(
		() => Boolean(document.activeElement?.closest?.(".fancybox__container, .pswp")),
	);
	expect(focusInside).toBe(false);
}

for (const [name, origin] of deployments) {
	for (const width of [1440, 390]) {
		test(`lightbox body images open with loaded slides ${name} ${width}`, async ({
			browser,
		}) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);
			// Cover + body images. Fancybox demo is exactly 2; PhotoSwipe matrix may add more.
			await expect.poll(async () => page.locator(".custom-md img").count()).toBeGreaterThanOrEqual(2);

			const first = await openSlide(page, 0, responses);
			const scrollAtOpen = await page.evaluate(() => window.scrollY);
			await closeLightbox(page, first.container, scrollAtOpen);

			const second = await openSlide(page, 1, responses);
			await closeLightbox(page, second.container, await page.evaluate(() => window.scrollY));
			await context.close();
		});

		test(`lightbox carousel slides all load ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			const opened = await openSlide(page, 0, responses);
			const counter = page.locator(counterSel(opened.vendor));

			if (opened.vendor === "fancybox") {
				// Cover + two body images form one carousel group; first body is 2/3.
				await expect(counter).toHaveText(/2\s*\/\s*3/);
				for (const expected of [/3\s*\/\s*3/, /1\s*\/\s*3/]) {
					await page.keyboard.press("ArrowRight");
					await expect(counter).toHaveText(expected, { timeout: 10_000 });
					await assertSlideLoaded(page, responses, opened.vendor);
				}
			} else {
				// PhotoSwipe fixture matrix may add images. Require total >= 3 and
				// the visible counter index to increase by exactly one.
				const before = ((await counter.textContent()) ?? "").replace(/\s/g, "");
				const match = before.match(/^(\d+)\/(\d+)$/);
				expect(match, `counter was ${before}`).toBeTruthy();
				const index = Number(match![1]);
				const total = Number(match![2]);
				expect(total).toBeGreaterThanOrEqual(3);
				await page.keyboard.press("ArrowRight");
				await expect(counter).toHaveText(
					new RegExp(`^\s*${index + 1}\s*/\s*${total}\s*$`),
					{ timeout: 10_000 },
				);
				await assertSlideLoaded(page, responses, opened.vendor);
			}

			await closeWithEscape(page, opened.container);
			await context.close();
		});

		test(`lightbox close restores navigation ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width, height: 1000 },
				reducedMotion: "reduce",
			});
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });

			await page
				.locator('a.m3-blog-postcard__title[href$="/en/posts/pagination-sample/"]')
				.first()
				.click();
			await expect(page).toHaveURL(new RegExp("/en/posts/pagination-sample/?$"));
			// Wait for real Swup/runtime readiness — do not synthesize content:replace.
			await waitForLightboxReady(page);
			await expect(page.locator(".custom-md img, #post-cover img").first()).toBeVisible();

			const opened = await openSlide(page, 0, responses);
			await closeLightbox(page, opened.container, await page.evaluate(() => window.scrollY));

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
		const responses = new Map<string, number>();
		page.on("response", (res) => responses.set(res.url(), res.status()));

		await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "networkidle" });
		await waitForLightboxReady(page);

		const wantDark = theme === "dark";
		for (let attempt = 0; attempt < 4; attempt += 1) {
			const isDark = await page
				.locator("html")
				.evaluate((el) => el.classList.contains("dark"));
			if (isDark === wantDark) break;
			await page.locator("#scheme-switch").click();
			await page
				.locator(".m3-menu .m3-menu-item")
				.nth(theme === "light" ? 0 : 1)
				.click();
			await page.waitForTimeout(300);
		}
		if (wantDark) {
			await expect(page.locator("html")).toHaveAttribute("data-theme", "github-dark");
		} else {
			await expect(page.locator("html")).toHaveAttribute("data-theme", "github-light");
		}

		const opened = await openSlide(page, 0, responses);
		await closeWithEscape(page, opened.container);
		await context.close();
	});
}
