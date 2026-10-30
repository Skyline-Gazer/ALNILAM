import {test, expect} from "@playwright/test";

test("intentional browser failure probe", async ({page}, info) => {
  test.skip(process.env.CNB_BROWSER_FORCE_FAILURE !== "1", "Run separately to prove the browser gate fails closed");
  await page.goto("http://127.0.0.1:4323/");
  await expect(page.locator(".home-hero")).toBeVisible();
  const screenshot = info.outputPath("negative-browser.png");
  await page.screenshot({path: screenshot});
  await info.attach("negative-browser", {path: screenshot, contentType: "image/png"});
  expect(false, "CNB_INTENTIONAL_BROWSER_FAILURE").toBe(true);
});
