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
    test(`Gallery guides, local artwork, filters and PhotoSwipe work at ${deployment.name} ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: viewport.viewport,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await installLayoutShiftObserver(page);
      const externalRequests: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== deployment.origin) externalRequests.push(request.url());
      });

      const albumsPath = `${deployment.base}/albums/`;
      const routes = [
        { locale: "zh-CN", article: "/posts/gallery-guide/", title: "相册", indexLabel: "相册索引", detailLabel: "Coast and Mountains", back: "返回相册" },
        { locale: "en", article: "/en/posts/gallery-guide/", title: "Albums", indexLabel: "album index", detailLabel: "Coast and Mountains detail page", back: "Back to albums" },
        { locale: "ja", article: "/ja/posts/gallery-guide/", title: "アルバム", indexLabel: "アルバム一覧", detailLabel: "Coast and Mountains の詳細", back: "アルバムに戻る" },
      ] as const;
      for (const route of routes) {
        const indexPath = route.locale === "zh-CN"
          ? albumsPath
          : `${deployment.base}/${route.locale}/albums/`;
        await page.goto(`${deployment.origin}${deployment.base}${route.article}`, { waitUntil: "networkidle" });
        const guideIndex = page.getByRole("link", { name: route.indexLabel, exact: true });
        await expect(guideIndex).toHaveAttribute("href", "../../albums/");
        await guideIndex.click();
        await expect(page).toHaveURL(`${deployment.origin}${deployment.base}${route.locale === "zh-CN" ? "/albums/" : `/${route.locale}/albums/`}`);
        await expect(page.locator("main h1").first()).toHaveText(route.title);
        await expectLayoutShiftWithinBudget(page);

        await page.goto(`${deployment.origin}${deployment.base}${route.article}`, { waitUntil: "networkidle" });
        await page.getByRole("link", { name: route.detailLabel, exact: true }).click();
        const guideDetailPath = route.locale === "zh-CN" ? "/albums/coast-and-mountains/" : `/${route.locale}/albums/coast-and-mountains/`;
        await expect(page).toHaveURL(`${deployment.origin}${deployment.base}${guideDetailPath}`);
        await expect(page.locator("main h1").first()).toHaveText("Coast and Mountains");
        await expectLayoutShiftWithinBudget(page);

        await page.goto(`${deployment.origin}${indexPath}`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").first()).toHaveText(route.title);
        await expect(page.locator('#main-navigation [data-nav-key="albums"]')).toHaveText(route.title);
        const search = page.locator(".album-section__search input");
        const searchPlaceholder = { "zh-CN": "搜索", en: "Search", ja: "検索" }[route.locale];
        await expect(search).toHaveAttribute("placeholder", searchPlaceholder);
        await search.fill("no-such-album-matches-this-query");
        const noResultsText = {
          "zh-CN": "没有符合条件的相册",
          en: "No albums matched your filters",
          ja: "条件に合うアルバムがありません",
        }[route.locale];
        await expect(page.locator(".album-section__empty")).toContainText(noResultsText);
        await search.fill("");
        const mountainFilter = page.getByRole("button", { name: "mountains", exact: true });
        await mountainFilter.click();
        await expect(page.locator(".album-card")).toHaveCount(1);
        await mountainFilter.click();
        await expect(page.locator(".album-card")).toHaveCount(3);
        if (viewport.name === "mobile") {
          await page.locator("#nav-drawer-switch").click();
          await expect(page.locator(".site-drawer__nav").getByRole("link", { name: route.title })).toBeVisible();
          await page.keyboard.press("Escape");
        }
        const albumLink = page.locator('a[href*="coast-and-mountains"]');
        const detailPath = route.locale === "zh-CN" ? "/albums/coast-and-mountains/" : `/${route.locale}/albums/coast-and-mountains/`;
        await expect(albumLink).toHaveAttribute("href", `${deployment.base}${detailPath}`);
        await albumLink.click();
        await expect(page.locator(".album-detail__back")).toHaveText(`← ${route.back}`);
        await expect(page.locator('#main-navigation [data-nav-key="albums"]')).toHaveText(route.title);
      }

      await page.goto(`${deployment.origin}${albumsPath}`, { waitUntil: "networkidle" });
      const albumLink = page.locator('a[href*="coast-and-mountains"]');
      await expect(page.locator('#main-navigation [data-nav-key="albums"]')).toHaveText("相册");
      if (viewport.name === "mobile") {
        await page.locator("#nav-drawer-switch").click();
        await expect(page.locator(".site-drawer__nav").getByRole("link", { name: "相册" })).toBeVisible();
        await page.keyboard.press("Escape");
      }
      await expect(albumLink).toBeVisible();
      await expect(
        page.locator('a[href*="forest-field-notes"] .album-card__cover-fallback'),
      ).toBeVisible();
      await albumLink.click();

      const photoButtons = page.locator(".album-gallery__item");
      await expect(photoButtons).toHaveCount(4);
      await expect(page.locator(".album-gallery")).toHaveClass(/album-gallery--grid/);
      const galleryIsland = page.locator("astro-island").filter({ has: photoButtons });
      await expect(galleryIsland).toHaveCount(1);
      await expect(galleryIsland).not.toHaveAttribute("ssr", "");
      const firstTile = photoButtons.first().locator("img");
      await firstTile.scrollIntoViewIfNeeded();
      await expect(firstTile).toHaveAttribute("src", /coast-dusk-thumb\.svg/);
      await expect.poll(() => firstTile.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(640);
      await expect.poll(() => firstTile.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(400);
      await photoButtons.first().click();
      const viewer = page.locator(".pswp.pswp--open");
      await expect(viewer).toBeVisible();
      const firstImage = page.locator(
        '.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)',
      );
      await expect(firstImage).toBeVisible();
      await expect.poll(() => firstImage.getAttribute("src")).toContain("/site-assets/gallery/coast-dusk.svg");
      await expect.poll(() => firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
      await expect.poll(() => firstImage.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1000);

      const counter = page.locator(".pswp__counter");
      const before = await counter.textContent();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => counter.textContent()).not.toBe(before);
      await page.keyboard.press("Tab");
      await expect(viewer.locator(":focus")).toHaveCount(1);
      await page.keyboard.press("Shift+Tab");
      await expect(viewer.locator(":focus")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(viewer).toBeHidden();
      await expect(photoButtons.first()).toBeFocused();

      await page.goto(`${deployment.origin}${albumsPath}`, { waitUntil: "networkidle" });
      await page.locator('a[href*="tidal-sketchbook"]').click();
      const masonry = page.locator(".album-gallery--masonry");
      await expect(masonry).toBeVisible();
      await expect(masonry.locator(".album-gallery__item")).toHaveCount(3);
      const portraitTile = masonry.locator(".album-gallery__item").first();
      await expect(portraitTile.locator("img")).toHaveAttribute("src", /sea-stack-thumb\.svg/);
      await expect.poll(() => portraitTile.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(400);
      await expect.poll(() => portraitTile.locator("img").evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(600);
      await portraitTile.click();
      const portraitViewer = page.locator(".pswp.pswp--open");
      const portraitImage = page.locator('.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)');
      await expect(portraitViewer).toBeVisible();
      await expect.poll(() => portraitImage.getAttribute("src")).toContain("/site-assets/gallery/sea-stack.svg");
      await expect.poll(() => portraitImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1000);
      await expect.poll(() => portraitImage.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1500);
      await page.keyboard.press("Escape");
      await expect(portraitViewer).toBeHidden();
      await expect(portraitTile).toBeFocused();
      await expect.poll(async () => externalRequests).toEqual([]);
      await context.close();
    });
  }
}
