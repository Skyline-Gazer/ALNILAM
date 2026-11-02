import { expect, test, type Page } from "@playwright/test";

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

type Theme = "dark" | "light";

const basePath = (origin: string) => new URL(origin).pathname.replace(/\/$/, "");

async function selectTheme(page: Page, theme: Theme) {
  await page.locator(`[data-theme-choice="${theme}"]`).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
}

async function captureScreenshot(page: Page, path: string) {
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
    timeout: 5_000,
  });
  await test.info().attach(path.split("/").pop()!, {path, contentType: "image/png"});
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

for (const [name, origin, width, height] of [
  ["root", ROOT, 1440, 1000],
  ["nested", NESTED, 1440, 1000],
] as const) {
  test(`${name}-base pages navigate, theme, and search`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    try {
      await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".home-hero")).toBeVisible();
      await expect(page.locator(".post-card").first()).toBeVisible();
      await selectTheme(page, "light");
      await captureScreenshot(page, `browser-results/${name}-desktop-light.png`);
      await selectTheme(page, "dark");
      await captureScreenshot(page, `browser-results/${name}-desktop-dark.png`);
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
      await captureScreenshot(page, `browser-results/${name}-article-dark.png`);
      await selectTheme(page, "light");
      await captureScreenshot(page, `browser-results/${name}-article-light.png`);
      await page.getByRole("link", { name: "文章" }).first().click();
      await expect(page.locator(".post-list")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.getByRole("radio", { name: "浅色" })).toBeChecked();
      await page.goBack({ waitUntil: "domcontentloaded" });
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
      expect(errors, `${name} page errors`).toEqual([]);
      await test.info().attach(`${name}-browser-result.json`, {
        body: JSON.stringify({ name, href, resultHref, errors, status: "PASS" }, null, 2),
        contentType: "application/json",
      });
    } catch (error) {
      try {
        await captureScreenshot(page, `browser-results/${name}-failure.png`);
      } catch {
        // Preserve the original failure when the test timeout has already closed the page.
      }
      await test.info().attach(`${name}-browser-result.json`, {
        body: JSON.stringify({ name, errors, status: "FAIL", error: String(error) }, null, 2),
        contentType: "application/json",
      });
      throw error;
    } finally {
      await context.close();
    }
  });
}

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
    await page.screenshot({ path: "browser-results/root-mobile-light.png", fullPage: true, animations: "disabled" });
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

test("search initializes once and keeps the latest result", async ({ page }) => {
  let pagefindRequests = 0;
  await page.route(/pagefind\/pagefind\.js(?:\?.*)?$/, async (route) => {
    pagefindRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.__pagefindInitCalls = 0;
        window.__pagefindOptionsCalls = 0;
        window.__pagefindQueries = [];
        export async function init() { window.__pagefindInitCalls += 1; }
        export async function options() { window.__pagefindOptionsCalls += 1; }
        export async function search(query) {
          window.__pagefindQueries.push(query);
          if (query === "first") await new Promise((resolve) => setTimeout(resolve, 500));
          return { results: [{ data: async () => ({ url: '/' + query + '/', meta: { title: query }, excerpt: query }) }] };
        }
      `,
    });
  });

  await page.goto(`${ROOT}/`, { waitUntil: "networkidle" });
  const toggle = page.getByRole("button", { name: "搜索" });
  await toggle.click();
  await expect.poll(() => pagefindRequests).toBe(1);
  await toggle.click();
  await toggle.click();

  const dialog = page.getByRole("dialog", { name: "站内搜索" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__pagefindInitCalls") ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__pagefindOptionsCalls") ?? 0)).toBe(1);

  const input = dialog.getByRole("searchbox");
  await input.fill("first");
  await expect.poll(() => page.evaluate(() => (Reflect.get(window, "__pagefindQueries") as string[] | undefined)?.includes("first"))).toBe(true);
  await input.fill("second");
  await expect(dialog.getByRole("link", { name: "second" })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(dialog.getByRole("link", { name: "second" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "first" })).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.has(window, "__rs"))).toBe(false);
});

// Synthetic content exercises the real rendered components without changing a Site.
for (const origin of [ROOT, NESTED]) for (const width of [1440, 390]) {
  test(`reading edge cases ${new URL(origin).pathname} ${width}`, async ({browser}, info) => {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: "reduce"});
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    try {
      await test.step("card layout, long titles and separate click targets", async () => {
        await page.goto(`${origin}/`, {waitUntil: "networkidle"});
        await assertListGeometry(page, width);
        const card = page.locator('[data-post-card][data-cover="true"]').first();
        const title = card.locator('h2 a');
        const articleHref = await title.getAttribute('href');
        await title.evaluate(el => { el.textContent = "LongUnbrokenTitle".repeat(12); });
        const titleBox = await title.boundingBox();
        const contentBox = await card.locator('.post-card__content').boundingBox();
        expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(contentBox!.x + contentBox!.width);
        expect(await title.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        const noCover = page.locator('[data-post-card][data-cover="false"]').first();
        await expect(noCover).toBeVisible();
        await expect(noCover.locator('.post-card__cover')).toHaveCount(0);
        const tag = card.locator('.post-card__tags a').first();
        const tagHref = await tag.getAttribute('href');
        if (width === 390) expect((await tag.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await captureScreenshot(page, info.outputPath('cards-long-title.png'));
        await tag.click();
        await expect(page).toHaveURL(new URL(tagHref!, origin).href);
        await page.goto(`${origin}/`, {waitUntil: "networkidle"});
        // The stretched title link makes blank card space clickable, without swallowing tag links.
        await page.locator('[data-post-card][data-cover="true"]').first().click({position: {x: 12, y: 12}});
        await expect(page).toHaveURL(new URL(articleHref!, origin).href);
      });
      await test.step("article long text, code, tables and embedded media", async () => {
        await page.locator('.article-header h1').evaluate(el => { el.textContent = "LongArticleTitle".repeat(12); });
        await page.locator('.prose-post').evaluate(el => {
          const paragraph = document.createElement('p');
          paragraph.textContent = "https://example.com/" + "unbrokentext".repeat(30);
          const pre = document.createElement('pre');
          const code = document.createElement("code");
          code.textContent = "long_code_token_".repeat(40);
          pre.append(code);
          const table = document.createElement('table');
          table.innerHTML = '<caption>Synthetic wide table</caption><tbody><tr>' + '<td style="white-space:nowrap">Wide table column</td>'.repeat(12) + '</tr></tbody>';
          const frame = document.createElement('iframe');
          frame.width = '1600'; frame.height = '900'; frame.title = 'Synthetic embedded media';
          frame.srcdoc = '<p>Local media fixture</p>';
          el.append(paragraph, pre, table, frame);
        });
        await expect(page.locator('.prose-post iframe')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        for (const selector of ['pre', 'table']) {
          const overflow = await page.locator(`.prose-post ${selector}`).last().evaluate(el => ({
            scrolls: el.scrollWidth > el.clientWidth, overflowX: getComputedStyle(el).overflowX,
          }));
          expect(overflow.scrolls).toBe(true);
          expect(overflow.overflowX).toBe('auto');
        }
        await captureScreenshot(page, info.outputPath('article-rich-media.png'));
      });
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
