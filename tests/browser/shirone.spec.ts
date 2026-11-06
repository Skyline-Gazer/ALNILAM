import { expect, test, type Page } from "@playwright/test";

const ROOT = "http://127.0.0.1:4323";
const NESTED = "http://127.0.0.1:4324/ALNILAM";

type Theme = "dark" | "light";

const basePath = (origin: string) => new URL(origin).pathname.replace(/\/$/, "");

async function selectTheme(page: Page, theme: Theme) {
  const width = page.viewportSize()?.width ?? 1440;
  const wantDark = theme === "dark";
  const isDarkNow = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
  if (isDarkNow !== wantDark) {
    if (width >= 1024) {
      await page.locator("#scheme-switch").click();
      await page
        .locator(".m3-menu .m3-menu-item")
        .nth(theme === "light" ? 0 : 1)
        .click();
    } else {
      for (let i = 0; i < 3; i++) {
        const current = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
        const stored = await page.evaluate(() => localStorage.getItem("theme"));
        if (current === wantDark && stored === theme) break;
        await page.locator("#scheme-switch").click();
      }
    }
  }
  if (wantDark) {
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "github-dark");
  } else {
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "github-light");
  }
}

async function captureScreenshot(page: Page, path: string) {
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
    timeout: 5_000,
  });
  await test.info().attach(path.split("/").pop()!, { path, contentType: "image/png" });
}

async function assertListGeometry(page: Page, width: number) {
  const cards = page.locator(".m3-blog-postcard.m3-blog-postcard--cover");
  await expect(cards.first()).toBeVisible();
  const first = cards.first();
  const content = first.locator(".m3-blog-postcard__body");
  const cover = first.locator(".m3-blog-postcard__cover");

  const contentBox = await content.boundingBox();
  const coverBox = await cover.boundingBox();
  expect(contentBox).not.toBeNull();
  expect(coverBox).not.toBeNull();

  if (width >= 768) {
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
      await expect(page.locator("#navbar.top-app-bar")).toBeVisible();
      await expect(page.locator("#post-list .m3-blog-postcard").first()).toBeVisible();
      await selectTheme(page, "light");
      await captureScreenshot(page, `browser-results/${name}-desktop-light.png`);
      await selectTheme(page, "dark");
      await captureScreenshot(page, `browser-results/${name}-desktop-dark.png`);
      await assertListGeometry(page, width);
      const firstPost = page.locator(".m3-blog-postcard a.m3-blog-postcard__title").first();
      const href = await firstPost.getAttribute("href");
      expect(href?.startsWith(`${basePath(origin)}/`)).toBeTruthy();
      await firstPost.click();
      await expect(page.locator(".post-card")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".markdown-content ol").first()).toHaveCSS("list-style-type", "decimal");
      await page.locator(".markdown-content").evaluate((root) => {
        root.insertAdjacentHTML(
          "beforeend",
          "<table><thead><tr><th>Column</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>",
        );
      });
      await expect(page.locator(".markdown-content th").first()).toBeVisible();
      await captureScreenshot(page, `browser-results/${name}-article-dark.png`);
      await selectTheme(page, "light");
      await captureScreenshot(page, `browser-results/${name}-article-light.png`);
      await page.locator('#navbar nav[aria-label="Main navigation"]').getByRole("link", { name: /^(文章|Posts|記事)$/ }).click();
      await expect(page.locator("#post-list")).toBeVisible();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "github-light");
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page.locator(".post-card")).toBeVisible();
      await page.locator('#navbar nav[aria-label="Main navigation"]').getByRole("link", { name: /^(文章|Posts|記事)$/ }).click();
      await expect(page.locator("#post-list")).toBeVisible();
      await page.keyboard.press("Home");
      await page.keyboard.press("Tab");
      await expect(page.locator(".skip-link")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#navbar a[href]").first()).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator('#navbar nav[aria-label="Main navigation"] a').first()).toBeFocused();
      await page.locator("#search-input-desktop-switch").click();
      await page.locator("#search-input-desktop").fill("ALNILAM");
      const firstResult = page.locator("#search-panel a.m3-blog-searchpanel__item").first();
      await expect(firstResult).toBeVisible();
      const resultHref = await firstResult.getAttribute("href");
      expect(resultHref?.startsWith(`${basePath(origin)}/`)).toBeTruthy();
      await firstResult.click();
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
    await page.locator(".m3-blog-postcard a.m3-blog-postcard__title").first().click();
    await expect(page.locator(".post-card")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await page.screenshot({ path: "browser-results/root-mobile-article.png", fullPage: true });
    await page.locator("#nav-drawer-switch").click();
    await page.locator(".site-drawer__nav").getByRole("link", { name: /^(文章|Posts|記事)$/ }).click();
    await expect(page.locator("#post-list")).toBeVisible();
  } finally {
    await context.close();
    expect(errors, "mobile page errors").toEqual([]);
  }
});

test("search initializes once and keeps the latest result", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
  const toggle = page.locator("#search-switch");
  await toggle.click();
  await expect.poll(() => pagefindRequests).toBe(1);
  await toggle.click();
  await toggle.click();

  const panel = page.locator("#search-panel");
  await expect(panel).not.toHaveClass(/float-panel-closed/);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__pagefindInitCalls") ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__pagefindOptionsCalls") ?? 0)).toBe(1);

  const input = panel.locator("input");
  await input.fill("first");
  await expect.poll(() =>
    page.evaluate(() => (Reflect.get(window, "__pagefindQueries") as string[] | undefined)?.includes("first")),
  ).toBe(true);
  await input.fill("second");
  await expect(panel.getByRole("link", { name: "second" })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(panel.getByRole("link", { name: "second" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "first" })).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.has(window, "__rs"))).toBe(false);
});

// Synthetic content exercises the real rendered components without changing a Site.
for (const origin of [ROOT, NESTED])
  for (const width of [1440, 390]) {
    test(`reading edge cases ${new URL(origin).pathname} ${width}`, async ({ browser }, info) => {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      try {
        await test.step("card layout, long titles and separate click targets", async () => {
          await page.goto(`${origin}/`, { waitUntil: "networkidle" });
          await assertListGeometry(page, width);
          const card = page.locator(".m3-blog-postcard.m3-blog-postcard--cover").first();
          const title = card.locator("a.m3-blog-postcard__title");
          const articleHref = await title.getAttribute("href");
          await title.evaluate((el) => {
            el.textContent = "LongUnbrokenTitle".repeat(12);
          });
          const titleBox = await title.boundingBox();
          const contentBox = await card.locator(".m3-blog-postcard__body").boundingBox();
          expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(contentBox!.x + contentBox!.width + 1);
          expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          const noCover = page.locator(".m3-blog-postcard:not(.m3-blog-postcard--cover)").first();
          await expect(noCover).toBeVisible();
          await expect(noCover.locator(".m3-blog-postcard__cover")).toHaveCount(0);
          const tag = card.locator(".m3-blog-postcard__tags a").first();
          const tagHref = await tag.getAttribute("href");
          await captureScreenshot(page, info.outputPath("cards-long-title.png"));
          await tag.click();
          await expect(page).toHaveURL(new URL(tagHref!, origin).href);
          await page.goto(`${origin}/`, { waitUntil: "networkidle" });
          await page
            .locator(".m3-blog-postcard.m3-blog-postcard--cover a.m3-blog-postcard__title")
            .first()
            .click();
          await expect(page).toHaveURL(new URL(articleHref!, origin).href);
        });
        await test.step("article long text, code, tables and embedded media", async () => {
          await page.locator(".post-card h1").evaluate((el) => {
            el.textContent = "LongArticleTitle".repeat(12);
          });
          await page.locator(".markdown-content").evaluate((el) => {
            const paragraph = document.createElement("p");
            paragraph.textContent = "https://example.com/" + "unbrokentext".repeat(30);
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.textContent = "long_code_token_".repeat(40);
            pre.append(code);
            const table = document.createElement("table");
            table.innerHTML =
              "<caption>Synthetic wide table</caption><tbody><tr>" +
              '<td style="white-space:nowrap">Wide table column</td>'.repeat(12) +
              "</tr></tbody>";
            const frame = document.createElement("iframe");
            frame.width = "1600";
            frame.height = "900";
            frame.title = "Synthetic embedded media";
            frame.srcdoc = "<p>Local media fixture</p>";
            el.append(paragraph, pre, table, frame);
          });
          await expect(page.locator(".markdown-content iframe")).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          for (const selector of ["pre", "table"]) {
            const overflow = await page.locator(`.markdown-content ${selector}`).last().evaluate((el) => ({
              scrolls: el.scrollWidth > el.clientWidth,
              overflowX: getComputedStyle(el).overflowX,
            }));
            expect(overflow.scrolls).toBe(true);
            expect(overflow.overflowX).toBe("auto");
          }
          await captureScreenshot(page, info.outputPath("article-rich-media.png"));
        });
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }

for (const origin of [ROOT, NESTED]) {
  test(`navigation and settings ${new URL(origin).pathname}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    // The preference is resolved in head, before body markup and deferred modules.
    await context.addInitScript(() => {
      if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
      new MutationObserver(() => {
        if (document.body && !Reflect.has(window, "__firstBodyDark")) {
          Reflect.set(window, "__firstBodyDark", document.documentElement.classList.contains("dark"));
        }
      }).observe(document, { childList: true, subtree: true });
    });
    try {
      await page.goto(`${origin}/`, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => Reflect.get(window, "__firstBodyDark"))).toBe(false);
      await expect(page.locator("html")).not.toHaveClass(/dark/);
      const menu = page.locator("#nav-drawer-switch");
      const drawer = page.locator(".site-drawer");
      const nav = page.locator(".site-drawer__nav");
      await expect(drawer).not.toHaveClass(/site-drawer--open/);
      await menu.tap();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(drawer).toHaveClass(/site-drawer--open/);
      await expect(nav).toBeVisible();
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await nav.getByRole("link", { name: "文章", exact: true }).focus();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await expect(drawer).not.toHaveClass(/site-drawer--open/);
      await page.keyboard.press("Enter");
      await expect(drawer).toHaveClass(/site-drawer--open/);
      await captureScreenshot(page, info.outputPath("mobile-navigation.png"));
      await nav.getByRole("link", { name: "文章", exact: true }).tap();
      await expect(page).toHaveURL(`${origin}/posts/`);
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("html")).not.toHaveClass(/dark/);
      await selectTheme(page, "dark");
      await expect(page.locator("html")).toHaveClass(/dark/);
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveClass(/dark/);
      await menu.tap();
      await expect(drawer).toHaveClass(/site-drawer--open/);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect(menu).toBeHidden();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator('#navbar nav[aria-label="Main navigation"]')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(drawer).not.toHaveClass(/site-drawer--open/);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
