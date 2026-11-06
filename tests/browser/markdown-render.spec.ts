import { expect, test, type Page } from "@playwright/test";

/**
 * Markdown render regression (Issue #66, P4/T05).
 *
 * Two demo posts exercise the covered #66 features through the real build
 * pipeline while keeping feature stylesheets split across documents:
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

async function expectUniqueFeatureStyles(page: Page) {
	const hrefs = await page.locator('link[rel="stylesheet"][data-swup-optional]').evaluateAll((links) =>
		links.map((link) => (link as HTMLLinkElement).href),
	);
	expect(hrefs.length).toBeGreaterThan(0);
	expect(new Set(hrefs).size).toBe(hrefs.length);
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
			await expect(code).toHaveCount(1);
			await expect(code.locator("pre")).toBeVisible();
			await expect(code.locator(".ec-line").first()).toBeVisible();

			// Table renders with header cells.
			await expect(page.locator(".markdown-content thead th")).toHaveCount(2);

			// The fixture SVG has known intrinsic dimensions and meaningful alt text.
			const img = page.locator(".markdown-content img");
			await expect(img).toHaveCount(1);
			await expect(img).toBeVisible();
			await expect(img).toHaveAttribute("width", "640");
			await expect(img).toHaveAttribute("height", "360");
			await expect(img).toHaveAttribute("alt", "示例图片");

			const article = page.locator(".markdown-content");
			await expect(article.getByRole("link", { name: "安全外链" })).toHaveAttribute("href", "https://example.org/markdown");
			expect(decodeURIComponent((await article.getByRole("link", { name: "站内锚点" }).getAttribute("href")) ?? "")).toBe("#表格");
			await expect(article.getByRole("link", { name: "邮件链接" })).toHaveAttribute("href", "mailto:hello@example.org");
			for (const text of ["不安全链接", "不安全引用链接"]) {
				const unsafe = article.getByText(text, { exact: true });
				await expect(unsafe).toBeVisible();
				await expect(unsafe).not.toHaveAttribute("href", /.+/);
			}
			const blankLinks = article.locator('a[target="_blank"]');
			for (const link of await blankLinks.all()) {
				await expect(link).toHaveAttribute("rel", /\bnoopener\b/);
			}
			await expectUniqueFeatureStyles(page);

			// The TOC is visible.
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

			// One source diagram produces one rendered SVG.
			const mermaidSvg = page.locator('.markdown-content [data-mermaid][data-mermaid-state="ready"] .markdown-mermaid__diagram svg');
			await expect(mermaidSvg).toHaveCount(1);
			await expect(mermaidSvg).toBeVisible();
			await expectUniqueFeatureStyles(page);

			// Record the actual font payload without imposing an arbitrary budget.
			await page.evaluate(() => document.fonts.ready);
			const fonts = await page.evaluate(() => performance.getEntriesByType("resource")
				.filter((entry) => /\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(entry.name))
				.map((entry) => ({ url: entry.name, bytes: (entry as PerformanceResourceTiming).encodedBodySize })));
			expect(fonts.length).toBeGreaterThan(0);
			expect(fonts.reduce((total, font) => total + font.bytes, 0)).toBeGreaterThan(0);
			await info.attach(`markdown-font-payload-${name}.json`, { body: JSON.stringify(fonts, null, 2), contentType: "application/json" });

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
