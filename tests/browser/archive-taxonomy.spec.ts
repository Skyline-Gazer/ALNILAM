import { expect, test, type Page } from "@playwright/test";

/**
 * Shirone archive / taxonomy detail regression coverage (Issue #124).
 *
 * Detail routes (/categories/<slug>/, /tags/<tag>/) must render the native
 * ArchivePanel timeline pre-scoped by the host page; /archives/ keeps the
 * grouped switch and still honors ?category=/explicit query filtering.
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

async function expectTimeline(page: Page, minItems: number) {
	const items = page.locator(".m3-blog-archive__item");
	await expect(items.first()).toBeVisible();
	expect(await items.count()).toBeGreaterThanOrEqual(minItems);
	// The native timeline, not the Fuwari postcard grid.
	await expect(page.locator(".m3-blog-postcard")).toHaveCount(0);
}

for (const [name, origin] of deployments) {
	test(`category detail renders pre-scoped timeline ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		// No query param: the SSR filter from the host page must survive onMount.
		await page.goto(`${origin}/categories/release/`, { waitUntil: "networkidle" });
		await expectTimeline(page, 3);
		// The category bar hides on taxonomy detail routes (also under nested base).
		await expect(page.locator("#category-bar-region")).toBeHidden();
		// Every member link belongs to the release category's posts.
		const hrefs = await page.locator(".m3-blog-archive__item").evaluateAll((els) =>
			els.map((el) => (el as HTMLAnchorElement).getAttribute("href")),
		);
		expect(hrefs.length).toBeGreaterThan(0);
		expect(hrefs.every((href) => href?.includes("/posts/"))).toBe(true);
		// The guide category is a different slice: opening it must not show release posts.
		await page.goto(`${origin}/categories/guide/`, { waitUntil: "networkidle" });
		await expectTimeline(page, 1);
		const guideHrefs = await page.locator(".m3-blog-archive__item").evaluateAll((els) =>
			els.map((el) => (el as HTMLAnchorElement).getAttribute("href")),
		);
		expect(guideHrefs.every((href) => href?.includes("/posts/"))).toBe(true);
		await context.close();
	});

	test(`tag detail renders pre-scoped timeline ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/tags/alnilam/`, { waitUntil: "networkidle" });
		await expectTimeline(page, 3);
		await expect(page.locator("#category-bar-region")).toBeHidden();
		await context.close();
	});

	test(`archives query and grouped behavior ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();

		// No params: grouped switch visible, full corpus present.
		await page.goto(`${origin}/archives/`, { waitUntil: "networkidle" });
		await expect(page.locator(".archive-panel__group-switch")).toBeVisible();
		const allItems = await page.locator(".m3-blog-archive__item").count();
		expect(allItems).toBeGreaterThanOrEqual(4);

		// ?category= filters to a directed view: crumb shown, group switch hidden.
		await page.goto(`${origin}/archives/?category=guide`, { waitUntil: "networkidle" });
		await expect(page.locator(".archive-panel__group-switch")).toHaveCount(0);
		await expect(page.locator(".archive-panel__crumb")).toBeVisible();
		const guideItems = await page.locator(".m3-blog-archive__item").count();
		expect(guideItems).toBeGreaterThan(0);
		expect(guideItems).toBeLessThan(allItems);
		await context.close();
	});
}

test(`archive timeline in dark theme (root, desktop)`, async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
	const page = await context.newPage();
	await page.goto(`${ROOT}/categories/release/`, { waitUntil: "networkidle" });
	const wantDark = true;
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
		if (isDark === wantDark) break;
		await page.locator("#scheme-switch").click();
		await page.locator(".m3-menu .m3-menu-item").nth(1).click();
		await page.waitForTimeout(300);
	}
	await expect(page.locator("html")).toHaveAttribute("data-theme", "github-dark");
	await expectTimeline(page, 3);
	// Year group collapse toggles without losing the timeline.
	const chevron = page.locator(".m3-blog-archive__chevron").first();
	await chevron.click();
	await page.waitForTimeout(200);
	await chevron.click();
	await expect(page.locator(".m3-blog-archive__item").first()).toBeVisible();
	await context.close();
});

test(`archive timeline in light theme (root, desktop)`, async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
	const page = await context.newPage();
	await page.goto(`${ROOT}/categories/release/`, { waitUntil: "networkidle" });
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
		if (!isDark) break;
		await page.locator("#scheme-switch").click();
		await page.locator(".m3-menu .m3-menu-item").nth(0).click();
		await page.waitForTimeout(300);
	}
	await expect(page.locator("html")).toHaveAttribute("data-theme", "github-light");
	await expectTimeline(page, 3);
	await context.close();
});

// Mobile viewport sanity: the timeline renders and the category bar hides.
for (const [name, origin] of deployments) {
	test(`taxonomy detail mobile 390 ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/categories/release/`, { waitUntil: "networkidle" });
		await expectTimeline(page, 3);
		await expect(page.locator("#category-bar-region")).toBeHidden();
		await context.close();
	});
}

