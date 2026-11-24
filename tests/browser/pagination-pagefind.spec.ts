import { expect, test, type Page } from "@playwright/test";

/**
 * Pagination + Pagefind end-to-end regression (Issue #63, P4/T02).
 *
 * Cover page-2 access, per-locale body and title search with real click-through,
 * and root + /ALNILAM/ deployments.
 */

const ROOT = process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323";
const NESTED = process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324/ALNILAM";

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
	test(`search excerpts hide Pagefind internals ${name}`, async ({ page }) => {
		await page.goto(`${origin}/`, { waitUntil: "networkidle" });
		const input = await openSearch(page, "desktop");
		await input.fill("ALNILAM");
		const panelResults = page.locator("#search-panel").getByRole("link");
		await expect(panelResults.first()).toBeVisible({ timeout: 15_000 });
		await expect(page.locator("#search-panel")).not.toContainText("___END_PAGEFIND_WEIGHT___");
		await expect(page.locator("#search-panel mark").first()).toBeVisible();

		await page.goto(`${origin}/search/`, { waitUntil: "networkidle" });
		await page.getByRole("searchbox", { name: "搜索文章" }).fill("ALNILAM");
		const pageResults = page.locator("[data-search-results]");
		await expect(pageResults.getByRole("link").first()).toBeVisible({ timeout: 15_000 });
		await expect(pageResults).not.toContainText("___END_PAGEFIND_WEIGHT___");
	});

	test(`search language switcher preserves the search route ${name}`, async ({ page }) => {
		const base = new URL(origin).pathname.replace(/\/$/, "");
		await page.goto(`${origin}/search/`, { waitUntil: "networkidle" });
		for (const [locale, path, label] of [
			["en", "/en/search/", "Search articles"],
			["ja", "/ja/search/", "記事を検索"],
			["zh-CN", "/search/", "搜索文章"],
		] as const) {
			const link = page.locator(`#navbar [data-lang-switcher] a[data-lang-target="${locale}"]`);
			await expect(link).toHaveAttribute("href", `${base}${path}`);
			await expect(link).toHaveAttribute("data-lang-exact", "true");
			await link.click();
			await expect(page).toHaveURL(`${origin}${path}`);
			await expect(page.getByRole("searchbox", { name: label })).toBeVisible();
		}
	});
	test(`searches visible English article titles ${name}`, async ({ browser }, info) => {
		const testOrigin = name === "root"
			? process.env.ALNILAM_TEST_ROOT_URL ?? ROOT
			: process.env.ALNILAM_TEST_NESTED_URL ?? NESTED;
		const base = new URL(testOrigin).pathname.replace(/\/$/, "");
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			const response = await page.goto(`${testOrigin}/en/`, { waitUntil: "networkidle" });
			expect(response?.status()).toBe(200);
			const input = await openSearch(page, "mobile");
			await input.click();
			await input.fill("Organize posts with tags and archives");
			const result = page.locator("#search-panel").getByRole("link").filter({ hasText: "Organize posts with tags and archives" }).first();
			await expect(result).toBeVisible({ timeout: 15_000 });
			await expect(result).toHaveAttribute("href", `${base}/en/posts/organize-your-blog/`);
			await info.attach(`pagefind-title-${name}-390x844.png`, {
				body: await page.screenshot({ animations: "disabled" }),
				contentType: "image/png",
			});
			await result.click();
			await expect(page).toHaveURL(`${testOrigin}/en/posts/organize-your-blog/`);
		} finally {
			await context.close();
		}
	});

	test(`localized search routes use the current language and deployment base ${name}`, async ({ page }) => {
		const base = new URL(origin).pathname.replace(/\/$/, "");
		for (const [prefix, label, query, expected] of [
			["", "搜索文章", "用分类、标签和归档整理博客", "/posts/organize-your-blog/"],
			["/en", "Search articles", "Organize posts with tags and archives", "/en/posts/organize-your-blog/"],
			["/ja", "記事を検索", "カテゴリとタグで記事を整理する", "/ja/posts/"],
		] as const) {
			await page.goto(`${origin}${prefix}/search/`, { waitUntil: "networkidle" });
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
			await page.getByRole("searchbox", { name: label }).fill(query);
			const results = page.locator("[data-search-results]").getByRole("link");
			await expect(results.first()).toBeVisible({ timeout: 15_000 });
			const hrefs = await results.evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
			expect(hrefs.some((href) => href.includes(`${base}${expected}`))).toBe(true);
			expect(hrefs.every((href) => href.startsWith(`${base}${prefix}/posts/`))).toBe(true);
			const firstHref = await results.first().getAttribute("href");
			await results.first().click();
			await expect(page).toHaveURL(new RegExp(firstHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
		}
	});

	test(`posts pagination reaches page 2 and back ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });

		await expect(page.locator(".m3-blog-postcard")).toHaveCount(5);
		// The published count is content, not contract. Read the last page from
		// page 1 and require page 2 to agree with it instead of pinning a number
		// that rots as soon as a Guide is added or removed.
		const firstPage = await page.locator("main").innerText();
		const total = Number(/第\s*1\s*\/\s*(\d+)\s*页/.exec(firstPage)?.[1] ?? NaN);
		expect(Number.isInteger(total) && total >= 2, `page 1 announces ${total} pages`).toBe(true);
		// The mobile pagination block precedes the desktop one in the DOM but is
		// hidden at this viewport; only click a visible control.
		const page2 = page.locator('a[href$="/posts/2/"]').filter({ visible: true }).first();
		await expect(page2).toBeVisible();
		await page2.click();
		await expect(page).toHaveURL(new RegExp("/posts/2/?$"));
		await expect(page.locator("main")).toContainText(`第 2/${total} 页`);
		await expect(page.locator(".m3-blog-postcard").first()).toBeVisible();
		// Back to page 1 via the visible pagination control.
		const page1 = page.locator('a[href$="/posts/"]').filter({ visible: true }).first();
		await page1.click();
		await expect(page).toHaveURL(new RegExp("/posts/?$"));
		await context.close();
	});

	for (const { prefix, locale, mode, query } of [
		{ prefix: "", locale: "zh-CN", mode: "desktop", query: "归档按发布日期" },
		{ prefix: "/en", locale: "en", mode: "desktop", query: "narrower topics" },
		{ prefix: "/ja", locale: "ja", mode: "mobile", query: "順番に読む記事" },
	] as const) {
		test(`Pagefind matches ${locale} article body text ${name}`, async ({ page }) => {
			const slug = "/posts/organize-your-blog/";
			const resultPath = new URL(`${origin}${prefix}${slug}`).pathname;
			const postsPath = new URL(`${origin}${prefix}/posts/`).pathname;
			if (mode === "mobile") await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(`${origin}${prefix}/`, { waitUntil: "networkidle" });
			const input = await openSearch(page, mode);
			await input.fill(query);
			const results = page.locator("#search-panel").getByRole("link");
			await expect(results.first()).toHaveAttribute("href", resultPath);
			const hrefs = await results.evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
			expect(new Set(hrefs).size).toBe(hrefs.length);
			for (const href of hrefs) {
				expect(href.startsWith(postsPath)).toBe(true);
				expect(href.slice(postsPath.length)).toMatch(/^[^/]+\/$/);
			}
			await results.first().click();
			await expect(page).toHaveURL(`${origin}${prefix}${slug}`);
			await expect(page.locator("html")).toHaveAttribute("lang", locale);
			await expect(page.locator(".markdown-content[data-pagefind-body]")).toContainText(query);
			await expect(page.locator("main h1")).not.toContainText(query);
			const description = await page.locator('meta[name="description"]').getAttribute("content");
			expect(description).not.toContain(query);
		});
	}

	test(`Pagefind excludes the draft note and retired English fixture ${name}`, async ({ page }) => {
		await page.goto(`${origin}/en/`, { waitUntil: "networkidle" });
		const input = await openSearch(page, "desktop");
		const panel = page.locator("#search-panel");
		const results = panel.getByRole("link");
		const status = panel.getByRole("status");
		for (const query of ["comet-locator", "unpublished note stays out"]) {
			// Reset through a known match so a previous empty response cannot satisfy this query.
			await input.fill("narrower topics");
			await expect(results.first()).toHaveAttribute("href", new URL(`${origin}/en/posts/organize-your-blog/`).pathname);
			await input.fill(query);
			await expect(status).toHaveText("No results");
			await expect(results).toHaveCount(0);
		}
	});

	for (const { width, locale, query } of [
		{ width: 1024, locale: "en", query: "Organize posts with tags and archives" },
		{ width: 1440, locale: "en", query: "Organize posts with tags and archives" },
		{ width: 1024, locale: "ja", query: "カテゴリとタグで記事を整理する" },
	]) {
		test(`desktop search keeps ${locale} navigation usable at ${width}px ${name}`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`${origin}/${locale}/`, { waitUntil: "networkidle" });
			const trigger = page.locator("#search-input-desktop-switch");
			await trigger.focus();
			await trigger.press("Enter");
			const input = page.locator("#search-input-desktop");
			await expect(input).toBeFocused();
			await expect(trigger).toHaveAttribute("aria-expanded", "true");
			await input.fill(query);
			const result = page.locator("#search-panel").getByRole("link").first();
			await expect(result).toBeVisible({ timeout: 15_000 });
			await expect(result).toHaveAttribute("href", new URL(`${origin}/${locale}/posts/organize-your-blog/`).pathname);
			const capsule = page.locator(".top-app-bar__search-shell");
			await capsule.evaluate(async (element) => {
				await Promise.all(element.getAnimations().map((animation) => animation.finished));
			});

			// The whole capsule (including the icon) must clear the nav, and
			// each link must receive pointer hits near both edges of its hit box.
			await expect(page.locator('#main-navigation [data-nav-key="series"]')).toBeVisible();
			await expect.poll(() => page.locator("#main-navigation").evaluate((nav) => {
				const capsule = document.querySelector(".top-app-bar__search-shell")!.getBoundingClientRect();
				const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>(":scope > a"));
				return {
					overlap: nav.getBoundingClientRect().right > capsule.left,
					obscured: links.filter((link) => {
						const { left, right, top, height } = link.getBoundingClientRect();
						const y = top + height / 2;
						return [left + 1, right - 1].some((x) => !link.contains(document.elementFromPoint(x, y)));
					}).map((link) => link.textContent?.trim()),
				};
			})).toEqual({ overlap: false, obscured: [] });

			await input.press("Escape");
			await expect(trigger).toBeFocused();
			await expect(trigger).toHaveAttribute("aria-expanded", "false");
			await expect(page.locator("#search-panel")).toBeHidden();
		});
	}

	test(`pagefind returns the visible English title ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		const base = new URL(origin).pathname.replace(/\/$/, "");
		await page.goto(`${origin}/en/`, { waitUntil: "networkidle" });
		const input = await openSearch(page, "desktop");
		const href = await searchAndClickFirstResult(page, input, "Organize posts with tags and archives");
		expect(href).toBe(`${base}/en/posts/organize-your-blog/`);
		await expect(page.locator("main h1")).toHaveText("Organize posts with tags and archives");
		await context.close();
	});

	test(`Pagefind retries without a worker after a transient metadata failure ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		let metadataRequests = 0;
		await context.route("**/pagefind/pagefind-entry.json*", async (route) => {
			metadataRequests += 1;
			if (metadataRequests === 1) {
				await route.fulfill({ status: 502, body: "temporary metadata failure" });
				return;
			}
			await route.continue();
		});
		const page = await context.newPage();
		const base = new URL(origin).pathname.replace(/\/$/, "");
		await page.goto(`${origin}/en/`, { waitUntil: "networkidle" });
		const input = await openSearch(page, "desktop");
		const href = await searchAndClickFirstResult(page, input, "Organize posts with tags and archives");
		expect(metadataRequests).toBeGreaterThanOrEqual(2);
		expect(href).toBe(`${base}/en/posts/organize-your-blog/`);
		await context.close();
	});

	test(`Pagefind reports unavailable indexes instead of no results ${name}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		await context.route("**/pagefind/pagefind-entry.json*", async (route) => {
			await route.fulfill({ status: 404, body: "missing index" });
		});
		const page = await context.newPage();
		await page.goto(`${origin}/en/`, { waitUntil: "networkidle" });
		const input = await openSearch(page, "desktop");
		await input.fill("Organize posts with tags and archives");
		const panel = page.locator("#search-panel");
		await expect(panel.getByRole("status")).toHaveText("Search is temporarily unavailable. Please try again.", { timeout: 15_000 });
		await expect(panel.getByText("No results", { exact: true })).toHaveCount(0);
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
