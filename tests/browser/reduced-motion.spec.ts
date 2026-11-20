import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * `prefers-reduced-motion: reduce` must change how the page moves, never what
 * it can do. Navigation, the drawer, the search panel and the theme switch keep
 * their behaviour, and the transition rules collapse to their end state instead
 * of animating.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const ROUTE = "/posts/hello-alnilam/";

async function transitionDurations(page: Page, selectors: string[]) {
	return page.evaluate((targets) =>
		targets.map((selector) => {
			const element = document.querySelector(selector);
			return element ? getComputedStyle(element).transitionDuration : "";
		}), selectors);
}

for (const origin of ORIGINS) {
	const label = new URL(origin).pathname;

	test(`reduced motion keeps the drawer and search usable ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });

			const toggle = page.locator("#nav-drawer-switch");
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await expect(page.locator("#site-drawer-panel a, #site-drawer-panel button").first()).toBeFocused();
			await page.keyboard.press("Escape");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(toggle).toBeFocused();

			const searchToggle = page.locator("#search-switch");
			await searchToggle.click();
			await expect(searchToggle).toHaveAttribute("aria-expanded", "true");
			await page.locator("#search-panel input").fill("ALNILAM");
			await expect(page.locator("#search-panel a.m3-blog-searchpanel__item").first()).toBeVisible();

			for (const duration of await transitionDurations(page, ["#navbar", "#site-drawer-panel", "#search-panel"])) {
				expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.05);
			}
		} finally {
			await context.close();
		}
	});

	test(`reduced motion keeps navigation and the theme switch usable ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });

			await page.locator("#main-navigation").getByRole("link", { name: /^(文章|Posts|記事)$/ }).click();
			await expect(page.locator("#post-list")).toBeVisible();

			await page.locator("#scheme-switch").click();
			await page.locator(".m3-menu .m3-menu-item").first().click();
			await expect(page.locator("html")).not.toHaveClass(/dark/);

			for (const duration of await transitionDurations(page, ["#navbar", "#main-navigation", "#post-list"])) {
				expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.05);
			}
		} finally {
			await context.close();
		}
	});
}
