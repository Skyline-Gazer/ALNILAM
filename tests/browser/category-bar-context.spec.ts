import { expect, test } from "@playwright/test";

/**
 * Issue #204: the Shirone category bar and the article tag widget are contextual opt-in,
 * decided by the layout `page` capability instead of a global default with a pathname denylist.
 *
 * The matrix the Owner approved for this slice:
 *   home, post            → category bar + article tag widget
 *   archive, categories,
 *   tags                  → tag widget only (no redundant Home/Archive chip strip)
 *   series, module pages
 *   (albums/moments/bangumi), static Site pages,
 *   search, 404           → neither control
 *   Profile widget        → every page (site identity)
 *
 * Navigation is native MPA (ADR 0002), so each hop is a full document load: visibility must come
 * from the server-rendered page, with no client filter that can go stale or double-apply.
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

const CATEGORY_BAR = "#category-bar-region";
const TAG_WIDGET = '[data-sidebar-pages="home,post,archive,categories,tags"]';

const withBar = [
	"/",
	"/en/",
	"/ja/",
	"/posts/getting-started/",
	"/en/posts/getting-started/",
] as const;

const withoutBar = [
	"/posts/",
	"/archives/",
	"/categories/",
	"/categories/release/",
	"/tags/",
	"/tags/alnilam/",
	"/series/",
	"/albums/",
	"/moments/",
	"/search/",
	"/page-not-here/",
] as const;

const withTagWidget = [...withBar, "/posts/", "/archives/", "/categories/", "/tags/"] as const;
const withoutTagWidget = ["/series/", "/albums/", "/moments/", "/search/", "/page-not-here/"] as const;

for (const [name, origin] of [
	["root", ROOT],
	["nested", NESTED],
] as const) {
	test(`category bar renders only in opted-in contexts ${name}`, async ({ page }) => {
		for (const route of withBar) {
			await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
			await expect(page.locator(CATEGORY_BAR)).toBeVisible();
		}
		for (const route of withoutBar) {
			await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
			await expect(page.locator(CATEGORY_BAR)).toHaveCount(0);
		}
	});

	test(`article tag widget follows the same page capability ${name}`, async ({ page }) => {
		for (const route of withTagWidget) {
			await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
			await expect(page.locator(TAG_WIDGET)).toBeVisible();
		}
		for (const route of withoutTagWidget) {
			await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
			await expect(page.locator(TAG_WIDGET)).toHaveCount(0);
			// Site identity is not article taxonomy and stays available.
			await expect(page.locator("#sidebar .m3-profile")).toBeVisible();
		}
	});

	test(`repeated navigation applies the policy without stale chrome ${name}`, async ({ page }) => {
		const bar = page.locator(CATEGORY_BAR);
		const hops = [
			"/",
			"/archives/",
			"/posts/getting-started/",
			"/series/",
			"/categories/release/",
			"/",
		] as const;
		const expectBar = [true, false, true, false, false, true];
		const check = async (index: number) => {
			if (expectBar[index]) await expect(bar).toBeVisible();
			else await expect(bar).toHaveCount(0);
		};
		for (let index = 0; index < hops.length; index += 1) {
			await page.goto(`${origin}${hops[index]}`, { waitUntil: "networkidle" });
			await check(index);
		}
		// A real in-app header hop must apply the same server-rendered policy.
		await page.click('header a[data-nav-key="archive"]');
		await page.waitForLoadState("networkidle");
		await expect(bar).toHaveCount(0);
		// Reverse and forward traversal of the recorded history.
		for (let index = hops.length - 2; index >= 0; index -= 1) {
			await page.goBack();
			await page.waitForLoadState("networkidle");
			await check(index);
		}
		for (let index = 1; index < hops.length; index += 1) {
			await page.goForward();
			await page.waitForLoadState("networkidle");
			await check(index);
		}
	});

	test(`mobile uses the same page capability ${name}`, async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		await page.goto(`${origin}/`, { waitUntil: "networkidle" });
		await expect(page.locator(CATEGORY_BAR)).toBeVisible();
		await page.goto(`${origin}/archives/`, { waitUntil: "networkidle" });
		await expect(page.locator(CATEGORY_BAR)).toHaveCount(0);
		await page.goto(`${origin}/moments/`, { waitUntil: "networkidle" });
		await expect(page.locator(CATEGORY_BAR)).toHaveCount(0);
		await expect(page.locator(TAG_WIDGET)).toHaveCount(0);
		await context.close();
	});
}
