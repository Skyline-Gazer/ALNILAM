import { expect, test, type Page } from "@playwright/test";

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

type Theme = "dark" | "light";

const basePath = (origin: string) => new URL(origin).pathname.replace(/\/$/, "");

async function selectTheme(page: Page, theme: Theme) {
  await page.locator(`[data-theme-choice="${theme}"]`).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
}

async function assertListGeometry(page: Page, width: number) {
  const cards = page.locator('[data-post-card][data-cover="true"]');
  await expect(cards.first()).toBeVisible();
  const first = cards.first();
  const content = first.locator(".post-card__content");
  const cover = first.locator(".post-card__cover");

  const contentBox = await content.boundingBox();
  const coverBox = await cover.boundingBox();
  expect(contentBox).not.toBeNull();
  expect(coverBox).not.toBeNull();

  if (width >= 760) {
    expect(coverBox!.x).toBeGreaterThan(contentBox!.x);
    const cardBox = await first.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(coverBox!.width / cardBox!.width).toBeGreaterThanOrEqual(0.25);
    expect(coverBox!.width / cardBox!.width).toBeLessThanOrEqual(0.31);
  } else {
    expect(coverBox!.y).toBeLessThan(contentBox!.y);
  }
}

test("root and nested-base pages navigate, theme, and search", async ({ browser }) => {
  const results: Record<string, unknown>[] = [];
  for (const [name, origin, width, height] of [
    ["root", ROOT, 1440, 1000],
    ["nested", NESTED, 1440, 1000],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    try {
      await page.goto(`${origin}/`, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".home-hero")).toBeVisible();
      await expect(page.locator(".post-card").first()).toBeVisible();
      await selectTheme(page, "light");
      await page.screenshot({ path: `browser-results/${name}-desktop-light.png`, fullPage: true });
      await selectTheme(page, "dark");
      await page.screenshot({ path: `browser-results/${name}-desktop-dark.png`, fullPage: true });
      await assertListGeometry(page, width);
      const firstPost = page.locator("[data-post-card] h2 a").first();
      const href = await firstPost.getAttribute("href");
      expect(href?.startsWith(`${basePath(origin)}/`)).toBeTruthy();
      await firstPost.click();
      await expect(page.locator(".article-view")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".prose-post ol").first()).toHaveCSS("list-style-type", "decimal");
      await page.locator(".prose-post").evaluate((root) => {
        root.insertAdjacentHTML(
          "beforeend",
          "<table><thead><tr><th>Column</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>",
        );
      });
      await expect(page.locator(".prose-post th").first()).toHaveCSS("border-top-style", "solid");
      await page.screenshot({ path: `browser-results/${name}-article-dark.png`, fullPage: true });
      await selectTheme(page, "light");
      await page.screenshot({ path: `browser-results/${name}-article-light.png`, fullPage: true });
      await page.getByRole("link", { name: "文章" }).first().click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.getByRole("radio", { name: "浅色" })).toBeChecked();
      await page.goBack({ waitUntil: "networkidle" });
      await expect(page.locator(".article-view")).toBeVisible();
      await page.getByRole("link", { name: "← 返回全部文章" }).click();
      await expect(page.locator(".post-list")).toBeVisible();
      await page.keyboard.press("Home");
      await page.keyboard.press("Tab");
      await expect(page.locator(".skip-link")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator(".brand")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator(".primary-nav a").first()).toBeFocused();
      await page.getByRole("button", { name: "搜索" }).click();
      const search = page.getByRole("dialog", { name: "站内搜索" });
      await search.getByRole("searchbox").fill("ALNILAM");
      await expect(search.locator("a[href]").first()).toBeVisible();
      const resultHref = await search.locator("a[href]").first().getAttribute("href");
      expect(resultHref?.startsWith(`${basePath(origin)}/`)).toBeTruthy();
      await search.locator("a[href]").first().click();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveURL(new URL(resultHref!, origin).href);
      results.push({ name, href, resultHref, errors, status: "PASS" });
    } catch (error) {
      await page.screenshot({ path: `browser-results/${name}-failure.png`, fullPage: true });
      results.push({ name, errors, status: "FAIL", error: String(error) });
      throw error;
    } finally {
      await context.close();
      expect(errors, `${name} page errors`).toEqual([]);
    }
  }
  await test.info().attach("browser-results.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
});

test("mobile cards place the cover before content", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  try {
    await page.goto(`${ROOT}/`, { waitUntil: "networkidle" });
    await assertListGeometry(page, 390);
    await page.screenshot({ path: "browser-results/root-mobile-dark.png", fullPage: true });
    await selectTheme(page, "light");
    await page.screenshot({ path: "browser-results/root-mobile-light.png", fullPage: true });
    await page.locator("[data-post-card] h2 a").first().click();
    await expect(page.locator(".article-view")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await page.screenshot({ path: "browser-results/root-mobile-article.png", fullPage: true });
    await page.getByRole("link", { name: "← 返回全部文章" }).click();
    await expect(page.locator(".post-list")).toBeVisible();
  } finally {
    await context.close();
    expect(errors, "mobile page errors").toEqual([]);
  }
});
