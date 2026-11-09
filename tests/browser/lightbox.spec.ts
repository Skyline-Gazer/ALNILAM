import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Article image lightbox regression coverage (Issue #123 / #75).
 *
 * Compatible with both Fancybox v6 (current `dev`) and PhotoSwipe 5
 * (`feat/photoswipe-lightbox`). Trusted-gate browser tests are target-owned,
 * so this file must stay green against either product runtime.
 *
 * Assertions check a real slide image geometry / HTTP status, never container
 * visibility alone (Fancybox empty-frame guard).
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/posts/hello-alnilam/";

type Theme = "dark" | "light";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

const CONTAINER = ".fancybox__container, .pswp";
const SLIDE_IMG =
	".fancybox__slide.is-selected .f-panzoom__viewport img, .pswp__item[aria-hidden=\"false\"] .pswp__img:not(.pswp__img--placeholder)";
const COUNTER = ".fancybox__container .f-counter, .pswp__counter";

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
	await expect(page.locator(SLIDE_IMG).first()).toBeVisible();
});

async function waitForLightboxReady(page: Page) {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.fancyboxReady))
		.toBe("true");
}

async function assertSlideLoaded(page: Page, responses: Map<string, number>) {
	const img = page.locator(SLIDE_IMG).first();
	await expect(img).toBeVisible();

	// Empty-frame guards (Fancybox) + painted-slide guards (PhotoSwipe).
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
					el.closest(".f-panzoom__wrapper")?.getBoundingClientRect().width ??
					el.getBoundingClientRect().width,
				viewportTransform:
					(el.closest(".f-panzoom__viewport") as HTMLElement | null)?.style
						.transform ?? "",
			}));
			return (
				!!last &&
				last.wrapperRect > 0 &&
				last.rect > 0 &&
				!last.viewportTransform.includes("scale(0)") &&
				last.naturalWidth > 0 &&
				Boolean(last.src || last.currentSrc) &&
				(last.currentSrc
					? responses.get(last.currentSrc) === 200 ||
						last.currentSrc.startsWith("blob:") ||
						last.currentSrc.startsWith("data:")
					: true)
			);
		}, { timeout: 10_000 })
		.toBe(true);

	const state = last!;
	expect(state.wrapperRect).toBeGreaterThan(0);
	expect(state.rect).toBeGreaterThan(0);
	expect(state.viewportTransform).not.toContain("scale(0)");
	expect(state.naturalWidth).toBeGreaterThan(0);
	expect(state.src || state.currentSrc).toBeTruthy();
	return state;
}

async function openSlide(page: Page, index: number, responses: Map<string, number>) {
	const image = page.locator(".custom-md img").nth(index);
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const container = page.locator(CONTAINER);
	await expect(container).toBeVisible();
	await assertSlideLoaded(page, responses);
	// Vendors may swallow key events during the open transition; settle first.
	await page.waitForTimeout(700);
	return container;
}

async function closeWithEscape(page: Page, container: Locator) {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await page.keyboard.press("Escape");
		try {
			await expect(container).toHaveCount(0, { timeout: 2_000 });
			return;
		} catch {
			// key was swallowed during a transition; retry
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
			// At least the historical two body images; PhotoSwipe fixture matrix may add more.
			await expect.poll(async () => page.locator(".custom-md img").count()).toBeGreaterThanOrEqual(2);

			const container = await openSlide(page, 0, responses);
			const scrollAtOpen = await page.evaluate(() => window.scrollY);
			await closeLightbox(page, container, scrollAtOpen);

			const container2 = await openSlide(page, 1, responses);
			await closeLightbox(page, container2, await page.evaluate(() => window.scrollY));
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

			await openSlide(page, 0, responses);

			const counter = page.locator(COUNTER);
			// Fancybox: cover + two body → 2/3. PhotoSwipe article group may differ.
			await expect(counter).toHaveText(/\d+\s*\/\s*\d+/);

			const before = (await counter.textContent()) ?? "";
			await page.keyboard.press("ArrowRight");
			await expect.poll(async () => page.locator(COUNTER).textContent()).not.toBe(before);
			await assertSlideLoaded(page, responses);

			await closeWithEscape(page, page.locator(CONTAINER));
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
			await page.evaluate(() => document.dispatchEvent(new Event("swup:content:replace")));
			await waitForLightboxReady(page);

			const container = await openSlide(page, 0, responses);
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

		const container = await openSlide(page, 0, responses);
		await closeWithEscape(page, container);
		await context.close();
	});
}
