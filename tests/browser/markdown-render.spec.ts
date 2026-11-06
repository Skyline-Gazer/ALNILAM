import { expect, test, type Page } from "@playwright/test";

/**
 * Markdown render regression (Issue #66, P4/T05).
 *
 * Two demo posts exercise every #66 acceptance surface through the real build
 * pipeline without aggregating all feature stylesheets into one document:
 * - fixture-alpha-zh: expressive-code block, TOC headings, table, image.
 * - fixture-beta-zh: KaTeX inline + display math, mermaid diagram.
 * Runs at 1440px desktop on both root and /ALNILAM/ deployments.
 */

const deployments = [
	["root", "http://127.0.0.1:4323"],
	["nested", "http://127.0.0.1:4324/ALNILAM"],
] as const;

const CODE_TOC = "/posts/fixture-alpha-zh/";
const MATH_MERMAID = "/posts/fixture-beta-zh/";

async function openArticle(page: Page, origin: string, route: string) {
	await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
	await expect(page.locator(".markdown-content")).toBeVisible();
}

for (const [name, origin] of deployments) {
	test(`code block, toc, table and image render ${name}`, async ({ browser }, info) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		const errors: string[] = [];
		page.on("pageerror", (e) => errors.push(String(e)));
		try {
			await openArticle(page, origin, CODE_TOC);

			// Expressive Code renders highlighted lines and tokens.
			const code = page.locator(".markdown-content .expressive-code");
			await expect(code.locator("pre")).toBeVisible();
			await expect(code.locator(".ec-line").first()).toBeVisible();

			// Table renders with header cells.
			await expect(page.locator(".markdown-content thead th")).toHaveCount(2);

			// Image carries explicit width/height (CLS guard) and an alt.
			const img = page.locator(".markdown-content img").first();
			await expect(img).toBeVisible();
			expect(Number(await img.getAttribute("width"))).toBeGreaterThan(0);
			expect(Number(await img.getAttribute("height"))).toBeGreaterThan(0);
			await expect(img).toHaveAttribute("alt", /./);

			// TOC lists the document headings.
			await expect(page.locator("#toc, .toc, [data-toc]").first()).toBeVisible();

			// Article is self-canonical and in the sitemap.
			expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(
				`https://example.com${new URL(origin).pathname.replace(/\/$/, "")}${CODE_TOC}`,
			);
			const sitemap = await (await page.request.get(`${origin}/sitemap-0.xml`)).text();
			expect(sitemap).toContain(CODE_TOC);

			expect(errors).toEqual([]);
			const shot = info.outputPath(`markdown-code-toc-${name}.png`);
			await page.screenshot({ path: shot, fullPage: true, animations: "disabled" });
			await info.attach(`markdown-code-toc-${name}.png`, { path: shot, contentType: "image/png" });
		} finally {
			await context.close();
		}
	});

	test(`katex and mermaid render ${name}`, async ({ browser }, info) => {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
		const page = await context.newPage();
		const errors: string[] = [];
		page.on("pageerror", (e) => errors.push(String(e)));
		try {
			await openArticle(page, origin, MATH_MERMAID);

			// KaTeX: inline and display math render as katex elements.
			await expect(page.locator(".markdown-content .katex")).toHaveCount(2);

			// Mermaid renders an svg (not the raw code fence).
			const mermaidSvg = page.locator('.markdown-content [data-mermaid][data-mermaid-state="ready"] .markdown-mermaid__diagram svg');
			await expect(mermaidSvg.first()).toBeVisible();

			// Article is self-canonical and in the sitemap.
			expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(
				`https://example.com${new URL(origin).pathname.replace(/\/$/, "")}${MATH_MERMAID}`,
			);
			const sitemap = await (await page.request.get(`${origin}/sitemap-0.xml`)).text();
			expect(sitemap).toContain(MATH_MERMAID);

			expect(errors).toEqual([]);
			const shot = info.outputPath(`markdown-math-mermaid-${name}.png`);
			await page.screenshot({ path: shot, fullPage: true, animations: "disabled" });
			await info.attach(`markdown-math-mermaid-${name}.png`, { path: shot, contentType: "image/png" });
		} finally {
			await context.close();
		}
	});
}
