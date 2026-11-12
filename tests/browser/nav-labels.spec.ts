import { expect, test } from "@playwright/test";

/**
 * Header/drawer accessible names must follow the page language. They used to be
 * hardcoded English ("Menu", "Display Settings", "Light/Dark Mode", "Search
 * Panel"), so screen-reader users on zh-CN/ja pages heard English labels on
 * every page. The navigation landmark is selected by its stable `#main-navigation`
 * id in the shared browser contracts, so its name may follow the page language.
 */

const ROOT = "http://127.0.0.1:4323";

const cases = [
	{
		name: "default zh-CN",
		path: "/posts/hello-alnilam/",
		labels: { menu: "菜单", search: "搜索", theme: "亮色/暗色" },
	},
	{
		name: "en",
		path: "/en/posts/hello-alnilam/",
		labels: { menu: "Menu", search: "Search", theme: "Light/Dark" },
	},
	{
		name: "ja",
		path: "/ja/",
		labels: { menu: "メニュー", search: "検索", theme: "ライト/ダーク" },
	},
];

for (const { name, path, labels } of cases) {
	test(`accessible names follow the page language (${name})`, async ({ page }) => {
		await page.goto(`${ROOT}${path}`, { waitUntil: "networkidle" });
		await expect(page.locator("#nav-drawer-switch")).toHaveAttribute("aria-label", labels.menu);
		await expect(page.locator("#search-switch")).toHaveAttribute("aria-label", labels.search);
		await expect(page.locator("#scheme-switch")).toHaveAttribute("aria-label", labels.theme);
	});
}

test("accessible names follow a client-side language switch", async ({ page }) => {
	await page.goto(`${ROOT}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
	await expect(page.locator("#nav-drawer-switch")).toHaveAttribute("aria-label", "菜单");
	await expect(page.locator("#search-switch")).toHaveAttribute("aria-label", "搜索");
	await page.locator('#navbar [data-lang-switcher] a[data-lang-target="en"]').click();
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
	await expect(page.locator("#nav-drawer-switch")).toHaveAttribute("aria-label", "Menu");
	await expect(page.locator("#search-switch")).toHaveAttribute("aria-label", "Search");
	await expect(page.locator("#scheme-switch")).toHaveAttribute("aria-label", "Light/Dark");
});
