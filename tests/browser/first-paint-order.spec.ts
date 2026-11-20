import { expect, test, type Page } from "@playwright/test";
import { observeLayoutShifts, assertCLSBudget, CLS_BUDGET } from "../../scripts/ci/cnb-metrics.mjs";

// Regression guard for the mobile CLS defect (PR #48 / dev): the mobile sidebar
// (grid row 2, below the article) used to be FIRST in the document, so on a slow
// parse the browser painted it above the fold at a position derived from a
// half-parsed article; every later-parsed article block then pushed the already
// painted aside down (two shifts in one CLS window, ~0.55 CLS at 8x CPU).
//
// The fix aligns document/parse order with mobile visual order (content ->
// sidebar -> footer) while desktop keeps explicit lg:/xl: col-start/row-start.
// These tests deterministically reproduce the slow-parse first paint.
const RATE = 8;

for (const origin of ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"]) {
  const path = new URL(origin).pathname;
  test(`slow-parse mobile load stays within CLS budget ${path} 390`, async ({ browser }, info) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await context.addInitScript(observeLayoutShifts);
    const page: Page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
    try {
      await page.goto(`${origin}/posts/getting-started/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      const shifts = await page.evaluate("window.__cnbShifts || []");
      const sidebarShifts = shifts.filter(
        (e) =>
          e.hadRecentInput === false &&
          (e.sources || []).some((s) => s.id === "sidebar"),
      );
      // The already-painted aside must never be displaced after first paint.
      expect(sidebarShifts, "sidebar was pushed after first paint").toEqual([]);
      const cls = assertCLSBudget(shifts, CLS_BUDGET);
      await info.attach("first-paint-cls.json", {
        body: JSON.stringify({ origin, width: 390, rate: RATE, cls, shiftCount: shifts.length, shifts }, null, 2),
        contentType: "application/json",
      });
    } finally {
      await context.close();
    }
  });

  test(`mobile document order is content before sidebar ${path} 390`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce", hasTouch: true });
    const page: Page = await context.newPage();
    await page.goto(`${origin}/posts/getting-started/`, { waitUntil: "load" });
    await page.locator("#sidebar").waitFor();
    await page.locator("#main-content-column").waitFor();
    const order = await page.evaluate(() => {
      const grid = document.getElementById("main-grid");
      if (!grid) return null;
      const kids = [...grid.children].map((c) => c.id || c.className.split(" ")[0]);
      return { kids, contentIndex: kids.indexOf("main-content-column"), sidebarIndex: kids.indexOf("sidebar") };
    });
    expect(order, "main-grid children").not.toBeNull();
    // Parse order: content precedes the sidebar so the (visually lower) aside is
    // never painted before the article above it has finished parsing.
    expect(order!.contentIndex).toBeLessThan(order!.sidebarIndex);
    // Visual order on mobile is unchanged: aside still sits below the article.
    const boxes = await page.evaluate(() => {
      const y = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().y;
      return { content: y("#main-content-column"), sidebar: y("#sidebar") };
    });
    expect(boxes.sidebar).toBeGreaterThan(boxes.content);
    await context.close();
  });
}
