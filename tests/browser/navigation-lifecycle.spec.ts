import { test, expect, type Page } from "@playwright/test";
import { observeLayoutShifts, assertCLSBudget } from "../../scripts/ci/cnb-metrics.mjs";

async function switchToLight(page: Page, width: number) {
  if (width >= 1024) {
    await page.locator("#scheme-switch").click();
    await page.locator(".m3-menu .m3-menu-item").first().click();
  } else {
    for (let i = 0; i < 3; i++) {
      const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
      const stored = await page.evaluate(() => localStorage.getItem("theme"));
      if (!isDark && stored === "light") break;
      await page.locator("#scheme-switch").click();
    }
  }
  await expect(page.locator("html")).not.toHaveClass(/dark/);
}

for (const origin of ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"]) {
  for (const width of [390, 1440]) {
    test(`MPA reading lifecycle ${new URL(origin).pathname} ${width}`, async ({ browser }, info) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        hasTouch: width === 390,
      });
      await context.addInitScript(observeLayoutShifts);
      const page = await context.newPage();
      const errors: string[] = [];
      const sdkRequests: string[] = [];
      const samples: unknown[] = [];
      let pagefindImports = 0;
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("request", (request) => {
        if (/giscus|googlesyndication|googletagmanager|google-analytics|doubleclick/i.test(request.url()))
          sdkRequests.push(request.url());
        if (request.url().endsWith("/pagefind/pagefind.js")) pagefindImports++;
      });
      const sample = async (action: string) => {
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(650);
        const shifts = await page.evaluate("window.__cnbShifts || []");
        samples.push({ action, url: page.url(), shifts, cls: assertCLSBudget(shifts) });
      };
      try {
        await page.goto(`${origin}/posts/getting-started/`, { waitUntil: "networkidle" });
        await sample("first-render");
        expect(pagefindImports).toBe(0);
        const headerY = await page.locator(".post-card h1").evaluate((el) => el.getBoundingClientRect().top);
        await switchToLight(page, width);
        await sample("theme");
        if (width === 390) {
          const menu = page.locator("#nav-drawer-switch");
          await menu.click();
          await expect(page.locator(".site-drawer--open")).toBeVisible();
          expect(await page.locator(".post-card h1").evaluate((el) => el.getBoundingClientRect().top)).toBe(headerY);
          await sample("mobile-menu-overlay");
          await page.keyboard.press("Escape");
          await expect(menu).toBeFocused();
        }
        if (width === 390) {
          const tocBtn = page.locator("#fab-toc-btn button");
          const tocPanel = page.locator("#floating-toc-panel");
          const articleY = await page.locator(".markdown-content").evaluate((el) => el.getBoundingClientRect().top);
          await tocBtn.focus();
          await page.keyboard.press("Enter");
          await expect(tocPanel).toHaveClass(/is-open/);
          expect(await page.locator(".markdown-content").evaluate((el) => el.getBoundingClientRect().top)).toBe(articleY);
          const link = tocPanel.locator('a[href^="#"]').last();
          const fragment = await link.getAttribute("href");
          await link.click();
          await expect(page).toHaveURL(`${origin}/posts/getting-started/${fragment}`);
          await expect(tocPanel).not.toHaveClass(/is-open/);
          const headingTop = await page.locator(fragment!).evaluate((el) => el.getBoundingClientRect().top);
          expect(headingTop).toBeGreaterThanOrEqual(60);
          await tocBtn.click();
          await expect(tocPanel).toHaveClass(/is-open/);
          await tocPanel.locator('a[href^="#"]').first().focus();
          await page.keyboard.press("Escape");
          await expect(tocBtn).toBeFocused();
          await expect(tocPanel).not.toHaveClass(/is-open/);
          await sample("toc-scroll");
          await tocBtn.click();
          await page.screenshot({ path: info.outputPath("reading-toc.png"), fullPage: true, animations: "disabled" });
          await page.keyboard.press("Escape");
        } else {
          const toc = page.locator("#toc");
          await expect(toc).toBeVisible();
          const link = toc.locator('a[href^="#"]').last();
          const fragment = await link.getAttribute("href");
          await link.click();
          await expect(page).toHaveURL(`${origin}/posts/getting-started/${fragment}`);
          const headingTop = await page.locator(fragment!).evaluate((el) => el.getBoundingClientRect().top);
          expect(headingTop).toBeGreaterThanOrEqual(60);
          await sample("toc-scroll");
          await page.screenshot({ path: info.outputPath("reading-toc.png"), fullPage: true, animations: "disabled" });
        }
        const base = new URL(origin).pathname.replace(/\/$/, "");
        for (let round = 0; round < 10; round++) {
          if (width === 390) {
            await page.locator("#nav-drawer-switch").click();
            await page.locator(".site-drawer__nav").getByRole("link", { name: "文章" }).click();
          } else {
            await page.locator('#main-navigation').getByRole("link", { name: "文章" }).click();
          }
          await expect(page.locator("#post-list")).toBeVisible();
          if (round === 0) {
            const image = page.locator('.m3-blog-postcard img[loading="lazy"]').first();
            await image.scrollIntoViewIfNeeded();
            await expect
              .poll(() =>
                image.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0),
              )
              .toBe(true);
            await sample("lazy-image-and-font-ready");
          }
          await page.locator(`.m3-blog-postcard a.m3-blog-postcard__title[href="${base}/posts/getting-started/"]`).click();
          await expect(page.locator(".markdown-content")).toBeVisible();
        }
        expect(pagefindImports).toBe(0);
        await sample("repeated-navigation");
        const searchPanel = page.locator("#search-panel");
        const toggle = page.locator(width === 390 ? "#search-switch" : "#search-input-desktop-switch");
        const searchInput = page.locator(width === 390 ? "#search-panel input" : "#search-input-desktop");
        await toggle.click();
        await expect(searchInput).toBeFocused();
        await searchInput.fill("ALNILAM");
        await expect(searchPanel.locator("a.m3-blog-searchpanel__item").first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const searchBox = await searchPanel.boundingBox();
        expect(searchBox!.x).toBeGreaterThanOrEqual(0);
        expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(width);
        if (width === 390) {
          await page.setViewportSize({ width: 320, height: 900 });
          await expect.poll(async () => (await searchPanel.boundingBox())?.x ?? -Infinity).toBeGreaterThanOrEqual(0);
          await expect
            .poll(async () => {
              const box = await searchPanel.boundingBox();
              return box ? box.x + box.width : Infinity;
            })
            .toBeLessThanOrEqual(320);
          await page.setViewportSize({ width, height: 900 });
        }
        await page.screenshot({ path: info.outputPath("search-overlay.png"), fullPage: true, animations: "disabled" });
        await expect.poll(() => pagefindImports).toBe(1);
        await page.keyboard.press("Escape");
        await expect(searchPanel).toHaveClass(/float-panel-closed/);
        await expect(toggle).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(searchInput).toBeFocused();
        expect(pagefindImports).toBe(1);
        await sample("search-overlay");
        await page.keyboard.press("Escape");
        await page.goBack({ waitUntil: "networkidle" });
        await expect(page.locator("#post-list")).toBeVisible();
        await page.goForward({ waitUntil: "networkidle" });
        await expect(page.locator(".markdown-content")).toBeVisible();
        // Synthetic provider-size probe uses product CSS; actual Comments mount is
        // verified separately with an enabled Site and a labelled mock Giscus response.
        await page.locator(".post-card").evaluate((el) => {
          el.parentElement!.insertAdjacentHTML(
            "afterend",
            '<section class="article-comments" style="min-height:260px" aria-label="Synthetic comments reservation"></section>',
          );
        });
        const comments = page.getByRole("region", { name: "Synthetic comments reservation" });
        await comments.scrollIntoViewIfNeeded();
        const reservedHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await comments.evaluate((el) => {
          const frame = document.createElement("iframe");
          frame.title = "Synthetic delayed comments";
          frame.style.cssText = "width:100%;height:260px;border:0";
          frame.srcdoc = "<p>Mock provider size</p>";
          el.append(frame);
        });
        await expect(comments.locator("iframe")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(reservedHeight);
        await sample("reserved-comments");
        expect(sdkRequests).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await info.attach("lifecycle-cls.json", {
          body: JSON.stringify({ origin, width, reducedMotion: true, samples, sdkRequests, errors }),
          contentType: "application/json",
        });
        await context.close();
      }
    });
  }
}
