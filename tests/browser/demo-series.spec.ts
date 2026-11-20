import { expect, test } from "@playwright/test";

for (const [name, origin] of [
  ["root", "http://127.0.0.1:4323"],
  ["nested", "http://127.0.0.1:4324/ALNILAM"],
] as const) {
  test(`demo introductory series is navigable ${name}`, async ({ page }) => {
    await page.goto(`${origin}/posts/hello-alnilam/`);
    const card = page.locator('[data-series-card][data-series-slug="alnilam-introduction"]');
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: "ALNILAM 入门" }).click();
    await expect(page).toHaveURL(`${origin}/series/alnilam-introduction/`);
    const links = page.locator('main a[href*="/posts/"]');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute("href", /\/posts\/hello-alnilam\/$/);
    await expect(links.nth(1)).toHaveAttribute("href", /\/posts\/getting-started\/$/);
    await links.nth(1).click();
    await expect(page).toHaveURL(`${origin}/posts/getting-started/`);
    await expect(page.locator('[data-series-card][data-series-slug="alnilam-introduction"]')).toBeVisible();
  });
}
