import { expect, test } from "@playwright/test";

const deployments = [
  { name: "root", origin: "http://127.0.0.1:4323", base: "" },
  { name: "nested", origin: "http://127.0.0.1:4324", base: "/ALNILAM" },
] as const;
const viewports = [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
] as const;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aZkAAAAASUVORK5CYII=",
  "base64",
);

for (const deployment of deployments) {
  for (const viewport of viewports) {
    test(`Gallery routes, empty states and PhotoSwipe work at ${deployment.name} ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: viewport.viewport,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.route("https://images.unsplash.com/**", (route) =>
        route.fulfill({ status: 200, contentType: "image/png", body: tinyPng }),
      );

      const albumsPath = `${deployment.base}/albums/`;
      for (const [locale, title, back] of [["en", "Albums", "Back to albums"], ["ja", "アルバム", "アルバムに戻る"]] as const) {
        await page.goto(`${deployment.origin}${deployment.base}/${locale}/albums/`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").first()).toHaveText(title);
        await expect(page.locator('#main-navigation [data-nav-key="albums"]')).toHaveText(title);
        const search = page.locator(".album-section__search input");
        await expect(search).toHaveAttribute("placeholder", locale === "en" ? "Search" : "検索");
        await search.fill("no-such-album-matches-this-query");
        const noResultsText = locale === "en" ? "No albums matched your filters" : "条件に合うアルバムがありません";
        await expect(page.locator(".album-section__empty")).toContainText(noResultsText);
        await search.fill("");
        if (viewport.name === "mobile") {
          await page.locator("#nav-drawer-switch").click();
          await expect(page.locator(".site-drawer__nav").getByRole("link", { name: title })).toBeVisible();
          await page.keyboard.press("Escape");
        }
        const albumLink = page.locator('a[href*="coast-and-mountains"]');
        await expect(albumLink).toHaveAttribute("href", `${deployment.base}/${locale}/albums/coast-and-mountains/`);
        await albumLink.click();
        await expect(page.locator(".album-detail__back")).toHaveText(`← ${back}`);
        await expect(page.locator('#main-navigation [data-nav-key="albums"]')).toHaveText(title);
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
        page.locator('a[href*="no-cover"] .album-card__cover-fallback'),
      ).toBeVisible();
      await albumLink.click();

      const photoButtons = page.locator(".album-gallery__item");
      await expect(photoButtons).toHaveCount(3);
      await photoButtons.first().click();
      const viewer = page.locator(".pswp.pswp--open");
      await expect(viewer).toBeVisible();
      const firstImage = page.locator(
        '.pswp__item[aria-hidden="false"] .pswp__img:not(.pswp__img--placeholder)',
      );
      await expect(firstImage).toBeVisible();
      await expect.poll(() => firstImage.getAttribute("src")).toContain("w=2400");

      const counter = page.locator(".pswp__counter");
      const before = await counter.textContent();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => counter.textContent()).not.toBe(before);
      await page.keyboard.press("Escape");
      await expect(viewer).toBeHidden();

      await page.goto(`${deployment.origin}${albumsPath}empty-album/`, { waitUntil: "networkidle" });
      await expect(page.locator(".album-gallery__empty")).toBeVisible();
      await context.close();
    });
  }
}
