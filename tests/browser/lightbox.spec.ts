import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Article image lightbox regression coverage (Issue #123).
 *
 * Guards against the Fancybox v6.1.15 empty-frame defect: the vendor toggles
 * `.f-panzoom__wrapper.is-fullsize` without shipping sizing CSS, so the Panzoom
 * wrapper collapsed to 0x0 and the viewport stuck at scale(0) while the
 * container itself looked open. Assertions therefore check the real slide
 * image geometry and HTTP status, never container visibility alone.
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/posts/hello-alnilam/";

type Theme = "dark" | "light";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

async function waitForLightboxReady(page: Page) {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.fancyboxReady))
		.toBe("true");
}

async function assertSlideLoaded(page: Page, responses: Map<string, number>) {
	const slide = page.locator(".fancybox__slide.is-selected");
	const img = slide.locator(".f-panzoom__viewport img");
	await expect(img).toBeVisible();

	// Empty-frame guards: the wrapper must be sized and the viewport must not
	// be stuck at the degenerate scale(0) layout. Under 2-CPU CI load the
	// panzoom transform oscillates while a slide switch settles, so poll until
	// every guard holds simultaneously and assert on that captured state —
	// a fresh re-sample after the poll could catch a transient frame again.
	let last: {
		src: string | null;
		currentSrc: string | null;
		naturalWidth: number;
		rect: number;
		wrapperRect: number;
		viewportTransform: string;
	} | undefined;
	await expect
		.poll(async () => {
			last = await img.evaluate((el: HTMLImageElement) => ({
				src: el.getAttribute("src"),
				currentSrc: el.currentSrc,
				naturalWidth: el.naturalWidth,
				rect: el.getBoundingClientRect().width,
				wrapperRect: el.closest(".f-panzoom__wrapper")?.getBoundingClientRect().width ?? 0,
				viewportTransform: (el.closest(".f-panzoom__viewport") as HTMLElement | null)?.style.transform ?? "",
			}));
			return (
				last.wrapperRect > 0 &&
				last.rect > 0 &&
				!last.viewportTransform.includes("scale(0)") &&
				last.naturalWidth > 0 &&
				Boolean(last.src) &&
				Boolean(last.currentSrc) &&
				responses.get(last.currentSrc) === 200
			);
		}, { timeout: 10_000 })
		.toBe(true);

	const state = last!;
	expect(state.wrapperRect).toBeGreaterThan(0);
	expect(state.rect).toBeGreaterThan(0);
	expect(state.viewportTransform).not.toContain("scale(0)");
	expect(state.naturalWidth).toBeGreaterThan(0);
	expect(state.src).toBeTruthy();
	expect(state.currentSrc).toBeTruthy();
	expect(responses.get(state.currentSrc)).toBe(200);
	return state;
}



async function openSlide(page: Page, index: number, responses: Map<string, number>) {
	const image = page.locator(".custom-md img").nth(index);
	await image.scrollIntoViewIfNeeded();
	await image.click();
	const container = page.locator(".fancybox__container");
	await expect(container).toBeVisible();
	await assertSlideLoaded(page, responses);
	// The vendor swallows key events during the open transition; settle first.
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
	// Scroll position and focus return to the article.
	await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBe(scrollBefore);
	const focusInside = await page.evaluate(() =>
		Boolean(document.activeElement?.closest?.(".fancybox__container")),
	);
	expect(focusInside).toBe(false);
}

for (const [name, origin] of deployments) {
	for (const width of [1440, 390]) {
		test(`lightbox body images open with loaded slides ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);
			// Fixture contract: two markdown body images (cover + raster fixture).
			await expect(page.locator(".custom-md img")).toHaveCount(2);

			// First body image opens with a loaded slide.
			const container = await openSlide(page, 0, responses);
			// Fancybox restores scroll to where the page was when the lightbox opened.
			const scrollAtOpen = await page.evaluate(() => window.scrollY);
			await closeLightbox(page, container, scrollAtOpen);

			// Second body image opens with a loaded slide; sequence repeats cleanly.
			const container2 = await openSlide(page, 1, responses);
			await closeLightbox(page, container2, await page.evaluate(() => window.scrollY));
			await context.close();
		});

		test(`lightbox carousel slides all load ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await waitForLightboxReady(page);

			await openSlide(page, 0, responses);

			// Cover + two body images form one carousel group; the first body
			// image is slide 2 of 3.
			const counter = page.locator(".fancybox__container .f-counter");
			await expect(counter).toHaveText(/2\s*\/\s*3/);

			// Switch through every slide (infinite carousel wraps); each must
			// load for real.
			for (const expected of [/3\s*\/\s*3/, /1\s*\/\s*3/]) {
				await page.keyboard.press("ArrowRight");
				await expect(counter).toHaveText(expected, { timeout: 10_000 });
				await assertSlideLoaded(page, responses);
			}

			await closeWithEscape(page, page.locator(".fancybox__container"));
			await context.close();

		});

		test(`lightbox close restores navigation ${name} ${width}`, async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
			const page = await context.newPage();
			const responses = new Map<string, number>();
			page.on("response", (res) => responses.set(res.url(), res.status()));

			await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });

			// hello-alnilam now paginates to page 3; drive the lightbox lifecycle
			// from a page-1 card instead.
			await page.locator('a.m3-blog-postcard__title[href$="/en/posts/pagination-sample/"]').first().click();
			await expect(page).toHaveURL(new RegExp("/en/posts/pagination-sample/?$"));
			await waitForLightboxReady(page);

			const container = await openSlide(page, 0, responses);
			await closeLightbox(page, container, await page.evaluate(() => window.scrollY));

			// Back/forward navigation still works after the lightbox lifecycle.
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
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		const responses = new Map<string, number>();
		page.on("response", (res) => responses.set(res.url(), res.status()));

		await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "networkidle" });
		await waitForLightboxReady(page);

		// Toggle the theme control used by other specs until the wanted scheme sticks.
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

		const container = await openSlide(page, 0, responses);
		await closeWithEscape(page, container);
		await context.close();

	});
}
