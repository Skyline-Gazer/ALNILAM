import { test, expect } from "@playwright/test";

// Regression gate for the entry animation (transition.css). A translated entry animation moves
// controls after they are already tappable, and the browser cancels a press whose release lands
// after the shift starts: measured 4/8 lost "previous page" taps on /categories/release/ before
// the animation became opacity-only, 0/8 with `prefers-reduced-motion: reduce` and 0/8 after.
// The deterministic check is the CSS invariant; the press test documents the user-visible effect.

const ORIGINS = ["http://127.0.0.1:4323", "http://127.0.0.1:4324/ALNILAM"];
const LISTING = "/categories/release/";

for (const origin of ORIGINS) {
  const label = new URL(origin).pathname || "/";

  test(`entry animation never translates content ${label}`, async ({ page }) => {
    await page.goto(`${origin}${LISTING}`, { waitUntil: "load" });
    const offenders = await page.evaluate(() => {
      const rows: string[] = [];
      for (const el of document.querySelectorAll(".onload-animation")) {
        for (const animation of el.getAnimations()) {
          const moves = (animation.effect?.getKeyframes?.() ?? []).some(
            (frame) => frame.transform !== undefined && frame.transform !== "none",
          );
          if (moves) rows.push(el.id || el.className.split(" ").slice(0, 2).join("."));
        }
      }
      return rows;
    });
    expect(offenders, "these elements animate a transform while their children are interactive").toEqual([]);

    const delay = await page.locator("#content-wrapper").evaluate((el) => getComputedStyle(el).animationDelay);
    expect(delay).toBe("0s");
  });

  test(`a press that outlives the entry window still navigates ${label}`, async ({ page }) => {
    await page.goto(`${origin}${LISTING}`, { waitUntil: "networkidle" });
    await page.locator('a[href$="/categories/release/2/"]').filter({ visible: true }).first().click();
    const prev = page.locator('a[href$="/categories/release/"]').filter({ visible: true }).first();
    const box = await prev.boundingBox();
    expect(box, "previous-page link must exist on page 2").not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    // Hold long enough that this press would span a 300 ms entry animation starting after it.
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect.poll(() => new URL(page.url()).pathname).toBe(new URL(`${origin}${LISTING}`).pathname);
  });
}
