import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * The drawer is an `aria-modal` dialog. Before this contract, `aria-modal` was
 * only a label: the page behind stayed focusable and exposed to assistive
 * technology, so a script or a virtual cursor could reach obscured links.
 */

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const ROUTE = "/posts/hello-alnilam/";

async function openDrawer(page: Page) {
	const toggle = page.locator("#nav-drawer-switch");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	return toggle;
}

for (const origin of ORIGINS) {
	const label = new URL(origin).pathname;

	test(`open drawer makes the page behind inert ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			const toggle = await openDrawer(page);
			const isInert = (selector: string) =>
				page.evaluate((sel) => Boolean(document.querySelector(sel)?.closest("[inert]")), selector);
			expect(await isInert("#swup-container"), "main content must sit inside an inert subtree").toBe(true);
			expect(await isInert("#top-row"), "the header must sit inside an inert subtree").toBe(true);
			const backgroundReachable = await page.evaluate(() => {
				const link = document.querySelector<HTMLAnchorElement>("#swup-container a[href]");
				link?.focus();
				return document.activeElement === link;
			});
			expect(backgroundReachable, "a background link must not take focus while the modal is open").toBe(false);
			await page.keyboard.press("Escape");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			expect(await isInert("#swup-container")).toBe(false);
			expect(await isInert("#top-row")).toBe(false);
			await expect(toggle).toBeFocused();
		} finally {
			await context.close();
		}
	});

	test(`drawer links stay usable while the background is inert ${label}`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		try {
			await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle" });
			await openDrawer(page);
			const firstLink = page.locator(".site-drawer__nav a").first();
			await expect(firstLink).toBeVisible();
			const href = await firstLink.getAttribute("href");
			expect(href, "drawer links must carry a real href").toBeTruthy();
			await firstLink.click();
			await expect(page).toHaveURL(new URL(href!, `${origin}/`).href);
			expect(
				await page.evaluate(() => Boolean(document.querySelector("#swup-container")?.closest("[inert]"))),
			).toBe(false);
		} finally {
			await context.close();
		}
	});
}
