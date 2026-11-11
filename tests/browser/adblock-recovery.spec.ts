import { expect, test, type Page } from "@playwright/test";

/**
 * Don't Kill My Ads / ad-blocking recovery contract (GH Issue #93).
 *
 * ads-site fixture: `consent.mode: off` + AdSense enabled + `recovery.mode:
 * custom` — the first-party bait probe runs after load; when the bait is
 * hidden (ad blocker simulation) a fixed, non-blocking overlay appears with
 * keyboard/Esc close, persists suppression per dismissDays, and never
 * triggers on normal loads. consent-site fixture: with ads denied the probe
 * never runs. Demo pages (recovery off) ship no probe or DOM. The two
 * recovery modes are mutually exclusive by schema.
 */

const ADS_ROOT = "http://127.0.0.1:4331";
const CONSENT_ROOT = "http://127.0.0.1:4327";
const DEMO_ROOT = "http://127.0.0.1:4323";
const ARTICLE = "/posts/ads-fixture/";

const DKMA_SEL = "#alnilam-dkma";
const DISMISS_KEY = "alnilam-dkma:dismissedAt";
const BAIT_CLASSES = "adsbox ad-banner banner-ads textads publicitas";

/** Simulate a filter list: bait elements are display:none (blocked). */
function simulateAdblocker(page: Page): void {
	page.addInitScript((classes) => {
		const style = document.createElement("style");
		style.textContent = `.${classes.split(" ").join(",.")} { display: none !important; }`;
		document.addEventListener("DOMContentLoaded", () => document.head.append(style), { once: true });
	}, BAIT_CLASSES);
}

async function expectDkmaVisible(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(
					() => !document.getElementById("alnilam-dkma")?.hidden,
				),
			{ timeout: 10_000 },
		)
		.toBe(true);
}
if (process.env.ADS_FIXTURE === "1") {
	test("ads-site with simulated blocker shows the banner once per window", async ({ page }) => {
		simulateAdblocker(page);
		await page.goto(`${ADS_ROOT}${ARTICLE}`, { waitUntil: "load" });
		await expectDkmaVisible(page);

		// Article content stays readable (no content lock) and no shifts.
		await expect(page.locator(".markdown-content, .custom-md").first()).toBeVisible();

		// Esc closes and suppresses for the configured window.
		await page.keyboard.press("Escape");
		await expect(page.locator(DKMA_SEL)).toBeHidden();
		const dismissed = await page.evaluate((key) => window.localStorage.getItem(key), DISMISS_KEY);
		expect(Number(dismissed)).toBeGreaterThan(0);

		await page.reload({ waitUntil: "load" });
		await expect
			.poll(
				() =>
					page.evaluate(
						() => document.getElementById("alnilam-dkma")?.hidden ?? true,
					),
				{ timeout: 8_000 },
			)
			.toBe(true);
	});

	test("ads-site without a blocker shows nothing", async ({ page }) => {
		await page.goto(`${ADS_ROOT}${ARTICLE}`, { waitUntil: "load" });
		await page.waitForTimeout(3_000);
		expect(await page.evaluate(() => document.getElementById("alnilam-dkma")?.hidden ?? true)).toBe(true);
	});

	test("dismissed window expiry re-allows the banner", async ({ page }) => {
		simulateAdblocker(page);
		await page.goto(`${ADS_ROOT}${ARTICLE}`, { waitUntil: "load" });
		await expectDkmaVisible(page);
		await page.keyboard.press("Escape");
		// Age the dismissal beyond the 7-day window.
		await page.evaluate(
			(key) => window.localStorage.setItem(key, String(Date.now() - 8 * 24 * 60 * 60 * 1000)),
			DISMISS_KEY,
		);
		await page.reload({ waitUntil: "load" });
		await expectDkmaVisible(page);
	});
}

if (process.env.CONSENT_FIXTURE === "1") {
	test("ads denied on the consent fixture never probes or shows", async ({ page }) => {
		simulateAdblocker(page);
		await page.goto(`${CONSENT_ROOT}/posts/consent-fixture/`, { waitUntil: "networkidle" });
		const gate = page.locator("#alnilam-consent-gate");
		await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="allow"]').click();
		await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="deny"]').click();
		await expect(gate).toBeHidden();
		await page.waitForTimeout(3_000);
		expect(await page.evaluate(() => document.getElementById("alnilam-dkma")?.hidden ?? true)).toBe(true);
		expect(await page.evaluate((key) => window.localStorage.getItem(key), DISMISS_KEY)).toBeNull();
	});
}

test("demo pages with recovery off ship no probe or banner", async ({ page }) => {
	await page.goto(`${DEMO_ROOT}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
	expect(await page.locator(DKMA_SEL).count()).toBe(0);
	await page.waitForTimeout(3_000);
	expect(await page.evaluate(() => document.getElementById("alnilam-dkma")?.hidden ?? true)).toBe(true);
});
