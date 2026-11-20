import { expect, test, type Page } from "@playwright/test";

/**
 * Consent gate contract (GH Issue #92).
 * `consent.mode: off` ships zero gate DOM/JS and zero third-party requests.
 * `consent.mode: basic` (consent-site fixture: GA4 + AdSense enabled) shows a
 * first-party banner, persists per-category choices, and re-shows on reopen.
 * Until the GA4/AdSense loader slices land, no third-party request may occur
 * in any state — the fixture routes fail any such request loudly.
 */

const ROOT = "http://127.0.0.1:4327";
const NESTED = "http://127.0.0.1:4328/ALNILAM";
const OFF_ROOT = "http://127.0.0.1:4323";
const OFF_NESTED = "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/posts/consent-fixture/";

const STORAGE_KEY = "alnilam-consent:v1";
const GATE_SEL = "#alnilam-consent-gate";
const THIRD_PARTY_HOSTS = /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net|gstatic\.com/;

const deployments = [
  ["root", ROOT],
  ["nested", NESTED],
] as const;

const offDeployments = [
  ["root", OFF_ROOT],
  ["nested", OFF_NESTED],
] as const;

function trackThirdParty(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (req) => {
    if (THIRD_PARTY_HOSTS.test(req.url())) urls.push(req.url());
  });
  return urls;
}

for (const [name, origin] of offDeployments) {
  test(`consent off ships zero gate DOM, storage or third-party requests ${name}`, async ({ page }) => {
    const thirdParty = trackThirdParty(page);
    await page.goto(`${origin}/posts/hello-alnilam/`, { waitUntil: "networkidle" });
    await expect(page.locator(GATE_SEL)).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });
    await expect(page.locator(GATE_SEL)).toHaveCount(0);
    expect(thirdParty).toEqual([]);
  });
}

if (process.env.CONSENT_FIXTURE === "1") {
for (const [name, origin] of deployments) {
  test(`basic consent banner records per-category choices ${name}`, async ({ page }) => {
    const thirdParty = trackThirdParty(page);
    await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });

    const gate = page.locator(GATE_SEL);
    await expect(gate).toBeVisible();
    const rows = gate.locator(".alnilam-consent-row");
    await expect(rows).toHaveCount(2);
    const analyticsRow = gate.locator('.alnilam-consent-row[data-category="analytics"]');
    const adsRow = gate.locator('.alnilam-consent-row[data-category="ads"]');
    await expect(analyticsRow).toBeVisible();
    await expect(adsRow).toBeVisible();

    // Article content stays readable under the overlay (no content lock).
    await expect(page.locator(".markdown-content, .custom-md").first()).toBeVisible();

    await analyticsRow.locator('button[data-action="allow"]').click();
    await adsRow.locator('button[data-action="deny"]').click();
    await expect(gate).toBeHidden();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      JSON.stringify({ analytics: true, ads: false }),
    );
    const requestsAtGrant = thirdParty.length;
    expect(
      await page.evaluate(
        () => document.querySelectorAll("script[data-ga4-loader]").length,
      ),
    ).toBe(1);

    // Choices persist across a reload; the banner stays hidden.
    await page.reload({ waitUntil: "networkidle" });
    await expect(gate).toBeHidden();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      JSON.stringify({ analytics: true, ads: false }),
    );
    expect(
      await page.evaluate(
        () => document.querySelectorAll("script[data-ga4-loader]").length,
      ),
    ).toBe(1);

    // Reopen (withdrawal entry point) resets decisions and re-shows the banner.
    const requestsAtRevoke = thirdParty.length;
    await page.evaluate(() => window.dispatchEvent(new Event("alnilam-consent:open")));
    await expect(gate).toBeVisible();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      JSON.stringify({ analytics: null, ads: null }),
    );
    // Revocation removes the loader flags and nothing new is requested.
    await expect
      .poll(() =>
        page.evaluate(
          () => document.querySelectorAll("script[data-ga4-loader]").length,
        ),
      )
      .toBe(0);
    expect(thirdParty.length).toBe(requestsAtRevoke);
  });

  test(`denied-only choice blocks and banner hides ${name}`, async ({ page }) => {
    const thirdParty = trackThirdParty(page);
    await page.goto(`${origin}${ARTICLE}`, { waitUntil: "networkidle" });
    const gate = page.locator(GATE_SEL);
    const adsRow = gate.locator('.alnilam-consent-row[data-category="ads"]');
    const analyticsRow = gate.locator('.alnilam-consent-row[data-category="analytics"]');
    await adsRow.locator('button[data-action="deny"]').click();
    await analyticsRow.locator('button[data-action="deny"]').click();
    await expect(gate).toBeHidden();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      JSON.stringify({ analytics: false, ads: false }),
    );
    // A denied-only state must not load any third-party script on navigation.
    await page.goto(`${origin}/posts/`, { waitUntil: "networkidle" });
    await page.goBack();
    await expect(page.locator(GATE_SEL)).toBeHidden();
    expect(thirdParty).toEqual([]);
  });
}
}
