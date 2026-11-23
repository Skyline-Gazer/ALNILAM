import { expect, test } from "@playwright/test";

const deployments = [
  { name: "root", origin: process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323", base: "" },
  { name: "nested", origin: process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324", base: "/ALNILAM" },
] as const;
const viewports = [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
] as const;

async function installLayoutShiftObserver(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const windowWithCls = window as Window & { __alnilamCls?: number };
    windowWithCls.__alnilamCls = 0;
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput) windowWithCls.__alnilamCls = (windowWithCls.__alnilamCls ?? 0) + (shift.value ?? 0);
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
}

async function expectLayoutShiftWithinBudget(page: import("@playwright/test").Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const measurement = await page.evaluate(() => ({
    supported: PerformanceObserver.supportedEntryTypes.includes("layout-shift"),
    value: (window as Window & { __alnilamCls?: number }).__alnilamCls ?? 0,
  }));
  expect(measurement.supported, "Chromium exposes layout-shift entries").toBe(true);
  expect(measurement.value, "cumulative layout shift remains below 0.1").toBeLessThan(0.1);
}

for (const deployment of deployments) {
  for (const viewport of viewports) {
    test(`Moments content, localization and image viewer work at ${deployment.name} ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: viewport.viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      await installLayoutShiftObserver(page);
      const externalRequests: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== deployment.origin) externalRequests.push(request.url());
      });

      const routes = [
        { locale: "zh-CN", guide: "/posts/moments-guide/", path: "/moments/", title: "动态", search: "搜索", loadMore: "加载更多", albumLabel: "Coast and Mountains 相册" },
        { locale: "en", guide: "/en/posts/moments-guide/", path: "/en/moments/", title: "Moments", search: "Search", loadMore: "Load more", albumLabel: "Coast and Mountains album" },
        { locale: "ja", guide: "/ja/posts/moments-guide/", path: "/ja/moments/", title: "モーメンツ", search: "検索", loadMore: "もっと見る", albumLabel: "Coast and Mountains アルバム" },
      ] as const;

      for (const route of routes) {
        await page.goto(`${deployment.origin}${deployment.base}${route.guide}`, { waitUntil: "networkidle" });
        const guideTimeline = page.locator('a[href="../../moments/"]');
        await expect(guideTimeline).toHaveCount(1);
        await guideTimeline.click();
        await expect(page).toHaveURL(`${deployment.origin}${deployment.base}${route.path}`);
        await page.goto(`${deployment.origin}${deployment.base}${route.guide}`, { waitUntil: "networkidle" });
        await page.getByRole("link", { name: route.albumLabel, exact: true }).click();
        const albumPath = route.locale === "zh-CN" ? "/albums/coast-and-mountains/" : `/${route.locale}/albums/coast-and-mountains/`;
        await expect(page).toHaveURL(`${deployment.origin}${deployment.base}${albumPath}`);
        await page.goto(`${deployment.origin}${deployment.base}${route.path}`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").first()).toHaveText(route.title);
        await expectLayoutShiftWithinBudget(page);
        await expect(page.locator('#main-navigation [data-nav-key="moments"]')).toHaveText(route.title);
        await expect(page.locator(".moment-card")).toHaveCount(8);
        const textOnlyCard = page.locator(".moment-card").filter({
          hasText: "This text-only note records a reed edge changed by rain.",
        });
        await expect(textOnlyCard).toHaveCount(1);
        await expect(textOnlyCard.locator(".moment-card__gallery")).toHaveCount(0);
        await expect(page.getByText("This unpublished note stays out of the public timeline", { exact: false })).toHaveCount(0);

        if (viewport.name === "mobile") {
          await page.locator("#nav-drawer-switch").click();
          await expect(page.locator(".site-drawer__nav").getByRole("link", { name: route.title })).toBeVisible();
          await page.keyboard.press("Escape");
        }

        const search = page.locator(".moment-section__search input");
        await expect(search).toHaveAttribute("placeholder", route.search);
        await search.fill("independent");
        await expect(page.locator(".moment-card")).toHaveCount(1);
        await search.fill("");
        const tideFilter = page.getByRole("button", { name: "tide", exact: true });
        await tideFilter.click();
        await expect(page.locator(".moment-card")).toHaveCount(2);
        await expect(tideFilter).toHaveAttribute("aria-pressed", "true");
        await tideFilter.click();
        await expect(page.locator(".moment-card")).toHaveCount(8);
        await search.fill("no-matching-moment");
        await expect(page.locator(".moment-card")).toHaveCount(0);
        await expect(page.locator(".moment-section__empty")).toBeVisible();
        await search.fill("independent");
        await expect(page.locator(".moment-card")).toHaveCount(1);
        await search.fill("");
        await expect(page.locator(".moment-card")).toHaveCount(8);

        const more = page.getByRole("button", { name: route.loadMore });
        await more.click();
        await expect(page.locator(".moment-card")).toHaveCount(12);
        await expect(more).toHaveCount(0);
      }

      await page.goto(`${deployment.origin}${deployment.base}/moments/`, { waitUntil: "networkidle" });
      const twoImageCard = page.locator(".moment-card").nth(1);
      const imageTiles = twoImageCard.locator(".moment-card__tile");
      await expect(imageTiles).toHaveCount(2);
      const firstTileImage = imageTiles.first().locator("img");
      await expect(firstTileImage).toHaveAttribute("width", "1600");
      await expect(firstTileImage).toHaveAttribute("height", "1000");
      await firstTileImage.scrollIntoViewIfNeeded();
      await expect.poll(() => firstTileImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(640);
      await expect.poll(() => firstTileImage.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(400);
      await imageTiles.first().click();
      const viewer = twoImageCard.locator(".moment-viewer");
      await expect(viewer).toBeVisible();
      await expect(viewer).toBeFocused();
      const counter = viewer.locator(".moment-viewer__counter");
      await page.keyboard.press("ArrowRight");
      await expect(counter).toHaveText("2 / 2");
      await expect(viewer.locator(".moment-viewer__stage img")).toHaveAttribute("src", /alpine-lake\.svg/);
      await expect.poll(() => viewer.locator(".moment-viewer__stage img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1800);
      await expect.poll(() => viewer.locator(".moment-viewer__stage img").evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(1200);
      await page.keyboard.press("Home");
      await expect(counter).toHaveText("1 / 2");
      await page.keyboard.press("End");
      await expect(counter).toHaveText("2 / 2");
      await page.keyboard.press("Escape");
      await expect(viewer).toHaveCount(0);
      await expect(imageTiles.first()).toBeFocused();
      expect(externalRequests).toEqual([]);
      await context.close();
    });
  }
}
