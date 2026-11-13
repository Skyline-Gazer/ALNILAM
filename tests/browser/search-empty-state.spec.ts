import { expect, test } from "@playwright/test";

/**
 * A search that matches nothing must say so. The panel used to stay open with
 * an empty body on mobile and to close without any feedback on desktop, so a
 * visitor could not tell a finished search from a broken one. The message
 * follows the page language.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const NO_HIT = "zzzznotfoundzzz";

for (const origin of ORIGINS) {
	const label = new URL(origin).pathname;

	test(`the search panel states that nothing matched ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
			await page.locator("#search-switch").click();
			await page.locator("#search-panel input").fill(NO_HIT);
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveText("没有找到结果");
			await expect(page.locator("#search-panel a.m3-blog-searchpanel__item")).toHaveCount(0);

			// A matching query replaces the message with real results.
			await page.locator("#search-panel input").fill("ALNILAM");
			await expect(page.locator("#search-panel a.m3-blog-searchpanel__item").first()).toBeVisible();
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveCount(0);
		} finally {
			await context.close();
		}
	});

	test(`the desktop search panel states that nothing matched ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
			await page.locator("#search-input-desktop-switch").focus();
			await page.keyboard.press("Enter");
			await page.locator("#search-input-desktop").fill(NO_HIT);
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveText("没有找到结果");
			await expect(page.locator("#search-panel a.m3-blog-searchpanel__item")).toHaveCount(0);

			await page.locator("#search-input-desktop").fill("ALNILAM");
			await expect(page.locator("#search-panel a.m3-blog-searchpanel__item").first()).toBeVisible();
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveCount(0);
		} finally {
			await context.close();
		}
	});

	test(`the no-results message follows the page language ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}/en/posts/hello-alnilam/`, { waitUntil: "networkidle" });
			await page.locator("#search-switch").click();
			await page.locator("#search-panel input").fill(NO_HIT);
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveText("No results");
		} finally {
			await context.close();
		}
	});

	test(`the empty state follows the query the visitor can see ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
			await page.locator("#search-input-desktop-switch").focus();
			await page.keyboard.press("Enter");
			await page.locator("#search-input-desktop").fill(NO_HIT);
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveText("没有找到结果");

			// Narrowing the viewport hands the panel its own, empty input: the
			// empty state must not claim that an empty query matched nothing.
			await page.setViewportSize({ width: 390, height: 844 });
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveCount(0);

			await page.locator("#search-panel input").fill(NO_HIT);
			await expect(page.locator("#search-panel .m3-blog-searchpanel__status")).toHaveText("没有找到结果");
		} finally {
			await context.close();
		}
	});
}
