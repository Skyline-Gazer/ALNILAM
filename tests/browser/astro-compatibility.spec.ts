import { expect, test } from "@playwright/test";

const deployments = [
  ["root", "http://127.0.0.1:4323"],
  ["nested", "http://127.0.0.1:4324/ALNILAM"],
] as const;

for (const [name, origin] of deployments) {
  test(`external Astro MDX fixture renders at ${name}`, async ({ page }) => {
    const response = await page.goto(`${origin}/posts/astro-compatibility/`, { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveText("Astro Compatibility MDX");
    await expect(page.locator('[data-astro-compatibility="mdx"]')).toHaveText("MDX fixture rendered by Astro.");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  });
}
