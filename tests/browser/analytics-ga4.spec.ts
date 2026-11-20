import { expect, test, type Page } from "@playwright/test";

/**
 * GA4 runtime contract (GH Issue #91), mock-based (no real Google endpoints).
 *
 * ga4-site fixture (GA4_FIXTURE=1): `consent.mode: off` + GA4 enabled — the
 * tag loads with no consent interaction, exactly once per document, with
 * exactly one page_view per completed route view (send_page_view disabled;
 * this runtime is the single owner). consent-site fixture (CONSENT_FIXTURE=1):
 * `consent.mode: basic` — no Google request before an analytics grant, one
 * loader after grant, nothing after revocation. Disabled demo pages ship
 * zero tag/network and need no fixture servers, so they always run. This
 * gating matches the comments.spec contract: the trusted gate harness runs
 * from the target-owned tree, which may not serve candidate fixture ports.
 */

const GA_ROOT = "http://127.0.0.1:4329";
const GA_NESTED = "http://127.0.0.1:4330/ALNILAM";
const CONSENT_ROOT = "http://127.0.0.1:4327";
const CONSENT_NESTED = "http://127.0.0.1:4328/ALNILAM";
const ARTICLE = "/posts/ga4-fixture/";

const GATE_SEL = "#alnilam-consent-gate";

async function pageViewEntries(page: Page) {
	const entries = await page.evaluate(() =>
		(window.dataLayer ?? []).filter(
			(entry) =>
				Array.isArray(entry) && entry[0] === "event" && entry[1] === "page_view",
		),
	);
	return entries as ["event", "page_view", { page_location?: string }][];
}

function countPageViews(page: Page): Promise<number> {
	return page.evaluate(
		() =>
			(window.dataLayer ?? []).filter(
				(entry) =>
					Array.isArray(entry) &&
					entry[0] === "event" &&
					entry[1] === "page_view",
			).length,
	);
}

async function expectPageViews(page: Page, count: number) {
	await expect.poll(() => countPageViews(page), { timeout: 10_000 }).toBe(count);
}

function expectLoaderLoads(page: Page, count: number) {
	return expect
		.poll(
			() =>
				page.evaluate(
					() => document.querySelectorAll("script[data-ga4-loader]").length,
				),
			{ timeout: 10_000 },
		)
		.toBe(count);
}

async function clickNavLink(page: Page, origin: string, path: string) {
	await Promise.all([
		page.waitForURL(`${origin}${path}`),
		page.locator("header").getByRole("link", { name: /文章|Posts/ }).first().click(),
	]);
}

test(`ga4 disabled site never loads the tag root`, async ({ page }) => {
	const demo = "http://127.0.0.1:4323";
	const requests: string[] = [];
	page.on("request", (req) => {
		if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) requests.push(req.url());
	});
	await page.goto(`${demo}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
	expect(await page.evaluate(() => document.documentElement.dataset.ga4Ready ?? "absent")).toBe("absent");
	expect(requests).toEqual([]);
});

test(`ga4 disabled site never loads the tag nested`, async ({ page }) => {
	const demo = "http://127.0.0.1:4324/ALNILAM";
	const requests: string[] = [];
	page.on("request", (req) => {
		if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) requests.push(req.url());
	});
	await page.goto(`${demo}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
	expect(await page.evaluate(() => document.documentElement.dataset.ga4Ready ?? "absent")).toBe("absent");
	expect(requests).toEqual([]);
});

if (process.env.GA4_FIXTURE === "1") {
	for (const [name, origin] of [
		["root", GA_ROOT],
		["nested", GA_NESTED],
	] as const) {
		test(`ga4 loads once with one page_view per view ${name}`, async ({ page }) => {
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await expectPageViews(page, 1);
			await expectLoaderLoads(page, 1);

			const basePath = new URL(origin).pathname.replace(/\/$/, "");
			// Simulated Swup route change (URL updated, then swup:page:view):
			// still exactly one loader and exactly one new page_view.
			await page.evaluate((base) => {
				history.pushState({}, "", `${base}/posts/`);
				window.dispatchEvent(new Event("swup:page:view"));
			}, basePath);
			await expectPageViews(page, 2);
			await expectLoaderLoads(page, 1);
			await page.evaluate((base) => {
				history.pushState({}, "", `${base}/posts/en/ga4-fixture/`);
				window.dispatchEvent(new Event("swup:page:view"));
			}, basePath);
			await expectPageViews(page, 3);
			await expectLoaderLoads(page, 1);

			// Simulated back navigation is still exactly one page_view.
			await page.evaluate(() => {
				history.back();
				window.dispatchEvent(new Event("swup:page:view"));
			});
			await expectPageViews(page, 4);
			await expectLoaderLoads(page, 1);

			// Correct page location including the deployment base.
			const entries = await pageViewEntries(page);
			const locations = entries.map((entry) => entry[2]?.page_location ?? "");
			for (const location of locations) {
				expect(location.startsWith(origin)).toBe(true);
			}
			expect(locations[1]).toContain(`${basePath}/posts/`);
			expect(locations[2]).toContain(`${basePath}/posts/en/ga4-fixture/`);

			// Exactly one official gtag config and send_page_view disabled.
			const configs = await page.evaluate(() =>
				(window.dataLayer ?? []).filter(
					(entry) => Array.isArray(entry) && entry[0] === "config",
				),
			);
			expect(configs).toHaveLength(1);
			const configOptions = configs[0][2];
			expect(
				typeof configOptions === "object" &&
					configOptions !== null &&
					"send_page_view" in configOptions &&
					configOptions.send_page_view === false,
			).toBe(true);
		});

		test(`ga4 full-document navigations re-emit exactly one view ${name}`, async ({ page }) => {
			await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
			await expectPageViews(page, 1);
			await Promise.all([
				page.waitForURL(`${origin}/posts/`),
				page.locator("header").getByRole("link", { name: /文章|Posts/ }).first().click(),
			]);
			await expectPageViews(page, 1);
			await expectLoaderLoads(page, 1);
		});
	}
}

if (process.env.CONSENT_FIXTURE === "1") {
	for (const [name, origin] of [
		["root", CONSENT_ROOT],
		["nested", CONSENT_NESTED],
	] as const) {
		test(`ga4 under basic consent waits for grant and stops on revoke ${name}`, async ({ page }) => {
			const article = "/posts/consent-fixture/";
			await page.goto(`${origin}${article}`, { waitUntil: "networkidle" });

			const gate = page.locator(GATE_SEL);
			await expect(gate).toBeVisible();
			// No loader, no dataLayer config before any consent decision.
			await expect(page.locator("script[data-ga4-loader]")).toHaveCount(0);
			await expectPageViews(page, 0);

			// Grant only analytics: loader starts and emits the current view once.
			await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="allow"]').click();
			await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="deny"]').click();
			await expectLoaderLoads(page, 1);
			await expectPageViews(page, 1);

			// Full-document navigation with granted analytics: fresh document
			// re-initializes the loader exactly once with exactly one view.
			await clickNavLink(page, origin, "/posts/");
			await expectPageViews(page, 1);
			await expectLoaderLoads(page, 1);

			// Reopen and reset analytics: flags removed, nothing new afterwards.
			await page.evaluate(() => window.dispatchEvent(new Event("alnilam-consent:open")));
			await expect(gate).toBeVisible();
			await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="deny"]').click();
			await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="deny"]').click();
			await expect(gate).toBeHidden();
			await page.goto(`${origin}${article}`, { waitUntil: "networkidle" });
			await expectPageViews(page, 0);
			await expectLoaderLoads(page, 0);
		});
	}
}
