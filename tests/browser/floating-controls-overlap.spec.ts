import { expect, test, type Page } from "@playwright/test";

const ROOT = process.env.ALNILAM_TEST_ROOT_URL ?? "http://127.0.0.1:4323";
const NESTED = process.env.ALNILAM_TEST_NESTED_URL ?? "http://127.0.0.1:4324/ALNILAM";
const bases = [["root", ROOT], ["nested", NESTED]] as const;
const ARTICLE = "/en/posts/internationalization/";
const TOC_BUTTON = "#fab-toc-btn button";
const TOC_PANEL = "#floating-toc-panel";
const PROBE = "[data-fab-probe]";
const textBlockSelector = "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th,figcaption,dt,dd";

const overlapCases = [
	{ width: 320, height: 800, theme: "light", article: ARTICLE },
	{ width: 375, height: 812, theme: "dark", article: "/en/posts/markdown-and-mdx/" },
	{ width: 390, height: 844, theme: "light", article: ARTICLE },
	{ width: 430, height: 932, theme: "dark", article: "/en/posts/markdown-and-mdx/" },
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
			activeButtons: buttons.filter(({ right, left, bottom, top }) => right > left && bottom > top).length,
			visuallyHidden: style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0,
			pending: controls.hasAttribute("data-fab-text-obstruction-pending"),
			scrollHidden: controls.classList.contains("fab-scroll-hidden"),
			textObscured: controls.classList.contains("fab-text-obscured"),
			inert: controls.hasAttribute("inert"),
			ariaHidden: controls.getAttribute("aria-hidden"),
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		};
	}, textBlockSelector);
}

async function expectControls(
	page: Page,
	obstruction: "measured" | "clear" | "overlap",
	{ scrollHidden = false, tocOpen = false } = {},
) {
	let geometry = await inspectOverlap(page);
	// Sample geometry and state together after observer delivery and the queued controller frame.
	await expect.poll(async () => {
		await page.evaluate(() => new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		));
		geometry = await inspectOverlap(page);
		const overlaps = geometry.overlaps.length > 0;
		const textHidden = !tocOpen && overlaps;
		const hidden = scrollHidden || textHidden;
		const matches = !geometry.pending && geometry.activeButtons > 0 &&
			geometry.scrollHidden === scrollHidden && geometry.visuallyHidden === hidden &&
			geometry.inert === hidden && geometry.ariaHidden === (hidden ? "true" : null) &&
			(scrollHidden || geometry.textObscured === textHidden) &&
			(obstruction === "measured" || overlaps === (obstruction === "overlap")) &&
			geometry.scrollWidth === geometry.clientWidth;
		return matches ? "ready" : geometry;
	}).toBe("ready");
	return geometry;
}

async function articleShellUrl(page: Page, origin: string) {
	const response = await page.goto(`${origin}/posts/`);
	expect(response?.status()).toBe(200);
	// Reuse a production article shell for its controls, assets and event handlers.
	// The fixture supplies its own geometry independently of the article and locale.
	const article = page.locator(".m3-blog-postcard").filter({
		hasNot: page.locator(".m3-blog-postcard__encrypted, .m3-blog-postcard__pin-lock"),
	}).locator("a.m3-blog-postcard__title").first();
	return article.evaluate((link: HTMLAnchorElement) => link.href);
}

async function openArticle(page: Page, url: string) {
	const response = await page.goto(url, { waitUntil: "load" });
	expect(response?.status()).toBe(200);
	await expect(page.locator(".markdown-content[data-pagefind-body]")).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	await expect(page.locator("#floating-controls")).not.toHaveAttribute("data-fab-text-obstruction-pending");
}

async function openGeometryFixture(page: Page, origin: string) {
	await openArticle(page, await articleShellUrl(page, origin));
	await page.locator(".markdown-content[data-pagefind-body]").evaluate((content) => {
		const probe = document.createElement("p");
		probe.dataset.fabProbe = "";
		probe.textContent = "Text";
		Object.assign(probe.style, {
			position: "fixed", margin: "0", font: "16px/20px monospace", whiteSpace: "nowrap",
		});
		content.style.minHeight = "1600px";
		content.replaceChildren(probe);
		document.dispatchEvent(new CustomEvent("shirone:post-content-mounted"));
	});
	await placeProbe(page, "clear");
	await expectControls(page, "clear");
}

async function placeProbe(page: Page, position: "clear" | "overlap") {
	await page.locator(PROBE).evaluate((probe, { position, buttonSelector }) => {
		const button = document.querySelector(buttonSelector);
		if (!button || !probe.parentElement) throw new Error("Fixture button or article is missing");
		const buttonRect = button.getBoundingClientRect();
		probe.style.top = "0px";
		probe.style.left = "0px";
		const range = document.createRange();
		range.selectNodeContents(probe);
		const text = range.getBoundingClientRect();
		probe.style.top = `${(position === "overlap" ? buttonRect.top + 4 : 180) - text.top}px`;
		probe.style.left = `${(position === "overlap" ? buttonRect.left + 4 : 12) - text.left}px`;
		// Changing height delivers a ResizeObserver notification just as a content reflow would.
		probe.parentElement.style.minHeight = position === "overlap" ? "1700px" : "1600px";
	}, { position, buttonSelector: TOC_BUTTON });
}

async function scrollTo(page: Page, top: number) {
	await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top);
}

async function expectOpenToc(page: Page) {
	const panel = page.locator(TOC_PANEL);
	await expect(panel).toHaveAttribute("aria-hidden", "false");
	await expect(page.locator(TOC_BUTTON)).toHaveAttribute("aria-expanded", "true");
	await expect(panel).toBeVisible();
}

async function closeTocWithEscape(page: Page) {
	await page.keyboard.press("Escape");
	await expect(page.locator(TOC_PANEL)).toHaveAttribute("aria-hidden", "true");
	await expect(page.locator(TOC_BUTTON)).toHaveAttribute("aria-expanded", "false");
}

async function expectArticleTextFocused(page: Page): Promise<void> {
	const focus = await page.evaluate(() => {
		const active = document.activeElement;
		return {
			isBody: active === document.body,
			inControls: Boolean(active && document.getElementById("floating-controls")?.contains(active)),
			isVisibleArticleText: active instanceof HTMLElement && active.matches(".markdown-content [data-fab-probe]") &&
				getComputedStyle(active).visibility === "visible" && active.getBoundingClientRect().bottom > 0 &&
				active.getBoundingClientRect().top < innerHeight,
		};
	});
	expect(focus).toEqual({ isBody: false, inControls: false, isVisibleArticleText: true });
}

for (const [base, origin] of bases) {
	for (const { width, height, theme, article } of overlapCases) {
		test(`matches published article geometry on ${base} at ${width}x${height} (${theme})`, async ({ browser }, info) => {
			const context = await browser.newContext({
				viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
			});
			await context.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
			const page = await context.newPage();
			try {
				await openArticle(page, `${origin}${article}`);
				expect(await page.locator("html").evaluate((html) => html.classList.contains("dark"))).toBe(theme === "dark");
				const initial = await expectControls(page, "measured");
				await page.setViewportSize({ width, height: height + 156 });
				const resized = await expectControls(page, "measured");
				await scrollTo(page, 160);
				const scrollingDown = await expectControls(page, "measured", { scrollHidden: true });
				await scrollTo(page, 120);
				const returned = await expectControls(page, "measured");

				const focusable = await page.locator(TOC_BUTTON).evaluate((element) => {
					(element as HTMLElement).focus({ preventScroll: true });
					return document.activeElement === element;
				});
				expect(focusable).toBe(returned.overlaps.length === 0);
				await info.attach("published-geometry.json", {
					body: JSON.stringify({ initial, resized, scrollingDown, returned }), contentType: "application/json",
				});
				await info.attach(`floating-controls-${base}-${width}x${height}-${theme}.png`, {
					body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
				});
			} finally {
				await context.close();
			}
		});
	}
}

for (const [base, origin] of bases) {
	test(`rechecks mobile article overlap after viewport and scroll changes (${base})`, async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			await openGeometryFixture(page, origin);
			const button = page.locator(TOC_BUTTON);
			await button.focus();
			await expect(button).toBeFocused();
			await placeProbe(page, "overlap");
			await expectControls(page, "overlap");
			await expect(button).not.toBeFocused();
			await button.focus();
			await expect(button).not.toBeFocused();

			// The probe stays put while the bottom-aligned buttons move on resize.
			await page.setViewportSize({ width: 390, height: 1000 });
			await expectControls(page, "clear");
			await page.setViewportSize({ width: 390, height: 844 });
			await expectControls(page, "overlap");

			await placeProbe(page, "clear");
			await expectControls(page, "clear");
			await scrollTo(page, 160);
			await expectControls(page, "clear", { scrollHidden: true });
			await button.focus();
			await expect(button).not.toBeFocused();
			await scrollTo(page, 120);
			await expectControls(page, "clear");
			await button.focus();
			await expect(button).toBeFocused();
		} finally {
			await context.close();
		}
	});
}

test("keeps overlapping controls hidden during the scroll-return transition", async ({ browser }, info) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "no-preference",
	});
	const page = await context.newPage();
	try {
		await openGeometryFixture(page, ROOT);
		// Give the sampled text room to fit between the scroll-transform endpoints.
		const travel = 64;
		await page.locator("#floating-controls").evaluate((element, distance) => {
			element.style.setProperty("--m3e-space-3", `${distance}px`);
		}, travel);
		const base = await page.locator(TOC_BUTTON).evaluate((element) => {
			const { left, top } = element.getBoundingClientRect();
			return { left, top };
		});
		await scrollTo(page, 120);
		await expectControls(page, "clear", { scrollHidden: true });
		await expect.poll(() => page.locator(TOC_BUTTON).evaluate((element) => element.getBoundingClientRect().top))
			.toBeCloseTo(base.top + travel, 0);
		await page.locator(PROBE).evaluate((paragraph, { base, travel }) => {
			paragraph.style.position = "relative";
			paragraph.style.top = "0px";
			paragraph.style.left = "0px";
			const range = document.createRange();
			range.selectNodeContents(paragraph);
			const textRect = range.getBoundingClientRect();
			const targetTop = base.top + travel / 2 - 2;
			if (textRect.height >= travel / 2) throw new Error("Transition text does not fit between endpoints");
			paragraph.style.top = `${targetTop - window.scrollY - textRect.top}px`;
			paragraph.style.left = `${base.left + 2 - textRect.left}px`;
		}, { base, travel });
		// Let the controller observe the repositioned paragraph before the return transition.
		await page.evaluate(() => {
			const paragraph = document.querySelector("[data-fab-probe]");
			if (!paragraph) throw new Error("Transition fixture paragraph is missing");
			return new Promise<void>((resolve, reject) => {
				const observer = new IntersectionObserver((entries) => {
					if (!entries.some((entry) => entry.target === paragraph && entry.isIntersecting)) return;
					observer.disconnect();
					window.clearTimeout(timeout);
					requestAnimationFrame(() => resolve());
				});
				const timeout = window.setTimeout(() => {
					observer.disconnect();
					reject(new Error("Transition fixture paragraph never intersected the viewport"));
				}, 1000);
				observer.observe(paragraph);
			});
		});
		await expect.poll(async () => {
			const state = await inspectOverlap(page);
			return state.scrollHidden && state.overlaps.length === 0 && !state.textObscured;
		}).toBe(true);
		const waitForTransformEndpoint = (expectedOffset: number) =>
			page.evaluate((expectedOffset) => {
				const controls = document.getElementById("floating-controls");
				if (!controls) throw new Error("Floating controls are missing");
				return new Promise<void>((resolve, reject) => {
					let stableFrames = 0;
					const deadline = performance.now() + 1500;
					const sample = () => {
						const transform = getComputedStyle(controls).transform;
						const transformOffset =
							transform === "none" ? 0 : new DOMMatrixReadOnly(transform).f;
						const transformRunning = controls.getAnimations().some((animation) => {
							if (
								!("transitionProperty" in animation) ||
								animation.transitionProperty !== "transform"
							) return false;
							return animation.playState === "running" || animation.pending;
						});
						if (!transformRunning && Math.abs(transformOffset - expectedOffset) <= 1) {
							stableFrames += 1;
						} else {
							stableFrames = 0;
						}
						if (stableFrames >= 2) {
							resolve();
						} else if (performance.now() >= deadline) {
							reject(new Error("Floating controls transform did not settle at its expected endpoint"));
						} else {
							requestAnimationFrame(sample);
						}
					};
					requestAnimationFrame(sample);
				});
			}, expectedOffset);
		await waitForTransformEndpoint(travel);

		const midpoint = await page.evaluate((travel) => {
			const controls = document.getElementById("floating-controls");
			if (!controls) throw new Error("Floating controls are missing");
			return new Promise<{
				transformOffset: number;
				overlaps: boolean;
				visibility: string;
				textObscured: boolean;
				inert: boolean;
				ariaHidden: string | null;
			}>((resolve, reject) => {
				let timeout: number;
				let midpoint: {
					transformOffset: number;
					overlaps: boolean;
					visibility: string;
					textObscured: boolean;
					inert: boolean;
					ariaHidden: string | null;
				} | null = null;
				let samplingStopped = false;
				const cleanup = () => {
					samplingStopped = true;
					window.clearTimeout(timeout);
					controls.removeEventListener("transitionrun", onTransitionRun);
					document.removeEventListener("transitionend", onTransitionSettled);
					document.removeEventListener("transitioncancel", onTransitionSettled);
				};
				const sample = () => {
					if (samplingStopped) return;
					const transform = getComputedStyle(controls).transform;
					const transformOffset =
						transform === "none" ? 0 : new DOMMatrixReadOnly(transform).f;
					const paragraph = document.querySelector("[data-fab-probe]");
					const button = controls.querySelector<HTMLElement>("#fab-toc-btn button");
					if (!paragraph || !button) {
						cleanup();
						reject(new Error("Transition fixture text or TOC button is missing"));
						return;
					}
					const range = document.createRange();
					range.selectNodeContents(paragraph);
					const buttonRect = button.getBoundingClientRect();
					const overlaps = [...range.getClientRects()].some((textRect) =>
						Math.min(textRect.right, buttonRect.right) > Math.max(textRect.left, buttonRect.left) &&
						Math.min(textRect.bottom, buttonRect.bottom) > Math.max(textRect.top, buttonRect.top),
					);
					if (overlaps) {
						const visibility = getComputedStyle(controls).visibility;
						const textObscured = controls.classList.contains("fab-text-obscured");
						const inert = controls.hasAttribute("inert");
						const ariaHidden = controls.getAttribute("aria-hidden");
						if (
							visibility !== "hidden" ||
							!textObscured ||
							!inert ||
							ariaHidden !== "true"
						) {
							cleanup();
							reject(
								new Error(
									`Overlapping article text exposed floating controls: ${JSON.stringify({
										transformOffset,
										visibility,
										textObscured,
										inert,
										ariaHidden,
									})}`,
								),
							);
							return;
						}
						if (
							!midpoint &&
							transformOffset > travel * 0.25 &&
							transformOffset < travel * 0.75
						) {
							midpoint = {
								transformOffset,
								overlaps,
								visibility,
								textObscured,
								inert,
								ariaHidden,
							};
						}
					}
					requestAnimationFrame(sample);
				};
				const onTransitionRun = (event: TransitionEvent) => {
					if (event.target !== controls || event.propertyName !== "transform") return;
					requestAnimationFrame(sample);
				};
				const onTransitionSettled = (event: TransitionEvent) => {
					if (event.target !== controls || event.propertyName !== "transform") return;
					if (event.type === "transitioncancel") {
						cleanup();
						reject(new Error("Control return transform was cancelled"));
						return;
					}
					if (!midpoint) {
						cleanup();
						reject(new Error("Control return ended before an overlapping hidden midpoint was observed"));
						return;
					}
					cleanup();
					resolve(midpoint);
				};
				controls.addEventListener("transitionrun", onTransitionRun);
				document.addEventListener("transitionend", onTransitionSettled);
				document.addEventListener("transitioncancel", onTransitionSettled);
				timeout = window.setTimeout(() => {
					cleanup();
					reject(new Error("Control return transform did not settle"));
				}, 1500);
				window.scrollTo({ top: 0, behavior: "instant" });
			});
		}, travel);
		expect(midpoint.transformOffset).toBeGreaterThan(travel * 0.25);
		expect(midpoint.transformOffset).toBeLessThan(travel * 0.75);
		expect(midpoint.overlaps).toBe(true);
		expect(midpoint.visibility).toBe("hidden");
		expect(midpoint.textObscured).toBe(true);
		expect(midpoint.inert).toBe(true);
		expect(midpoint.ariaHidden).toBe("true");
		await waitForTransformEndpoint(0);
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
	for (const [name, origin] of bases) {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			const url = await articleShellUrl(page, origin);
			await page.route(url, async (route) => {
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
			const response = await page.goto(url, { waitUntil: "load" });
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
		await openGeometryFixture(page, ROOT);
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
		await openGeometryFixture(page, ROOT);
		const button = page.locator(TOC_BUTTON);
		await button.focus();
		await expect(button).toBeFocused();
		await page.keyboard.press("Enter");
		await expectOpenToc(page);
		await placeProbe(page, "overlap");
		await expectControls(page, "overlap", { tocOpen: true });

		await closeTocWithEscape(page);
		await expectControls(page, "overlap");
		await expectArticleTextFocused(page);
		await page.keyboard.press("Tab");
		await expect(page.locator("#floating-controls :focus")).toHaveCount(0);
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
		await openGeometryFixture(page, ROOT);
		const button = page.locator(TOC_BUTTON);
		await page.evaluate(() => {
			const active = document.activeElement;
			if (active instanceof HTMLElement) active.blur();
		});
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
		// HTMLElement.click() activates the button without applying pointer focus.
		await button.evaluate((element) => (element as HTMLButtonElement).click());
		await expectOpenToc(page);
		await placeProbe(page, "overlap");
		await expectControls(page, "overlap", { tocOpen: true });

		await closeTocWithEscape(page);
		await expectControls(page, "overlap");
		await expectArticleTextFocused(page);
	} finally {
		await context.close();
	}
});

for (const [base, origin] of bases) {
	test(`keeps clear controls discoverable to keyboard and touch (${base})`, async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 1000 },
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
		});
		const page = await context.newPage();
		try {
			await openGeometryFixture(page, origin);
			const button = page.locator(TOC_BUTTON);
			// Start the tab sequence in the same fixed slot as the TOC trigger.
			const start = page.locator("[data-fab-keyboard-start]");
			await button.evaluate((trigger) => {
				const start = document.createElement("a");
				start.dataset.fabKeyboardStart = "";
				start.href = "#floating-controls";
				start.textContent = "Keyboard start";
				start.style.position = "absolute";
				trigger.before(start);
			});
			await start.focus();
			await expect(start).toBeFocused();
			await page.keyboard.press("Tab");
			await expect(button).toBeFocused();
			await start.evaluate((element) => element.remove());
			await page.keyboard.press("Enter");
			await expectOpenToc(page);
			await closeTocWithEscape(page);
			await expectControls(page, "clear");
			await expect(button).toBeFocused();

			await button.tap();
			await expectOpenToc(page);
		} finally {
			await context.close();
		}
	});
}

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
