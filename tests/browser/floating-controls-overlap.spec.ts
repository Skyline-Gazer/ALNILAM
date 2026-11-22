import { expect, test, type Page } from "@playwright/test";

const ROOT = process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323";
const NESTED = process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324/ALNILAM";
const ARTICLE = "/en/posts/pagination-sample/";
const textBlockSelector = "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th,figcaption,dt,dd";

const overlapCases = [
	{ width: 320, height: 800, theme: "light", expectOverlap: "required" },
	{ width: 375, height: 812, theme: "dark", expectOverlap: "required" },
	{ width: 390, height: 844, theme: "light", expectOverlap: "required" },
	{ width: 430, height: 932, theme: "dark", expectOverlap: "measured" },
] as const;

async function inspectOverlap(page: Page) {
	return page.evaluate((textSelector) => {
		const content = document.querySelector<HTMLElement>(".markdown-content[data-pagefind-body]");
		const controls = document.querySelector<HTMLElement>("#floating-controls");
		if (!content || !controls) throw new Error("Article text or floating controls are missing");

		const items = [...controls.querySelectorAll<HTMLElement>("[data-fab-item]")].filter((item) => {
			const slot = item.closest<HTMLElement>("[data-fab-slot]") ?? item;
			return getComputedStyle(item).display !== "none" &&
				!item.classList.contains("is-hidden") &&
				!item.classList.contains("is-page-hidden") &&
				!slot.classList.contains("hidden") &&
				item.dataset.fabPageAllowed !== "false" &&
				item.dataset.fabScrollAllowed !== "false";
		});
		const buttons = items.map((item) => {
			const rect = (item.querySelector("button") ?? item).getBoundingClientRect();
			return { id: item.id || item.dataset.fabType || "unknown", left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
		});
		const overlaps: Array<{ button: string; text: string; width: number; height: number }> = [];
		const range = document.createRange();
		for (const block of content.querySelectorAll<HTMLElement>(textSelector)) {
			const blockRect = block.getBoundingClientRect();
			if (!buttons.some((button) =>
				Math.min(blockRect.right, button.right) > Math.max(blockRect.left, button.left) &&
				Math.min(blockRect.bottom, button.bottom) > Math.max(blockRect.top, button.top)
			)) continue;

			const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
			while (walker.nextNode()) {
				const node = walker.currentNode;
				if (!node.textContent?.trim()) continue;
				range.selectNodeContents(node);
				for (const textRect of range.getClientRects()) {
					for (const button of buttons) {
						const width = Math.min(textRect.right, button.right) - Math.max(textRect.left, button.left);
						const height = Math.min(textRect.bottom, button.bottom) - Math.max(textRect.top, button.top);
						if (width > 0 && height > 0) overlaps.push({
							button: button.id,
							text: node.textContent.trim().slice(0, 50),
							width,
							height,
						});
					}
				}
			}
		}

		const style = getComputedStyle(controls);
		const hidden = style.display === "none" || style.visibility === "hidden" ||
			controls.hasAttribute("inert") || controls.getAttribute("aria-hidden") === "true";
		return {
			overlaps,
			hidden,
			inert: controls.hasAttribute("inert"),
			ariaHidden: controls.getAttribute("aria-hidden"),
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		};
	}, textBlockSelector);
}

for (const { width, height, theme, expectOverlap } of overlapCases) {
	test(`matches control visibility to article text overlap at ${width}x${height} (${theme})`, async ({ browser }, info) => {
		const context = await browser.newContext({
			viewport: { width, height },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		await context.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
		const page = await context.newPage();
		try {
			const response = await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
			expect(response?.status()).toBe(200);
			await expect(page.locator(".markdown-content[data-pagefind-body]")).toBeVisible();
			await page.evaluate(() => document.fonts.ready);
			expect(await page.locator("html").evaluate((html) => html.classList.contains("dark"))).toBe(theme === "dark");
			await info.attach(`floating-controls-${width}x${height}-${theme}.png`, {
				body: await page.screenshot({ animations: "disabled" }),
				contentType: "image/png",
			});

			const geometry = await inspectOverlap(page);
			const shouldHide = geometry.overlaps.length > 0;
			if (expectOverlap === "required") expect(shouldHide).toBe(true);
			expect(geometry.hidden, JSON.stringify(geometry)).toBe(shouldHide);
			expect(geometry.ariaHidden).toBe(shouldHide ? "true" : null);
			expect(geometry.inert).toBe(shouldHide);
			expect(geometry.scrollWidth).toBe(geometry.clientWidth);
			await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
			await expect.poll(async () => {
				const state = await inspectOverlap(page);
				return state.hidden === shouldHide && state.inert === shouldHide &&
					state.ariaHidden === (shouldHide ? "true" : null);
			}).toBe(true);
			const focusResult = await page.locator("#fab-toc-btn button").evaluate((button) => {
				(button as HTMLElement).focus();
				return document.activeElement === button;
			});
			expect(focusResult).toBe(!shouldHide);
		} finally {
			await context.close();
		}
	});
}

test("rechecks mobile article overlap after viewport and scroll changes", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "reduce",
	});
	const page = await context.newPage();
	const nextFrame = () => page.evaluate(() => new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	));
	try {
		await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		await page.evaluate(() => document.fonts.ready);
		let geometry = await inspectOverlap(page);
		expect(geometry.overlaps.length).toBeGreaterThan(0);
		expect(geometry.hidden).toBe(true);

		await page.setViewportSize({ width: 390, height: 1000 });
		await expect.poll(async () => (await inspectOverlap(page)).hidden).toBe(false);
		geometry = await inspectOverlap(page);
		expect(geometry.overlaps).toHaveLength(0);

		await page.setViewportSize({ width: 390, height: 844 });
		await expect.poll(async () => (await inspectOverlap(page)).hidden).toBe(true);

		const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
		await page.evaluate((top) => scrollTo(0, top), maxScroll);
		await nextFrame();
		geometry = await inspectOverlap(page);
		expect(geometry.hidden).toBe(true);

		await page.evaluate((top) => scrollTo(0, top - 40), maxScroll);
		await expect.poll(async () => (await inspectOverlap(page)).hidden).toBe(false);
		geometry = await inspectOverlap(page);
		expect(geometry.overlaps).toHaveLength(0);

		await page.evaluate(() => scrollTo(0, 120));
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.hidden || state.overlaps.length === 0;
		}).toBe(true);
	} finally {
		await context.close();
	}
});

test("keeps clear controls discoverable to keyboard and touch on root and nested paths", async ({ browser }) => {
	for (const origin of [ROOT, NESTED]) {
		const context = await browser.newContext({
			viewport: { width: 390, height: 1000 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			const response = await page.goto(`${origin}${ARTICLE}`, { waitUntil: "load" });
			expect(response?.status()).toBe(200);
			await page.evaluate(() => document.fonts.ready);
			const geometry = await inspectOverlap(page);
			expect(geometry.overlaps).toHaveLength(0);
			expect(geometry.hidden).toBe(false);

			const button = page.locator("#fab-toc-btn button");
			await button.focus();
			await page.keyboard.press("Enter");
			await expect(page.locator("#floating-toc-panel")).toHaveAttribute("aria-hidden", "false");
			await page.keyboard.press("Escape");
			await expect(page.locator("#floating-toc-panel")).toHaveAttribute("aria-hidden", "true");
			await expect(button).toBeFocused();

			const box = await button.boundingBox();
			expect(box).not.toBeNull();
			await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
			await expect(page.locator("#floating-toc-panel")).toHaveAttribute("aria-hidden", "false");
		} finally {
			await context.close();
		}
	}
});

test("keeps floating controls unchanged at the 768px breakpoint", async ({ browser }, info) => {
	const context = await browser.newContext({
		viewport: { width: 768, height: 900 },
		reducedMotion: "reduce",
	});
	const page = await context.newPage();
	try {
		const response = await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);
		const controls = page.locator("#floating-controls");
		await expect(controls).toBeVisible();
		const state = await controls.evaluate((element) => ({
			visibility: getComputedStyle(element).visibility,
			display: getComputedStyle(element).display,
			inert: element.hasAttribute("inert"),
			ariaHidden: element.getAttribute("aria-hidden"),
			textObscured: element.classList.contains("fab-text-obscured"),
		}));
		expect(state.visibility).toBe("visible");
		expect(state.display).not.toBe("none");
		expect(state.inert).toBe(false);
		expect(state.ariaHidden).not.toBe("true");
		expect(state.textObscured).toBe(false);
		await info.attach("floating-controls-768x900.png", {
			body: await page.screenshot({ animations: "disabled" }),
			contentType: "image/png",
		});
	} finally {
		await context.close();
	}
});
