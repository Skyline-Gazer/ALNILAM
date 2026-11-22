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
		const content = document.querySelector<HTMLElement>(".markdown-content");
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

async function overlapArticleTextWithTocButton(page: Page): Promise<void> {
	await page.evaluate(() => {
		const paragraph = document.querySelector<HTMLElement>(".markdown-content p");
		const button = document.querySelector<HTMLElement>("#fab-toc-btn button");
		if (!paragraph || !button) throw new Error("Article paragraph or TOC button is missing");
		const buttonRect = button.getBoundingClientRect();
		const paragraphRect = paragraph.getBoundingClientRect();
		Object.assign(paragraph.style, {
			position: "relative",
			top: `${buttonRect.top + 1 - paragraphRect.top}px`,
			left: `${buttonRect.left + 1 - paragraphRect.left}px`,
			margin: "0",
			fontSize: "16px",
			lineHeight: "20px",
			whiteSpace: "nowrap",
		});
	});
	await expect.poll(async () => {
		const state = await inspectOverlap(page);
		return state.overlaps.length > 0 && !state.visuallyHidden && !state.inert;
	}).toBe(true);
}

async function expectArticleTextFocused(page: Page): Promise<void> {
	const focus = await page.evaluate(() => {
		const active = document.activeElement;
		return {
			isBody: active === document.body,
			inControls: Boolean(active && document.getElementById("floating-controls")?.contains(active)),
			inArticle: active instanceof HTMLElement && Boolean(active.closest(".markdown-content")),
			text: active?.textContent?.trim() ?? "",
		};
	});
	expect(focus.isBody).toBe(false);
	expect(focus.inControls).toBe(false);
	expect(focus.inArticle).toBe(true);
	expect(focus.text.length).toBeGreaterThan(0);
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
				if (block !== paragraph) block.style.display = "none";
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
			paragraph.style.display = "none";
			const fontSize = `${Math.max(1, Math.floor(travel / 2))}px`;
			Object.assign(paragraph.style, {
				margin: "0",
				fontSize,
				lineHeight: fontSize,
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
			return { travel, durationMs, baseLeft: baseRect.left, hiddenTop };
		}, textBlockSelector);
		expect(metrics.travel).toBeGreaterThan(1);
		expect(metrics.durationMs).toBeGreaterThan(0);
		await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.overlaps.length === 0 && !state.visuallyHidden && !state.textObscured;
		}).toBe(true);

		await page.evaluate(() => scrollTo(0, 120));
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			const top = await page.locator("#fab-toc-btn button").evaluate((button) => button.getBoundingClientRect().top);
			return state.scrollHidden && Math.abs(top - metrics.hiddenTop) <= 1;
		}).toBe(true);
		await page.evaluate(({ baseLeft, hiddenTop, travel }) => {
			const paragraph = document.querySelector<HTMLElement>(".markdown-content[data-pagefind-body] p");
			if (!paragraph) throw new Error("Transition fixture paragraph is missing");
			paragraph.style.display = "";
			paragraph.style.position = "relative";
			const range = document.createRange();
			range.selectNodeContents(paragraph);
			const textRect = range.getBoundingClientRect();
			if (textRect.height >= travel - 1) throw new Error("Transition fixture text is taller than the control travel");
			// Place the glyph inside the visible endpoint while the scroll-hidden endpoint stays clear.
			const visibleControlTop = hiddenTop - travel;
			paragraph.style.top = `${visibleControlTop + 2 - window.scrollY - textRect.top}px`;
			paragraph.style.left = `${baseLeft + 2 - textRect.left}px`;
		}, { baseLeft: metrics.baseLeft, hiddenTop: metrics.hiddenTop, travel: metrics.travel });
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.scrollHidden && state.overlaps.length === 0 && !state.textObscured;
		}).toBe(true);

		const midpoint = await page.evaluate((travel) => {
			const controls = document.getElementById("floating-controls");
			if (!controls) throw new Error("Floating controls are missing");
			return new Promise<{
				transformOffset: number;
				visibility: string;
				textObscured: boolean;
				inert: boolean;
				ariaHidden: string | null;
			}>((resolve, reject) => {
				let timeout: number;
				const cleanup = () => {
					window.clearTimeout(timeout);
					controls.removeEventListener("transitionrun", onTransitionRun);
				};
				const sample = () => {
					const transform = getComputedStyle(controls).transform;
					const transformOffset =
						transform === "none" ? 0 : new DOMMatrixReadOnly(transform).f;
					if (transformOffset > 1 && transformOffset < travel - 1) {
						cleanup();
						resolve({
							transformOffset,
							visibility: getComputedStyle(controls).visibility,
							textObscured: controls.classList.contains("fab-text-obscured"),
							inert: controls.hasAttribute("inert"),
							ariaHidden: controls.getAttribute("aria-hidden"),
						});
					} else {
						requestAnimationFrame(sample);
					}
				};
				const onTransitionRun = (event: TransitionEvent) => {
					if (event.target !== controls || event.propertyName !== "transform") return;
					requestAnimationFrame(sample);
				};
				controls.addEventListener("transitionrun", onTransitionRun);
				timeout = window.setTimeout(() => {
					cleanup();
					reject(new Error("Control return transform did not reach its midpoint"));
				}, 1500);
				window.scrollTo(0, 0);
			});
		}, metrics.travel);
		expect(midpoint.transformOffset).toBeGreaterThan(1);
		expect(midpoint.transformOffset).toBeLessThan(metrics.travel - 1);
		expect(midpoint.visibility).toBe("hidden");
		expect(midpoint.textObscured).toBe(true);
		expect(midpoint.inert).toBe(true);
		expect(midpoint.ariaHidden).toBe("true");
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.overlaps.length > 0 && state.visuallyHidden && state.textObscured &&
				state.inert && state.ariaHidden === "true"
				? "ready"
				: JSON.stringify(state);
		}).toBe("ready");
		await info.attach("floating-controls-transform-return.png", {
			body: await page.screenshot({ animations: "disabled" }),
			contentType: "image/png",
		});
	} finally {
		await context.close();
	}
});

test("rebuilds obstruction targets for decrypted content without a TOC", async ({ browser }, info) => {
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
				document.querySelectorAll("table-of-contents").forEach((toc) => toc.remove());
			});
			await expect(page.locator("table-of-contents")).toHaveCount(0);


			await page.evaluate(() => {
				const placeholder = document.querySelector<HTMLElement>(".encrypted-post-placeholder");
				if (!placeholder?.parentElement) throw new Error("Protected article placeholder is missing");
				const content = document.createElement("div");
				content.className = "markdown-content";
				const paragraph = document.createElement("p");
				paragraph.textContent = "Decrypted article text must remain visible and unobstructed. ".repeat(100);
				content.append(paragraph);
				placeholder.after(content);
				paragraph.scrollIntoView({ block: "end", behavior: "instant" });
				document.dispatchEvent(new CustomEvent("shirone:post-content-mounted"));
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


test("limits scroll obstruction reads to visible article blocks", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "reduce",
	});
	const page = await context.newPage();
	try {
		const response = await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);
		await page.evaluate(() => {
			const content = document.querySelector<HTMLElement>(".markdown-content");
			if (!content) throw new Error("Article content is missing");
			const paragraphs = document.createDocumentFragment();
			for (let index = 0; index < 1200; index += 1) {
				const paragraph = document.createElement("p");
				paragraph.textContent = `Measured article paragraph ${index}.`;
				paragraphs.append(paragraph);
			}
			content.append(paragraphs);
			document.dispatchEvent(new CustomEvent("shirone:post-content-mounted"));
		});
		await expect(page.locator("#floating-controls")).not.toHaveAttribute(
			"data-fab-text-obstruction-pending",
		);
		await page.evaluate(() => window.scrollTo(0, 3000));
		await expect.poll(async () =>
			page.locator("#floating-controls").evaluate((controls) =>
				controls.classList.contains("fab-scroll-hidden"),
			),
		).toBe(true);

		const measurements = await page.evaluate(async (selector) => {
			const content = document.querySelector<HTMLElement>(".markdown-content");
			if (!content) throw new Error("Article content is missing");
			const totalBlocks = content.querySelectorAll(selector).length;
			const original = Element.prototype.getBoundingClientRect;
			let blockReads = 0;
			Element.prototype.getBoundingClientRect = function (this: Element) {
				if (
					this instanceof HTMLElement &&
					this.matches(selector) &&
					this.closest(".markdown-content")
				) {
					blockReads += 1;
				}
				return original.call(this);
			};
			try {
				window.scrollTo(0, Math.max(0, window.scrollY - 40));
				window.dispatchEvent(new Event("scroll"));
				await new Promise<void>((resolve) => {
					let frames = 0;
					const nextFrame = () => {
						frames += 1;
						if (frames === 4) resolve();
						else requestAnimationFrame(nextFrame);
					};
					requestAnimationFrame(nextFrame);
				});
				return { totalBlocks, blockReads };
			} finally {
				Element.prototype.getBoundingClientRect = original;
			}
		}, textBlockSelector);
		expect(measurements.totalBlocks).toBeGreaterThan(1000);
		expect(measurements.blockReads).toBeLessThan(measurements.totalBlocks / 4);
	} finally {
		await context.close();
	}
});

test("moves focus to visible article text when closing TOC hides overlapping controls", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 1000 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "reduce",
	});
	const page = await context.newPage();
	try {
		const response = await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);

		const button = page.locator("#fab-toc-btn button");
		await button.focus();
		await page.keyboard.press("Enter");
		const panel = page.locator("#floating-toc-panel");
		await expect(panel).toHaveAttribute("aria-hidden", "false");
		await overlapArticleTextWithTocButton(page);

		await page.keyboard.press("Escape");
		await expect(panel).toHaveAttribute("aria-hidden", "true");
		await expect(page.locator("#floating-controls")).toHaveAttribute("aria-hidden", "true");
		await expectArticleTextFocused(page);
	} finally {
		await context.close();
	}
});

test("moves focus to article text when click activation leaves focus on body", async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 1000 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "reduce",
	});
	const page = await context.newPage();
	try {
		const response = await page.goto(`${ROOT}${ARTICLE}`, { waitUntil: "load" });
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);

		const button = page.locator("#fab-toc-btn button");
		await page.evaluate(() => {
			const active = document.activeElement;
			if (active instanceof HTMLElement) active.blur();
		});
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
		// HTMLElement.click() activates the button without applying pointer focus.
		await button.evaluate((element) => (element as HTMLButtonElement).click());
		const panel = page.locator("#floating-toc-panel");
		await expect(panel).toHaveAttribute("aria-hidden", "false");
		expect(await button.evaluate((element) => document.activeElement !== element)).toBe(true);
		await overlapArticleTextWithTocButton(page);

		await page.keyboard.press("Escape");
		await expect(panel).toHaveAttribute("aria-hidden", "true");
		await expect(page.locator("#floating-controls")).toHaveAttribute("aria-hidden", "true");
		await expectArticleTextFocused(page);
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
