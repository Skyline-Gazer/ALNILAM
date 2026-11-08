import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origins = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"] as const;
const viewports = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;
const routes = ["/", "/posts/", "/posts/hello-alnilam/", "/search/", "/tags/"] as const;
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
