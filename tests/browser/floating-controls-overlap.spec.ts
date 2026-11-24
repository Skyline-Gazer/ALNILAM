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
//   · below 1024 px (`lg`): no floating control is rendered at all; the article carries an in-flow
//     contents disclosure and an in-flow back-to-top; both are ≥44 px targets and keyboard operable
//   · at 1024 px (`lg`) and above: the floating cluster is unchanged, including #211's TOC panel focus
//     behaviour (open → focus inside → Tab/Shift+Tab contained → Escape restores the trigger)
const ROOT = process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323";
const NESTED = process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/en/posts/getting-started/";
const TOUCH_TARGET = 44;

const mobileWidths = [320, 375, 390, 430, 767, 768, 900, 1023];
const desktopWidths = [1024, 1200, 1280, 1440];

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

  test(`desktop keeps the floating cluster (${base})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await openArticle(page, origin);
      // The cluster, its configuration and the TOC panel are unchanged at and above `lg`; this PR
      // only stops rendering them below it. The TOC item itself is configured per Site — in the
      // Demo it is mobile-only, so what is asserted here is the cluster's presence, not the item.
      const controls = page.locator("#floating-controls");
      const state = await controls.evaluate((el) => ({
        display: getComputedStyle(el).display,
        inert: el.hasAttribute("inert"),
      }));
      expect(state.display).toBe("flex");
      expect(state.inert).toBe(false);
      await expect(page.locator("[data-mobile-article-toc]")).toBeHidden();
      expect(await page.locator("[data-article-top]").isVisible()).toBe(false);
    } finally {
      await context.close();
    }
  });

  test(`the 1024px breakpoint is the exact switch and desktop TOC preserves #211 focus containment (${base})`, async ({ browser }) => {
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

test("desktop-enabled floating TOC preserves #211 keyboard focus containment and mobile/desktop handoff", async ({ browser }) => {
  // The bundled Demo configures `toc` for `["mobile", "tablet"]` (desktop uses the sidebar TOC), so
  // FloatingControls omits the unreachable mobile floating TOC DOM. Verify #211's desktop floating
  // TOC dialog focus trap, Escape return, and 1023px <-> 1024px handoff by serving an article page
  // with the desktop floating TOC slot active.
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await openArticle(page, ROOT);
    // Inject the desktop-enabled floating TOC slot into #floating-controls and re-bind FabController
    // so a Site that enables `toc` on `desktop` is exercised end-to-end at >=1024px.
    await page.evaluate(() => {
      const controls = document.getElementById("floating-controls");
      if (!controls) throw new Error("missing #floating-controls");
      const slot = document.createElement("div");
      slot.setAttribute("data-fab-slot", "");
      slot.className = "relative flex";
      slot.innerHTML = `
        <div id="floating-toc-panel" class="m3-floating-toc-panel" role="dialog" aria-modal="true" aria-label="Table of Contents" aria-hidden="true" inert tabindex="-1" data-toc-close-on-select="true" data-toc-max-depth="3" data-empty-label="No data">
          <div class="m3-floating-toc-panel__header">
            <h3 class="m3-floating-toc-panel__title">Table of Contents</h3>
            <button id="floating-toc-close-btn" type="button" class="m3-floating-toc-close m3-state-layer" aria-label="Close">×</button>
          </div>
          <div id="floating-toc-scroll-content" class="m3-floating-toc-panel__content">
            <div id="floating-toc-tree" class="m3-floating-toc-tree"></div>
          </div>
        </div>
        <div id="fab-toc-btn" data-fab-item data-fab-slot data-fab-type="toc" data-fab-pages="post" class="m3-fab-item items-center justify-center flex">
          <button type="button" class="m3-fab m3-fab--primary m3-fab--regular m3-state-layer" aria-label="Table of Contents" aria-expanded="false" aria-controls="floating-toc-panel">TOC</button>
        </div>
      `;
      controls.prepend(slot);
      const fab = (window as unknown as { __shironeFab?: { bound?: boolean; init?: () => void } }).__shironeFab;
      if (fab) {
        fab.bound = false;
        fab.init?.();
      }
    });

    const button = page.locator("#fab-toc-btn button");
    const panel = page.locator("#floating-toc-panel");
    await expect(button).toBeVisible();
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    // #211 focus containment: Shift+Tab wraps to last link, Tab wraps back to first button
    await page.keyboard.press("Shift+Tab");
    await expect(panel.getByRole("link").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("button").first()).toBeFocused();

    // Escape closes and returns focus to trigger button
    await page.keyboard.press("Escape");
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect(button).toBeFocused();

    // Handoff across 1024px -> 1023px -> 1024px
    await page.setViewportSize({ width: 1023, height: 900 });
    await expect(page.locator("#floating-controls")).toBeHidden();
    await expect(page.locator("[data-mobile-article-toc]")).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.locator("#floating-controls")).toBeVisible();
    await expect(page.locator("[data-mobile-article-toc]")).toBeHidden();
  } finally {
    await context.close();
  }
});
