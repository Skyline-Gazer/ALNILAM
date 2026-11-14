import { expect, test } from "@playwright/test";

const deployments = [
  { name: "root", origin: "http://127.0.0.1:4323", base: "" },
  { name: "nested", origin: "http://127.0.0.1:4324", base: "/ALNILAM" },
] as const;
const viewports = [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
] as const;

for (const deployment of deployments) {
  for (const viewport of viewports) {
    test(`Moments content, localization and image viewer work at ${deployment.name} ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: viewport.viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const externalRequests: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== deployment.origin) externalRequests.push(request.url());
      });

      const routes = [
        { locale: "zh-CN", path: "/moments/", title: "动态", search: "搜索", loadMore: "加载更多" },
        { locale: "en", path: "/en/moments/", title: "Moments", search: "Search", loadMore: "Load more" },
        { locale: "ja", path: "/ja/moments/", title: "モーメンツ", search: "検索", loadMore: "もっと見る" },
      ] as const;

      for (const route of routes) {
        await page.goto(`${deployment.origin}${deployment.base}${route.path}`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").first()).toHaveText(route.title);
        await expect(page.locator('#main-navigation [data-nav-key="moments"]')).toHaveText(route.title);
        await expect(page.locator(".moment-card")).toHaveCount(8);
        const textOnlyCard = page.locator(".moment-card").filter({
          hasText: "A text-only entry keeps the timeline useful when there is no cover image.",
        });
        await expect(textOnlyCard).toHaveCount(1);
        await expect(textOnlyCard.locator(".moment-card__gallery")).toHaveCount(0);
        await expect(page.getByText("This draft must not be published", { exact: false })).toHaveCount(0);

        if (viewport.name === "mobile") {
          await page.locator("#nav-drawer-switch").click();
          await expect(page.locator(".site-drawer__nav").getByRole("link", { name: route.title })).toBeVisible();
          await page.keyboard.press("Escape");
        }

        const search = page.locator(".moment-section__search input");
        await expect(search).toHaveAttribute("placeholder", route.search);
        await search.fill("independent");
        await expect(page.locator(".moment-card")).toHaveCount(1);
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
      await expect(firstTileImage).toHaveAttribute("width", "640");
      await expect(firstTileImage).toHaveAttribute("height", "360");
      await imageTiles.first().click();
      const viewer = twoImageCard.locator(".moment-viewer");
      await expect(viewer).toBeVisible();
      const counter = viewer.locator(".moment-viewer__counter");
      const before = await counter.textContent();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => counter.textContent()).not.toBe(before);
      await page.keyboard.press("Escape");
      await expect(viewer).toHaveCount(0);
      await expect(imageTiles.first()).toBeFocused();
      expect(externalRequests).toEqual([]);
      await context.close();
    });
  }
}
