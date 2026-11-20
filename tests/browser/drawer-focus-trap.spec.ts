import { test, expect } from "@playwright/test";

/**
 * The mobile drawer declares `role="dialog" aria-modal="true"`, so keyboard
 * focus must stay inside it while it is open. Before this contract, Tab walked
 * out of the panel and into the page hidden behind the scrim.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const ROUTE = "/posts/hello-alnilam/";

for (const origin of ORIGINS) {
	const label = new URL(origin).pathname;

	test(`drawer keeps keyboard focus inside while open ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const toggle = page.locator("#nav-drawer-switch");
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");

			for (let step = 0; step < 12; step += 1) {
				await page.keyboard.press("Tab");
				expect(
					await page.evaluate(() => Boolean(document.activeElement?.closest(".site-drawer"))),
					`Tab step ${step + 1} must stay inside the drawer`,
				).toBe(true);
			}
			for (let step = 0; step < 4; step += 1) {
				await page.keyboard.press("Shift+Tab");
				expect(
					await page.evaluate(() => Boolean(document.activeElement?.closest(".site-drawer"))),
					`Shift+Tab step ${step + 1} must stay inside the drawer`,
				).toBe(true);
			}
		} finally {
			await context.close();
		}
	});

	test(`scrim click closes the drawer and returns focus ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const toggle = page.locator("#nav-drawer-switch");
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			// The panel is 85vw (≈331px) wide; click the scrim between it and the right edge.
			await page.mouse.click(350, 420);
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(toggle).toBeFocused();
			await expect(page.locator(".site-drawer__nav a").first()).toBeHidden();
		} finally {
			await context.close();
		}
	});
}
