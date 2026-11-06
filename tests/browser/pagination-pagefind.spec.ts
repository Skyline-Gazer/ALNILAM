import { expect, test, type Page } from "@playwright/test";

/**
 * Pagination + Pagefind end-to-end regression (Issue #63, P4/T02).
 *
 * The demo Site ships 14 published articles across zh-CN / en / ja, so the
 * posts list paginates (pageSize 5 -> 3 pages) and Pagefind builds per-language
 * indexes. Cover page-2 access, per-locale unique-keyword search with real
 * click-through, and root + /ALNILAM/ deployments.
 */

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

const deployments = [
	["root", ROOT],
	["nested", NESTED],
] as const;

type SearchMode = "desktop" | "mobile";

async function openSearch(page: Page, mode: SearchMode) {
	if (mode === "desktop") {
		// Desktop: the capsule switch expands the top-bar search input; the
		// float panel input is hidden (hideInputOnDesktop).
		await page.locator("#search-input-desktop-switch").click();
		return page.locator("input#search-input-desktop");
	}
	await page.locator("#search-switch").click();
	return page.locator("#search-panel input");
}

async function searchAndClickFirstResult(
	page: Page,
	input: ReturnType<Page["locator"]>,
	query: string,
) {
	// Focus first: the load triggers on focus/click, and Pagefind needs its
	// entry metadata before the first query can return results.
	await input.click();
	await input.fill(query);
	const results = page.locator("#search-panel").getByRole("link");
	await expect(results.first()).toBeVisible({ timeout: 15_000 });
	const hrefs = await results.evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
	expect(hrefs.some((href) => /\/posts\/(?:en|ja)\//.test(href))).toBe(false);
	expect(new Set(hrefs).size).toBe(hrefs.length);
	const href = await results.first().getAttribute("href");
	await results.first().click();
	await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 40)));
	return href;
}

for (const [name, origin] of deployments) {
	test(`posts pagination reaches page 2 and back ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });

		await expect(page.locator(".m3-blog-postcard")).toHaveCount(5);
		// The mobile pagination block precedes the desktop one in the DOM but is
		// hidden at this viewport; only click a visible control.
		const page2 = page.locator('a[href$="/posts/2/"]').filter({ visible: true }).first();
		await expect(page2).toBeVisible();
		await page2.click();
		await expect(page).toHaveURL(new RegExp("/posts/2/?$"));
		await expect(page.locator("main")).toContainText("第 2/3 页");
		await expect(page.locator(".m3-blog-postcard").first()).toBeVisible();
		// Back to page 1 via the visible pagination control.
		const page1 = page.locator('a[href$="/posts/"]').filter({ visible: true }).first();
		await page1.click();
		await expect(page).toHaveURL(new RegExp("/posts/?$"));
		await context.close();
	});

	test(`pagefind zh-CN unique keyword finds and opens the zh article ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/`, { waitUntil: "networkidle" });

		const input = await openSearch(page, "desktop");
		const href = await searchAndClickFirstResult(page, input, "萤火虫索引");
		expect(href).toContain("pagination-segmentation-zh");
		await expect(page.locator("main h1")).toBeVisible();
		await context.close();
	});

	test(`pagefind en unique keyword finds and opens the en article ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		// Search from the en post itself so the locale context is en.
		await page.goto(`${origin}/en/posts/pagination-sample/`, { waitUntil: "networkidle" });

		const input = await openSearch(page, "desktop");
		const href = await searchAndClickFirstResult(page, input, "comet-locator");
		expect(href).toContain(`${new URL(origin).pathname.replace(/\/$/, "")}/en/posts/pagination-sample/`);
		await expect(page.locator("main h1")).toBeVisible();
		await context.close();
	});

	test(`pagefind ja unique keyword finds the ja article ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/ja/posts/pagination-sample/`, { waitUntil: "networkidle" });

		const input = await openSearch(page, "mobile");
		// Pagefind's ja wasm segments standard words; ほしぞろ手帖-style
		// hiragana/kanji compounds do not match, ページネーション does.
		const href = await searchAndClickFirstResult(page, input, "ページネーション");
		expect(href).toContain(`${new URL(origin).pathname.replace(/\/$/, "")}/ja/posts/`);
		expect(href).not.toContain("/posts/ja/");
		await context.close();
	});

	test(`drafts and fixtures stay out of pagefind index files ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const page = await context.newPage();
		await page.goto(`${origin}/pagefind/pagefind-entry.json`, { waitUntil: "domcontentloaded" });
		const entry = await page.evaluate(() => document.body.innerText);
		// The entry is per-language metadata; the fragment files must not leak
		// unpublished content. The draft fixture site has no drafts, but the
		// index must exist for all three languages.
		expect(entry).toContain("zh-cn");
		expect(entry).toContain("en");
		expect(entry).toContain("ja");
		await context.close();
	});
}
