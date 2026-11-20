import { expect, test } from "@playwright/test";

/**
 * Float panels (search, display settings) are toggled by a CSS class. Closed
 * panels used to stay in the accessibility tree and the tab order (`opacity: 0`
 * only), and the toggles exposed no expanded state, so keyboard and
 * screen-reader users could reach invisible controls and never heard whether
 * the panel was open.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const ROUTE = "/posts/hello-alnilam/";

for (const origin of ORIGINS) {
	const label = new URL(origin).pathname;

	test(`closed search panel is hidden from focus and AT ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const state = await page.evaluate(() => {
				const input = document.querySelector<HTMLInputElement>("#search-panel input");
				input?.focus();
				return {
					closed: document.querySelector("#search-panel")?.classList.contains("float-panel-closed"),
					focused: document.activeElement === input,
					visible: input?.checkVisibility?.({ visibilityProperty: true }) ?? null,
					visibility: getComputedStyle(document.querySelector("#search-panel")!).visibility,
				};
			});
			expect(state.closed).toBe(true);
			expect(state.visible).toBe(false);
			expect(state.visibility).toBe("hidden");
			expect(state.focused).toBe(false);
		} finally {
			await context.close();
		}
	});

	test(`search toggle exposes expanded state ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const toggle = page.locator("#search-switch");
			await expect(toggle).toHaveAttribute("aria-controls", "search-panel");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await expect(page.locator("#search-panel")).not.toHaveClass(/float-panel-closed/);
			await page.keyboard.press("Escape");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(page.locator("#search-panel")).toHaveClass(/float-panel-closed/);
			await expect(toggle).toBeFocused();
		} finally {
			await context.close();
		}
	});

	test(`outside click closes the panel and resets the toggle ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const toggle = page.locator("#search-switch");
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			// A click whose target is outside the panel and the toggle closes it.
			await page.evaluate(() => document.body.click());
			await expect(page.locator("#search-panel")).toHaveClass(/float-panel-closed/);
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
		} finally {
			await context.close();
		}
	});
}
