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
		return {
			overlaps,
			visuallyHidden: style.display === "none" || style.visibility === "hidden",
			scrollHidden: controls.classList.contains("fab-scroll-hidden"),
			textObscured: controls.classList.contains("fab-text-obscured"),
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
			expect(geometry.visuallyHidden, JSON.stringify(geometry)).toBe(shouldHide);
			expect(geometry.textObscured, JSON.stringify(geometry)).toBe(shouldHide);
			expect(geometry.scrollHidden, JSON.stringify(geometry)).toBe(false);
			expect(geometry.ariaHidden).toBe(shouldHide ? "true" : null);
			expect(geometry.inert).toBe(shouldHide);
			expect(geometry.scrollWidth).toBe(geometry.clientWidth);
			await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
			await expect.poll(async () => {
				const state = await inspectOverlap(page);
				return state.visuallyHidden === shouldHide && state.textObscured === shouldHide &&
					!state.scrollHidden && state.inert === shouldHide &&
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
		expect(geometry.visuallyHidden).toBe(true);
		expect(geometry.textObscured).toBe(true);

		await page.setViewportSize({ width: 390, height: 1000 });
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return !state.visuallyHidden && !state.textObscured;
		}).toBe(true);
		geometry = await inspectOverlap(page);
		expect(geometry.overlaps).toHaveLength(0);
		expect(geometry.inert).toBe(false);
		expect(geometry.ariaHidden).toBeNull();

		await page.setViewportSize({ width: 390, height: 844 });
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.visuallyHidden && state.textObscured;
		}).toBe(true);

		const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
		await page.evaluate((top) => scrollTo(0, top), maxScroll);
		await expect.poll(async () => (await inspectOverlap(page)).scrollHidden).toBe(true);
		geometry = await inspectOverlap(page);
		expect(geometry.scrollHidden).toBe(true);
		expect(geometry.inert).toBe(true);
		expect(geometry.ariaHidden).toBe("true");

		await page.evaluate((top) => scrollTo(0, top - 40), maxScroll);
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return !state.scrollHidden && !state.visuallyHidden && !state.textObscured;
		}).toBe(true);
		geometry = await inspectOverlap(page);
		expect(geometry.overlaps).toHaveLength(0);
		expect(geometry.inert).toBe(false);
		expect(geometry.ariaHidden).toBeNull();

		await page.evaluate(() => scrollTo(0, 120));
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.visuallyHidden || state.overlaps.length === 0;
		}).toBe(true);
	} finally {
		await context.close();
	}
});

test("rechecks overlap after scroll-hidden controls finish transitioning back", async ({ browser }, info) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "no-preference",
	});
	const page = await context.newPage();
	const waitForTransformEnd = () => page.locator("#floating-controls").evaluate((element) =>
		new Promise<void>((resolve) => {
			const controls = element as HTMLElement;
			const onTransitionEnd = (event: Event) => {
				const transition = event as TransitionEvent;
				if (transition.target !== controls || transition.propertyName !== "transform") return;
				controls.removeEventListener("transitionend", onTransitionEnd);
				resolve();
			};
			controls.addEventListener("transitionend", onTransitionEnd);
		}),
	);
	try {
		await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		await page.evaluate(() => document.fonts.ready);
		const metrics = await page.evaluate((selector) => {
			const content = document.querySelector<HTMLElement>(".markdown-content[data-pagefind-body]");
			const controls = document.querySelector<HTMLElement>("#floating-controls");
			const button = document.querySelector<HTMLElement>("#fab-toc-btn button");
			const paragraph = content?.querySelector<HTMLElement>("p");
			if (!content || !controls || !button || !paragraph) throw new Error("Transition fixture elements are missing");

			for (const block of content.querySelectorAll<HTMLElement>(selector)) {
				if (block !== paragraph) block.style.visibility = "hidden";
			}
			paragraph.textContent = "x";
			const baseRect = button.getBoundingClientRect();
			const originalTransition = controls.style.transition;
			const wasScrollHidden = controls.classList.contains("fab-scroll-hidden");
			controls.style.transition = "none";
			controls.classList.add("fab-scroll-hidden");
			const hiddenTop = button.getBoundingClientRect().top;
			controls.classList.toggle("fab-scroll-hidden", wasScrollHidden);
			controls.style.transition = originalTransition;
			const travel = hiddenTop - baseRect.top;
			if (travel <= 1) throw new Error("Scroll-hidden transform has no measurable travel");
			Object.assign(paragraph.style, {
				position: "fixed",
				top: `${baseRect.top + travel / 2}px`,
				left: `${baseRect.left + 2}px`,
				margin: "0",
				fontSize: "1px",
				lineHeight: "1px",
				whiteSpace: "nowrap",
			});
			const spacer = document.createElement("div");
			spacer.setAttribute("aria-hidden", "true");
			spacer.style.height = "1600px";
			document.body.append(spacer);
			const durationMs = getComputedStyle(controls).transitionDuration.split(",").reduce((max, value) => {
				const duration = Number.parseFloat(value);
				return Math.max(max, value.trim().endsWith("ms") ? duration : duration * 1000);
			}, 0);
			return { travel, durationMs };
		}, textBlockSelector);
		expect(metrics.travel).toBeGreaterThan(1);
		expect(metrics.durationMs).toBeGreaterThan(0);
		await expect.poll(async () => (await inspectOverlap(page)).overlaps.length).toBeGreaterThan(0);

		const hiddenTransition = waitForTransformEnd();
		await page.evaluate(() => scrollTo(0, 120));
		await expect.poll(async () => (await inspectOverlap(page)).scrollHidden).toBe(true);
		await hiddenTransition;

		const returnTransition = waitForTransformEnd();
		await page.evaluate(() => scrollTo(0, 0));
		await returnTransition;
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.overlaps.length > 0 && state.visuallyHidden && state.textObscured &&
				state.inert && state.ariaHidden === "true";
		}).toBe(true);
		await info.attach("floating-controls-transform-return.png", {
			body: await page.screenshot({ animations: "disabled" }),
			contentType: "image/png",
		});
	} finally {
		await context.close();
	}
});

test("rebuilds obstruction targets when protected content mounts after initialization", async ({ browser }, info) => {
	for (const [name, origin] of [["root", ROOT], ["nested", NESTED]] as const) {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			await page.route("**/en/posts/pagination-sample/", async (route) => {
				const response = await route.fetch();
				const html = await response.text();
				const rewritten = html.replace(
					/class="([^"]*\bmarkdown-content\b[^"]*)"/,
					(_match, classes: string) =>
						`class="${classes.replace(/\bmarkdown-content\b/, "encrypted-post-placeholder")}" style="display:none"`,
				);
				if (rewritten === html) throw new Error("Could not hide the server-rendered article body");
				const headers = { ...response.headers() };
				delete headers["content-length"];
				delete headers["content-encoding"];
				delete headers.etag;
				await route.fulfill({ status: response.status(), headers, body: rewritten });
			});
			const response = await page.goto(`${origin}${ARTICLE}`, { waitUntil: "load" });
			expect(response?.status()).toBe(200);
			await expect(page.locator(".markdown-content[data-pagefind-body]")).toHaveCount(0);

			await page.evaluate(() => {
				const placeholder = document.querySelector<HTMLElement>(".encrypted-post-placeholder");
				if (!placeholder?.parentElement) throw new Error("Protected article placeholder is missing");
				const content = document.createElement("div");
				content.className = "markdown-content";
				content.setAttribute("data-pagefind-body", "");
				const paragraph = document.createElement("p");
				paragraph.textContent = "Decrypted article text must remain visible and unobstructed. ".repeat(100);
				content.append(paragraph);
				placeholder.after(content);
				paragraph.scrollIntoView({ block: "end", behavior: "instant" });
				document.dispatchEvent(new CustomEvent("shirone:toc-synced"));
			});
			await expect.poll(async () => {
				const state = await inspectOverlap(page);
				return state.overlaps.length > 0 && state.visuallyHidden && state.textObscured &&
					state.inert && state.ariaHidden === "true";
			}).toBe(true);
			await info.attach(`floating-controls-${name}-decrypted-content.png`, {
				body: await page.screenshot({ animations: "disabled" }),
				contentType: "image/png",
			});
		} finally {
			await context.close();
		}
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
			expect(geometry.visuallyHidden).toBe(false);

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
