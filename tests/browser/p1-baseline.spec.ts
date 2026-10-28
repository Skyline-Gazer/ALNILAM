import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const origins = [
  { name: "root", url: "http://127.0.0.1:4323" },
  { name: "nested", url: "http://127.0.0.1:4324/ALNILAM" },
] as const;
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;
const themes = ["dark", "light"] as const;

type ShiftSource = {
  tag: string | null;
  id: string | null;
  className: string | null;
  previousRect: DOMRectInit | null;
  currentRect: DOMRectInit | null;
};
type ShiftEntry = {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
  url: string;
  sources: ShiftSource[];
};
type WindowWithShifts = Window & { __p1LayoutShifts?: ShiftEntry[] };

function observeLayoutShifts() {
  const target = window as WindowWithShifts;
  target.__p1LayoutShifts = [];
  if (!PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) return;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources?: Array<{
          node?: Element | null;
          previousRect?: DOMRectReadOnly;
          currentRect?: DOMRectReadOnly;
        }>;
      };
      target.__p1LayoutShifts!.push({
        value: shift.value,
        startTime: shift.startTime,
        hadRecentInput: shift.hadRecentInput,
        url: location.href,
        sources: (shift.sources ?? []).map((source) => {
          const element = source.node instanceof Element ? source.node : null;
          return {
            tag: element?.tagName ?? null,
            id: element?.getAttribute("id") || null,
            className: element?.getAttribute("class") || null,
            previousRect: source.previousRect ? { ...source.previousRect.toJSON() } : null,
            currentRect: source.currentRect ? { ...source.currentRect.toJSON() } : null,
          };
        }),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
}

function calculateCLS(entries: ShiftEntry[]) {
  let maximum = 0;
  let windowStart = 0;
  let lastShift = 0;
  let session = 0;
  for (const entry of [...entries].sort((a, b) => a.startTime - b.startTime)) {
    if (entry.hadRecentInput) continue;
    if (!session || entry.startTime - lastShift > 1000 || entry.startTime - windowStart > 5000) {
      windowStart = entry.startTime;
      session = 0;
    }
    session += entry.value;
    lastShift = entry.startTime;
    maximum = Math.max(maximum, session);
  }
  return maximum;
}

function at(origin: string, route: string) {
  const base = new URL(origin).pathname.replace(/\/$/, "");
  return new URL(`${base}${route.startsWith("/") ? route : `/${route}`}`, new URL(origin).origin).href;
}

async function activate(locator: Locator, mobile: boolean) {
  if (mobile) await locator.tap();
  else await locator.click();
}

async function selectTheme(page: Page, theme: (typeof themes)[number], mobile: boolean) {
  await activate(page.locator(`[data-theme-choice="${theme}"]`), mobile);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.getByRole("radio", { name: theme === "dark" ? "深色" : "浅色" })).toBeChecked();
}

async function assertListGeometry(page: Page, width: number) {
  const cards = page.locator('[data-post-card][data-cover="true"]');
  await expect(cards.first()).toBeVisible();
  const first = cards.first();
  const contentBox = await first.locator(".post-card__content").boundingBox();
  const coverBox = await first.locator(".post-card__cover").boundingBox();
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

test("CLS calculation uses the largest session window and ignores recent-input shifts", () => {
  const entries = [
    { value: 0.07, startTime: 0, hadRecentInput: false, url: "", sources: [] },
    { value: 0.05, startTime: 500, hadRecentInput: false, url: "", sources: [] },
    { value: 0.12, startTime: 2000, hadRecentInput: false, url: "", sources: [] },
    { value: 0.5, startTime: 2200, hadRecentInput: true, url: "", sources: [] },
    { value: 0.04, startTime: 3000, hadRecentInput: false, url: "", sources: [] },
    { value: 0.2, startTime: 7001, hadRecentInput: false, url: "", sources: [] },
  ] satisfies ShiftEntry[];
  expect(calculateCLS(entries)).toBeCloseTo(0.2);
});

for (const origin of origins) {
  for (const viewport of viewports) {
    test(`${origin.name} external Site routes and lifecycle at ${viewport.width}px`, async ({ browser }, info) => {
      const mobile = viewport.width === 390;
      const context = await browser.newContext({
        viewport,
        hasTouch: mobile,
        reducedMotion: "reduce",
      });
      await context.addInitScript(observeLayoutShifts);
      const page = await context.newPage();
      const errors: string[] = [];
      const samples: Record<string, unknown>[] = [];
      const delayedCovers: string[] = [];
      const pagefindScripts: string[] = [];
      const rootURL = at(origin.url, "/");
      const postsURL = at(origin.url, "/posts/");
      const coverURL = at(origin.url, "/posts/cover-story/");
      const noCoverURL = at(origin.url, "/posts/no-cover/");
      const englishURL = at(origin.url, "/posts/en/responsive-title/");
      const pageTwoURL = at(origin.url, "/posts/2/");

      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });
      page.on("requestfailed", (request) => errors.push(`request failed: ${request.url()}`));
      page.on("response", (response) => {
        if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.endsWith("/pagefind/pagefind.js")) pagefindScripts.push(request.url());
      });
      await page.route("**/site-assets/cover.svg", async (route) => {
        delayedCovers.push(route.request().url());
        await new Promise((resolve) => setTimeout(resolve, 350));
        await route.continue();
      });

      const capture = async (label: string, screenshot = false) => {
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.waitForTimeout(150);
        const events = await page.evaluate(() => (window as WindowWithShifts).__p1LayoutShifts ?? []);
        samples.push({
          label,
          url: page.url(),
          theme: await page.locator("html").getAttribute("data-theme"),
          viewport,
          cls: calculateCLS(events),
          shiftCount: events.length,
          shifts: events,
          fontResources: await page.evaluate(() => performance.getEntriesByType("resource")
            .filter((resource) => /\.(woff2?|ttf|otf)(\?|$)/i.test(resource.name)).map((resource) => resource.name)),
          reducedMotion: await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        });
        if (screenshot) {
          const file = info.outputPath(`screenshots/${label}.png`);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          await page.screenshot({ path: file, fullPage: true });
          await info.attach(`${label}.png`, { path: file, contentType: "image/png" });
        }
      };

      try {
        await page.goto(rootURL, { waitUntil: "networkidle" });
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("main h1")).toHaveCount(1);
        await expect(page.locator(".home-hero")).toBeVisible();
        expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
        await page.keyboard.press("Home");
        await page.keyboard.press("Tab");
        await expect(page.locator(".skip-link")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.locator(".brand")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.locator(".primary-nav a").first()).toBeFocused();

        for (const theme of themes) {
          await page.goto(rootURL, { waitUntil: "networkidle" });
          await selectTheme(page, theme, mobile);
          await capture(`${origin.name}-${viewport.name}-home-${theme}`, true);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

          const articlesLink = page.locator(".primary-nav a").filter({ hasText: "文章" }).first();
          await activate(articlesLink, mobile);
          await expect(page).toHaveURL(postsURL);
          await expect(page.locator(".post-list")).toBeVisible();
          await expect(page.locator('[data-post-card]').filter({ has: page.locator('a[href$="/posts/no-cover/"]') }).locator("img")).toHaveCount(0);
          await assertListGeometry(page, viewport.width);
          await capture(`${origin.name}-${viewport.name}-posts-${theme}`, true);

          await activate(page.getByRole("link", { name: /下一页/ }), mobile);
          await expect(page).toHaveURL(pageTwoURL);
          await expect(page.locator('[data-post-card] a[href$="/posts/en/responsive-title/"]')).toBeVisible();
          await capture(`${origin.name}-${viewport.name}-pagination-${theme}`);

          await page.goto(coverURL, { waitUntil: "networkidle" });
          await expect(page.locator(".article-view")).toBeVisible();
          await expect(page.locator(".article-cover")).toBeVisible();
          await expect(page.locator(".article-cover")).toHaveJSProperty("complete", true);
          await capture(`${origin.name}-${viewport.name}-article-${theme}`, true);
          await page.goto(`${englishURL}?fixture=baseline#english-fixture-section`, { waitUntil: "networkidle" });
          await expect(page).toHaveURL(/fixture=baseline#english-fixture-section$/);
          await expect(page.locator("html")).toHaveAttribute("lang", "en");
          await expect(page.locator('link[hreflang="zh-CN"]')).toHaveAttribute("href", /posts\/responsive-title\//);
          await expect(page.locator(".article-header h1")).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
          await capture(`${origin.name}-${viewport.name}-localized-${theme}`, true);

          const fontSwap = await page.evaluate(async () => {
            const heading = document.querySelector<HTMLElement>(".article-header h1");
            if (!heading) return { result: "NOT_VERIFIED", reason: "article heading missing" };
            await new Promise((resolve) => setTimeout(resolve, 250));
            try {
              const face = new FontFace("AlnilamDelayedFixture", 'local("Arial"), local("Liberation Sans")');
              await face.load();
              document.fonts.add(face);
              heading.style.fontFamily = '"AlnilamDelayedFixture", sans-serif';
              await document.fonts.ready;
              const loaded = document.fonts.check('16px "AlnilamDelayedFixture"');
              return { result: loaded ? "PASS" : "NOT_VERIFIED", loaded };
            } catch (error) {
              return { result: "NOT_VERIFIED", reason: String(error) };
            }
          });
          samples.push({ label: `${origin.name}-${viewport.name}-late-font-${theme}`, ...fontSwap });
          await capture(`${origin.name}-${viewport.name}-late-font-${theme}`);
          await page.reload({ waitUntil: "networkidle" });
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

          await page.goto(noCoverURL, { waitUntil: "networkidle" });
          await expect(page.locator(".article-view")).toBeVisible();
          await expect(page.locator(".article-cover")).toHaveCount(0);
          await capture(`${origin.name}-${viewport.name}-no-cover-${theme}`);

          await page.goto(at(origin.url, "/archives/"), { waitUntil: "networkidle" });
          await expect(page.locator("main h1")).toHaveText("归档");
          await capture(`${origin.name}-${viewport.name}-archives-${theme}`);

          const tagsLink = page.locator(".primary-nav a[href$='/tags/']").first();
          await activate(tagsLink, mobile);
          await expect(page.locator(".tag-cloud")).toBeVisible();
          await capture(`${origin.name}-${viewport.name}-tags-${theme}`, true);
          const baselineTag = page.locator('.tag-cloud a[href*="/tags/Baseline/"]').first();
          await activate(baselineTag, mobile);
          await expect(page.locator(".post-list")).toBeVisible();
          await capture(`${origin.name}-${viewport.name}-tag-detail-${theme}`);

          await page.goto(rootURL, { waitUntil: "networkidle" });
          const searchButton = page.getByRole("button", { name: "搜索", exact: true });
          const pagefindBeforeSearch = pagefindScripts.length;
          await activate(searchButton, mobile);
          let dialog = page.getByRole("dialog", { name: "站内搜索" });
          await dialog.getByRole("searchbox").fill("cobalt telescope signal");
          const searchResult = dialog.locator('a[href$="/posts/cover-story/"]').first();
          await expect(searchResult).toBeVisible();
          const resultHref = await searchResult.getAttribute("href");
          expect(resultHref).toContain("/posts/cover-story/");
          expect(pagefindScripts.length - pagefindBeforeSearch).toBeLessThanOrEqual(1);
          await capture(`${origin.name}-${viewport.name}-search-${theme}`, true);
          await activate(searchButton, mobile);
          await expect(dialog).toHaveCount(0);
          await activate(searchButton, mobile);
          dialog = page.getByRole("dialog", { name: "站内搜索" });
          await dialog.getByRole("searchbox").fill("cobalt telescope signal");
          await expect(dialog.locator('a[href$="/posts/cover-story/"]').first()).toBeVisible();
          await expect(dialog).toHaveCount(1);
          expect(pagefindScripts.length - pagefindBeforeSearch).toBeLessThanOrEqual(1);
          await activate(searchResult, mobile);
          await expect(page).toHaveURL(new URL(resultHref!, rootURL).href);
          await expect(page.locator(".article-view")).toBeVisible();
          await capture(`${origin.name}-${viewport.name}-search-result-${theme}`);
        }

        const disabledBangumi = await context.request.get(at(origin.url, "/bangumi/"));
        expect(disabledBangumi.status()).toBe(404);

        await page.goto(postsURL, { waitUntil: "networkidle" });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const restoredScroll = await page.evaluate(() => scrollY);
        expect(restoredScroll).toBeGreaterThan(0);
        const lastCard = page.locator("[data-post-card] h2 a").last();
        for (let round = 0; round < 10; round++) {
          await activate(lastCard, mobile);
          await expect(page.locator(".article-view")).toBeVisible();
          await page.goBack({ waitUntil: "networkidle" });
          await expect(page).toHaveURL(postsURL);
          await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(restoredScroll, 0);
          await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
          if (round === 0) {
            await page.goForward({ waitUntil: "networkidle" });
            await expect(page.locator(".article-view")).toBeVisible();
            await page.goBack({ waitUntil: "networkidle" });
            await expect(page.locator(".post-list")).toBeVisible();
          }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        expect(delayedCovers.length).toBeGreaterThan(0);
        await expect.poll(async () => pagefindScripts.length).toBeGreaterThan(0);
        await page.goto(rootURL, { waitUntil: "networkidle" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        expect(errors, `${origin.name}/${viewport.name} browser errors`).toEqual([]);

        await info.attach("p1-browser-baseline.json", {
          body: JSON.stringify({
            testedSha: process.env.ALNILAM_TESTED_SHA ?? "local-uncommitted",
            siteDigest: process.env.ALNILAM_SITE_DIGEST ?? null,
            site: "disposable external Site v1 fixture",
            base: origin.name,
            viewport,
            themes,
            labOnly: true,
            samples,
            delayedCoverRequests: delayedCovers.length,
            pagefindScriptRequests: pagefindScripts,
            repeatedNavigations: 10,
            reducedMotion: true,
            errors,
          }, null, 2),
          contentType: "application/json",
        });
      } finally {
        await context.close();
      }
    });
  }
}

for (const [name, origin] of [
  ["root", "http://127.0.0.1:4325"],
  ["nested", "http://127.0.0.1:4326/ALNILAM"],
] as const) {
  test(`enabled Bangumi fixture is static and renders at ${name}`, async ({ browser }, info) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errors: string[] = [];
    const providerRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "api.bgm.tv") providerRequests.push(request.url());
    });
    await page.goto(at(origin, "/bangumi/"), { waitUntil: "networkidle" });
    await expect(page.locator(".article-view")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Bangumi 收藏" })).toBeVisible();
    await expect(page.getByText("P1 番组夹具")).toBeVisible();
    await expect(page.getByText("P1 fixture show")).toBeVisible();
    await expect(page.locator(".bangumi-card")).toHaveCount(1);
    expect(providerRequests).toEqual([]);
    expect(errors).toEqual([]);
    const screenshot = info.outputPath(`${name}-bangumi.png`);
    fs.mkdirSync(path.dirname(screenshot), { recursive: true });
    await page.screenshot({ path: screenshot, fullPage: true });
    await info.attach(`${name}-bangumi.png`, { path: screenshot, contentType: "image/png" });
    await page.context().close();
  });
}
