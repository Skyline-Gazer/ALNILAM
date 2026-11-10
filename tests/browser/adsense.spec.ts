import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * AdSense Auto Ads contract (GH Issue #90), mock-based (no real Google
 * endpoints, no ad account).
 *
 * ads-site fixture: `consent.mode: off` + AdSense enabled — the official
 * loader loads at most once per document, `ads.txt` is emitted verbatim at
 * the output root, and revocation removes everything. consent-site fixture:
 * `consent.mode: basic` — no Google request before an ads grant, one loader
 * after grant, nothing after revocation. Demo pages (everything disabled)
 * ship zero ad scripts, mounts or requests.
 */

const ADS_ROOT = "http://127.0.0.1:4331";
const ADS_NESTED = "http://127.0.0.1:4332/ALNILAM";
const CONSENT_ROOT = "http://127.0.0.1:4327";
const CONSENT_NESTED = "http://127.0.0.1:4328/ALNILAM";
const ARTICLE = "/posts/ads-fixture/";

const AD_HOSTS = /googlesyndication\.com|doubleclick\.net|googleadservices\.com/;
const GATE_SEL = "#alnilam-consent-gate";

const ADS_TXT =
	"google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0";

function countLoaderScripts(page: Page): Promise<number> {
	return page.evaluate(
		() => document.querySelectorAll("script[data-adsense-client]").length,
	);
}

async function expectLoaderScripts(page: Page, count: number) {
	await expect.poll(() => countLoaderScripts(page), { timeout: 10_000 }).toBe(count);
}

function trackAdRequests(page: Page): string[] {
	const urls: string[] = [];
	page.on("request", (req) => {
		if (AD_HOSTS.test(req.url())) urls.push(req.url());
	});
	return urls;
}

for (const [name, origin] of [
	["root", ADS_ROOT],
	["nested", ADS_NESTED],
] as const) {
	test(`adsense loads once per document and revocation stops it ${name}`, async ({ page }) => {
		const requests = trackAdRequests(page);
		await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
		await expectLoaderScripts(page, 1);
		expect(requests.some((u) => u.includes("adsbygoogle.js"))).toBe(true);

		// Simulated Swup route change: still exactly one loader, no re-injection.
		await page.evaluate(() => {
			history.pushState({}, "", "/posts/");
			window.dispatchEvent(new Event("swup:page:view"));
		});
		await expectLoaderScripts(page, 1);
		expect(
			requests.filter((u) => u.includes("adsbygoogle.js")),
		).toHaveLength(1);

		// ads.txt is emitted verbatim at the output root.
		const outRoot = name === "root"
			? path.join(process.cwd(), "dist/ads-root")
			: path.join(process.cwd(), "dist/ads-nested");
		expect(fs.readFileSync(path.join(outRoot, "ads.txt"), "utf8")).toBe(ADS_TXT);
	});

	test(`adsense disabled site ships zero ${name}`, async ({ page }) => {
		const demo = name === "root" ? "http://127.0.0.1:4323" : "http://127.0.0.1:4324/ALNILAM";
		const requests = trackAdRequests(page);
		await page.goto(`${demo}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
		expect(await page.evaluate(() => document.documentElement.dataset.adsenseReady ?? "absent")).toBe("absent");
		expect(await page.locator("#alnilam-adsense").count()).toBe(0);
		expect(requests).toEqual([]);
	});
}

for (const [name, origin] of [
	["root", CONSENT_ROOT],
	["nested", CONSENT_NESTED],
] as const) {
	test(`adsense under basic consent waits for ads grant and stops on revoke ${name}`, async ({ page }) => {
		const article = "/posts/consent-fixture/";
		const requests = trackAdRequests(page);
		await page.goto(`${origin}${article}`, { waitUntil: "networkidle" });

		const gate = page.locator(GATE_SEL);
		await expect(gate).toBeVisible();
		await expect(page.locator("script[data-adsense-client]")).toHaveCount(0);
		expect(requests).toEqual([]);

		// Grant only analytics: ads stay blocked with zero ad requests.
		await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="allow"]').click();
		await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="deny"]').click();
		await expect(gate).toBeHidden();
		await expectLoaderScripts(page, 0);
		expect(requests).toEqual([]);

		// Reopen, grant ads: loader starts exactly once.
		await page.evaluate(() => window.dispatchEvent(new Event("alnilam-consent:open")));
		await expect(gate).toBeVisible();
		await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="deny"]').click();
		await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="allow"]').click();
		await expect(gate).toBeHidden();
		await expectLoaderScripts(page, 1);
		expect(requests.some((u) => u.includes("adsbygoogle.js"))).toBe(true);

		// Revoke ads: loader removed, no further ad requests on navigation.
		const requestsAtRevoke = requests.length;
		await page.evaluate(() => window.dispatchEvent(new Event("alnilam-consent:open")));
		await expect(gate).toBeVisible();
		await gate.locator('.alnilam-consent-row[data-category="ads"] button[data-action="deny"]').click();
		await gate.locator('.alnilam-consent-row[data-category="analytics"] button[data-action="deny"]').click();
		await expect(gate).toBeHidden();
		await expectLoaderScripts(page, 0);
		await page.goto(`${origin}${article}`, { waitUntil: "networkidle" });
		await expectLoaderScripts(page, 0);
		expect(requests.length).toBe(requestsAtRevoke);
	});
}
