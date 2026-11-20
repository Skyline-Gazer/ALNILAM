import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile drawer must not lose a tap that lands before the island hydrates.
 *
 * `Layout.astro` attaches the `#nav-drawer-switch` handler from an inline module
 * script (runs before DOMContentLoaded), while the drawer itself listens for
 * `site-drawer:toggle` only after the Svelte island mounts. A tap inside that
 * window used to be dropped: the drawer never opened and `aria-expanded` stayed
 * `false`.
 *
 * The island chunk is delayed on purpose so the test exercises the real
 * pre-hydration window deterministically instead of racing a fast machine.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const ROUTE = "/posts/hello-alnilam/";

function delay(milliseconds: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, milliseconds);
	return promise;
}

async function delayDrawerChunk(page: Page, milliseconds: number) {
	await page.route(/SiteNavigationDrawer\.[^/]+\.js$/, async (route) => {
		await delay(milliseconds);
		await route.continue();
	});
}

for (const origin of ORIGINS) {
const label = new URL(origin).pathname;

test(`drawer opens when the switch is tapped before hydration ${label}`, async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
	const page = await context.newPage();
	await delayDrawerChunk(page, 1_500);
	try {
		await page.goto(`${origin}${ROUTE}`, { waitUntil: "domcontentloaded" });
		const toggle = page.locator("#nav-drawer-switch");
		await expect(toggle).toBeVisible();
		// Server-rendered disclosure semantics exist before hydration.
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await expect(toggle).toHaveAttribute("aria-controls", "site-drawer-panel");
		// No hydration wait on purpose: this click must be replayed once the island mounts.
		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 8_000 });
		await expect(page.locator(".site-drawer__nav a").first()).toBeVisible();
		// Keyboard users get the same focus move as a post-hydration open.
		await expect(page.locator(".site-drawer__nav a").first()).toBeFocused();
	} finally {
		await context.close();
	}
});

test(`drawer toggle still closes after hydration ${label}`, async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
	const page = await context.newPage();
	try {
		await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
		const toggle = page.locator("#nav-drawer-switch");
		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await expect(page.locator(".site-drawer__nav a").first()).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await expect(page.locator(".site-drawer__nav a").first()).toBeHidden();
	} finally {
		await context.close();
	}
});
}
