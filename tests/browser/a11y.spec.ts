import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origins = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"] as const;
const viewports = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;
const routes = ["/", "/posts/2/", "/posts/hello-alnilam/", "/en/posts/getting-started/", "/search/", "/tags/"] as const;
const hardImpacts: Record<string, true> = { critical: true, serious: true };

async function analyze(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const hard = results.violations.filter((v) => hardImpacts[String(v.impact)] === true);
  const soft = results.violations.filter((v) => hardImpacts[String(v.impact)] !== true);
  if (soft.length) {
    console.log(
      `axe soft findings (${soft.length}):`,
      soft.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`).join(", "),
    );
  }
  return hard;
}

for (const origin of origins) {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`axe critical/serious ${new URL(origin).pathname || "/"} ${viewport.width}${route}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        try {
          const response = await page.goto(origin + route, { waitUntil: "networkidle" });
          expect(response?.status(), `${origin}${route}`).toBe(200);
          expect(await analyze(page)).toEqual([]);
        } finally {
          await context.close();
        }
      });
    }
  }
}

test("axe critical/serious home prefers-reduced-motion", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto("http://127.0.0.1:4323/", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    expect(await analyze(page)).toEqual([]);
  } finally {
    await context.close();
  }
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const origin of origins) {
  test(
    `mobile pagination name includes visible page range at ${new URL(origin).pathname || "/"}`,
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(origin + "/", { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      const jump = page.locator(".m3-blog-pagination__mobile .m3-blog-pagination__jump");
      await expect(jump).toBeVisible();
      const visibleRange = (await jump.innerText()).replace(/\s+/g, "");
      await expect(jump).toHaveAccessibleName(new RegExp(escapeRegex(visibleRange)));
      const actionLabel = await jump.getAttribute("data-jump-label");
      expect(actionLabel).toBeTruthy();
      await jump.click();
      await expect(page.locator(".m3-blog-pagination__jump-input")).toHaveAccessibleName(actionLabel!);
    },
  );
  test(
    `series navigation names include visible titles and position text at ${new URL(origin).pathname || "/"}`,
    async ({ page }) => {
      const response = await page.goto(origin + "/posts/hello-alnilam/", { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      const rows = page.locator("a.series-card__row");
      expect(await rows.count()).toBeGreaterThan(0);
      for (const row of await rows.all()) {
        const title = (await row.locator(".series-card__row-title").innerText())
          .replace(/\s+/g, " ")
          .trim();
        const part = (await row.locator(".series-card__row-meta").innerText())
          .replace(/\s+/g, " ")
          .trim();
        await expect(row).toHaveAccessibleName(
          new RegExp(`${escapeRegex(title)}.*${escapeRegex(part)}`, "s"),
        );
      }
    },
  );
}

for (const origin of origins) {
  test(
    `tag link names include visible tag and count at ${new URL(origin).pathname || "/"}`,
    async ({ page }) => {
      const response = await page.goto(origin + "/tags/", { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      const chips = page.locator("a.tag-index__chip");
      expect(await chips.count()).toBeGreaterThan(0);
      for (const chip of await chips.all()) {
        const visibleLabel = (await chip.innerText()).replace(/\s+/g, " ").trim();
        await expect(chip).toHaveAccessibleName(new RegExp(escapeRegex(visibleLabel)));
      }
    },
  );
}
