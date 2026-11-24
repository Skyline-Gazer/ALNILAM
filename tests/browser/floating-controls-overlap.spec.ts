import { expect, test, type Page } from "@playwright/test";

// #194 responsive contract for the article reading controls.
//
// Replaces the previous mobile assertions (a floating cluster that must be visible at some widths
// and hidden when it covers text). That contract was unsatisfiable on long articles: the 49 px
// cluster intrudes 45 px into a 264–374 px column, so "no text under a control" and "control
// always discoverable" could not both hold, and which one won depended on host text metrics —
// the same head measured 248 passed / 7 failed in CI and 255 passed locally.
//
// Revised contract, asserted here:
//   · below 768 px: no floating control is rendered at all; the article carries an in-flow
//     contents disclosure and an in-flow back-to-top; both are ≥44 px targets and keyboard operable
//   · at 768 px and above: the floating cluster is unchanged, including #211's TOC panel focus
//     behaviour (open → focus inside → Tab/Shift+Tab contained → Escape restores the trigger)
const ROOT = process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323";
const NESTED = process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/en/posts/getting-started/";
const TOUCH_TARGET = 44;

const mobileWidths = [320, 375, 390, 430, 768, 900];
const desktopWidths = [1024, 1200, 1440];

async function openArticle(page: Page, origin: string) {
  const response = await page.goto(`${origin}${ARTICLE}`, { waitUntil: "load" });
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

for (const [base, origin] of [
  ["root", ROOT],
  ["nested", NESTED],
] as const) {
  for (const width of mobileWidths) {
    test(`mobile reading controls carry no overlay (${base}, ${width}px)`, async ({ browser }, info) => {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      try {
        await openArticle(page, origin);

        // No floating control is rendered, so nothing can cover the reading column.
        await expect(page.locator("#floating-controls")).toBeHidden();
        expect(await page.locator("#floating-controls [data-fab-item]:visible").count()).toBe(0);

        // The in-flow contents disclosure replaces it.
        const disclosure = page.locator("[data-mobile-article-toc]");
        await expect(disclosure).toBeVisible();
        const summary = disclosure.locator("summary");
        // Measure in CSS pixels: with `isMobile`, a page wider than the viewport is scaled down and
        // Playwright's boundingBox() reports device-independent pixels (44 CSS px read as 38.5).
        expect(await summary.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(TOUCH_TARGET);

        await summary.click();
        await expect(disclosure).toHaveAttribute("open", "");
        const anchors = disclosure.locator("nav a");
        expect(await anchors.count()).toBeGreaterThan(0);
        const anchorHeights = await anchors.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
        for (const height of anchorHeights) {
          expect(height, "TOC anchors must meet the 44 px target").toBeGreaterThanOrEqual(TOUCH_TARGET);
        }

        // Following a heading link navigates within the document.
        await anchors.first().click();
        await expect(page).toHaveURL(/#.+/);

        // Keyboard: the summary is reachable and toggles with Enter.
        await summary.focus();
        await expect(summary).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(disclosure).not.toHaveAttribute("open", "");

        // The end-of-article action is in the flow, not floating over it.
        const top = page.locator("[data-article-top]");
        await expect(top).toBeAttached();
        expect(await top.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(TOUCH_TARGET);
        // In the flow, not an overlay: `relative` is fine (the state layer needs it), fixed or
        // absolute are not.
        expect(await top.evaluate((el) => ["fixed", "absolute"].includes(getComputedStyle(el).position))).toBe(false);

        await info.attach(`mobile-controls-${base}-${width}.png`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      } finally {
        await context.close();
      }
    });
  }

  test(`desktop floating controls and TOC focus are unchanged (${base})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await openArticle(page, origin);
      const controls = page.locator("#floating-controls");
      // The cluster is present at and above `lg`; whether the obstruction rule then hides it
      // depends on the article, and that behaviour is covered by the 1440 px lifecycle test.
      expect(await controls.evaluate((el) => getComputedStyle(el).display)).toBe("flex");
      await expect(page.locator("[data-mobile-article-toc]")).toBeHidden();

      // #211: opening the panel moves focus inside it, keeps Tab contained, restores on close.
      const button = page.locator("#fab-toc-btn button");
      const panel = page.locator("#floating-toc-panel");
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(panel).toHaveAttribute("aria-hidden", "false");
      expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Shift+Tab");
      await expect(panel.getByRole("link").last()).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(panel.getByRole("button").first()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(panel).toHaveAttribute("aria-hidden", "true");
      await expect(button).toBeFocused();
    } finally {
      await context.close();
    }
  });

  test(`the 1024px breakpoint is the exact switch (${base})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await openArticle(page, origin);
      const controls = page.locator("#floating-controls");
      const state = await controls.evaluate((el) => ({
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility,
        inert: el.hasAttribute("inert"),
      }));
      expect(state.display).toBe("flex");
      expect(state.visibility).toBe("visible");
      expect(state.inert).toBe(false);
      await expect(page.locator("[data-mobile-article-toc]")).toBeHidden();
    } finally {
      await context.close();
    }
  });
}

for (const width of desktopWidths) {
  test(`no floating control overlaps article text at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await openArticle(page, ROOT);
      const overlaps = await page.evaluate(() => {
        const content = document.querySelector(".markdown-content");
        const controls = document.getElementById("floating-controls");
        if (!content || !controls) return [];
        const buttons = [...controls.querySelectorAll<HTMLElement>("[data-fab-item]")]
          .filter((item) => {
            const style = getComputedStyle(item);
            return style.display !== "none" && style.visibility !== "hidden";
          })
          .map((item) => (item.querySelector("button") ?? item).getBoundingClientRect());
        const hits: string[] = [];
        const range = document.createRange();
        for (const block of content.querySelectorAll("p,li,h1,h2,h3,pre,blockquote,td")) {
          for (const button of buttons) {
            const rect = block.getBoundingClientRect();
            if (
              Math.min(rect.right, button.right) - Math.max(rect.left, button.left) > 0 &&
              Math.min(rect.bottom, button.bottom) - Math.max(rect.top, button.top) > 0
            ) {
              hits.push(block.textContent?.trim().slice(0, 40) ?? "?");
              break;
            }
          }
        }
        return hits;
      });
      // At and above the breakpoint the column is narrower than the viewport, so the cluster sits
      // in the margin. Any hit here is a real regression of the desktop layout.
      expect(overlaps).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
