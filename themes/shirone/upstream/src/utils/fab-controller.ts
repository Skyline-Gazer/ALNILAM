/**
 * Shirone FAB 运行时控制器
 * 负责：滚动监测、Swup 导航同步、TOC 弹窗开闭与焦点捕获、页面过滤协同。
 */
import {
	fadeOutThenHide,
	flipFromRect,
	prefersReducedMotion,
	revealIn,
} from "@utils/motion";

interface FabControllerState {
	tocOpen: boolean;
	bannerHeight: number;
}
const ARTICLE_TEXT_BLOCK_SELECTOR =
	"h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th, figcaption, dt, dd";


class FabController {
	private state: FabControllerState = {
		tocOpen: false,
		bannerHeight: 35,
	};

	private bound = false;
	private previousFocus: HTMLElement | null = null;
	private animateVisibility = false;
	private visibilityGeneration = 0;
	private visibilitySync: Promise<void> = Promise.resolve();
	private readonly mobileViewport = window.matchMedia("(max-width: 767.98px)");
	private mobileScrollAnchor = window.scrollY;
	private visualViewportHeight = window.visualViewport?.height ?? 0;
	private visualViewportWidth = window.visualViewport?.width ?? 0;
	private mobileScrollHidden = false;
	private articleTextObscured = false;
	private articleTextRoot: HTMLElement | null = null;
	private articleTextBlocks: HTMLElement[] = [];
	private articleTextResizeObserver: ResizeObserver | null = null;
	private articleTextIntersectionObserver: IntersectionObserver | null = null;
	private readonly articleTextVisibleBlocks = new Set<HTMLElement>();
	private readonly articleTextPendingBlocks = new Set<HTMLElement>();
	private articleTextVisibilityReady = false;
	private controlsReturning = false;
	private textObstructionFrame: number | null = null;
	private readonly articleTextRange = document.createRange();
	private readonly articleControlRects: DOMRect[] = [];


	constructor() {
		this.init();
	}

	public init(): void {
		const controls = document.getElementById("floating-controls");
		if (controls?.dataset.bannerHeight) {
			const parsed = Number.parseFloat(controls.dataset.bannerHeight);
			if (!Number.isNaN(parsed) && parsed > 0) {
				this.state.bannerHeight = parsed;
			}
		}
		if (document.fonts) {
			void document.fonts.ready.then(() => this.syncTextObstruction());
		}


		if (this.bound) {
			this.syncPageState();
			return;
		}
		this.bound = true;

		this.bindScrollListener();
		this.bindMobileViewportListener();
		this.bindEvents();
		this.bindSwupHooks();
		this.syncPageState();
		requestAnimationFrame(() => {
			this.animateVisibility = true;
		});
	}

	private bindScrollListener(): void {
		const handleScroll = () => {
			const scrollTop = Math.max(
				document.body.scrollTop,
				document.documentElement.scrollTop,
				window.scrollY,
			);
			const topBtn = document.getElementById("fab-top-btn");
			const configuredRatio = Number.parseFloat(
				topBtn?.dataset.fabThreshold ?? "",
			);
			const ratio = Number.isFinite(configuredRatio)
				? configuredRatio
				: this.state.bannerHeight;
			const threshold = (window.innerHeight * ratio) / 100;

			if (topBtn) {
				const nextAllowed = String(scrollTop > threshold);
				if (topBtn.dataset.fabScrollAllowed !== nextAllowed) {
					topBtn.dataset.fabScrollAllowed = nextAllowed;
					this.scheduleVisibilitySync();
				}
			}
			this.syncMobileScrollVisibility(scrollTop);
			this.scheduleTextObstructionSync();
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		this.mobileViewport.addEventListener("change", () => {
			this.refreshTextObstructionTargets();
			this.resetMobileVisibility();
		});
		handleScroll();
	}

	private syncMobileScrollVisibility(scrollTop: number): void {
		if (!this.mobileViewport.matches || scrollTop < 80 || this.state.tocOpen) {
			this.setMobileControlsHidden(false);
			this.mobileScrollAnchor = scrollTop;
			return;
		}
		const delta = scrollTop - this.mobileScrollAnchor;
		if (Math.abs(delta) < 8) return;
		this.setMobileControlsHidden(delta > 0);
		this.mobileScrollAnchor = scrollTop;
	}

	private bindMobileViewportListener(): void {
		const viewport = window.visualViewport;
		window.addEventListener("resize", () => this.scheduleTextObstructionSync(), {
			passive: true,
		});
		if (!viewport) return;
		const sync = () => {
			const widthChanged =
				Math.abs(viewport.width - this.visualViewportWidth) > 16;
			const heightDelta = viewport.height - this.visualViewportHeight;
			const active = document.activeElement;
			const editing =
				active instanceof HTMLElement &&
				(active.matches("input, textarea, select") || active.isContentEditable);
			if (
				this.mobileViewport.matches &&
				!widthChanged &&
				!editing &&
				!this.state.tocOpen &&
				window.scrollY >= 80
			) {
				if (heightDelta > 16) this.setMobileControlsHidden(true);
				else if (heightDelta < -16) this.setMobileControlsHidden(false);
			}
			this.visualViewportHeight = viewport.height;
			this.visualViewportWidth = viewport.width;
			this.scheduleTextObstructionSync();
		};
		viewport.addEventListener("resize", sync);
		viewport.addEventListener("scroll", sync);
	}

	private setMobileControlsHidden(hidden: boolean): void {
		const wasHidden = this.mobileScrollHidden;
		this.mobileScrollHidden = hidden;
		if (hidden) this.controlsReturning = false;
		if (!hidden && wasHidden) {
			const controls = document.getElementById("floating-controls");
			this.controlsReturning =
				controls !== null && this.hasTransformTransition(controls);
			if (controls && this.controlsReturning) {
				const isMobileArticle =
					this.mobileViewport.matches &&
					controls.dataset.fabTextObstruction === "true" &&
					!this.state.tocOpen;
				this.articleTextObscured =
					isMobileArticle &&
					this.articleTextVisibilityReady &&
					this.hasArticleTextOverlap(controls, true);
			}
			controls?.classList.remove("fab-scroll-hidden");
			this.applyMobileControlsVisibility(controls);
			if (!this.controlsReturning) this.syncTextObstruction();
		} else {
			this.applyMobileControlsVisibility();
		}
	}
	private refreshTextObstructionTargets(): void {
		const controls = document.getElementById("floating-controls");
		const content =
			this.mobileViewport.matches &&
			controls?.dataset.fabTextObstruction === "true"
				? document.querySelector<HTMLElement>(".markdown-content")
				: null;
		this.articleTextResizeObserver?.disconnect();
		this.articleTextIntersectionObserver?.disconnect();
		this.articleTextIntersectionObserver = null;
		this.articleTextVisibleBlocks.clear();
		this.articleTextPendingBlocks.clear();
		this.articleTextVisibilityReady = false;
		this.articleTextRoot = content;
		const rangeRoot = content ?? document.body;
		if (rangeRoot) this.articleTextRange.selectNodeContents(rangeRoot);
		this.articleControlRects.length = 0;
		this.articleTextBlocks = content
			? Array.from(
					content.querySelectorAll<HTMLElement>(ARTICLE_TEXT_BLOCK_SELECTOR),
				)
			: [];
		if (content && controls) {
			controls.setAttribute("data-fab-text-obstruction-pending", "true");
			if (typeof ResizeObserver !== "undefined") {
				const layout = document.getElementById("content-wrapper");
				this.articleTextResizeObserver = new ResizeObserver(() =>
					this.syncTextObstruction(),
				);
				this.articleTextResizeObserver.observe(content);
				if (layout && layout !== content) {
					this.articleTextResizeObserver.observe(layout);
				}
			}
			if (typeof IntersectionObserver !== "undefined") {
				const observer = new IntersectionObserver((entries) => {
					for (const entry of entries) {
						const block = entry.target as HTMLElement;
						this.articleTextPendingBlocks.delete(block);
						if (entry.isIntersecting) {
							this.articleTextVisibleBlocks.add(block);
						} else {
							this.articleTextVisibleBlocks.delete(block);
						}
					}
					if (this.articleTextPendingBlocks.size === 0) {
						this.articleTextVisibilityReady = true;
					}
					this.scheduleTextObstructionSync();
				});
				this.articleTextIntersectionObserver = observer;
				for (const block of this.articleTextBlocks) {
					this.articleTextPendingBlocks.add(block);
					observer.observe(block);
				}
				this.articleTextVisibilityReady =
					this.articleTextPendingBlocks.size === 0;
			} else {
				this.articleTextVisibilityReady = true;
			}
		} else {
			this.articleTextVisibilityReady = true;
			controls?.removeAttribute("data-fab-text-obstruction-pending");
		}
		this.syncTextObstruction();
	}

	private scheduleTextObstructionSync(): void {
		if (this.textObstructionFrame !== null) return;
		this.textObstructionFrame = requestAnimationFrame(() => {
			this.textObstructionFrame = null;
			this.syncTextObstruction();
		});
	}

	private syncTextObstruction(): void {
		const controls = document.getElementById("floating-controls");
		if (!controls) return;
		const isMobileArticle =
			this.mobileViewport.matches &&
			controls.dataset.fabTextObstruction === "true" &&
			!this.state.tocOpen;
		if (!isMobileArticle) {
			this.articleTextObscured = false;
			controls.removeAttribute("data-fab-text-obstruction-pending");
			this.applyMobileControlsVisibility(controls);
			return;
		}
		if (this.mobileScrollHidden || !this.articleTextVisibilityReady) {
			this.applyMobileControlsVisibility(controls);
			return;
		}
		this.articleTextObscured = this.hasArticleTextOverlap(
			controls,
			this.controlsReturning,
		);
		controls.removeAttribute("data-fab-text-obstruction-pending");
		this.applyMobileControlsVisibility(controls);
	}

	private hasTransformTransition(controls: HTMLElement): boolean {
		const style = getComputedStyle(controls);
		const properties = style.transitionProperty.split(",");
		const durations = style.transitionDuration.split(",");
		return properties.some((property, index) => {
			const name = property.trim();
			return (
				(name === "all" || name === "transform") &&
				Number.parseFloat(durations[index % durations.length]) > 0
			);
		});
	}

	private hasArticleTextOverlap(
		controls: HTMLElement,
		atVisibleEndpoint = false,
	): boolean {
		if (!this.articleTextRoot || this.articleTextBlocks.length === 0) return false;
		let controlOffsetX = 0;
		let controlOffsetY = 0;
		if (atVisibleEndpoint) {
			const transform = getComputedStyle(controls).transform;
			if (transform !== "none") {
				const matrix = new DOMMatrixReadOnly(transform);
				controlOffsetX = -matrix.e;
				controlOffsetY = -matrix.f;
			}
		}
		const buttonRects = this.articleControlRects;
		buttonRects.length = 0;
		let left = Number.POSITIVE_INFINITY;
		let right = Number.NEGATIVE_INFINITY;
		let top = Number.POSITIVE_INFINITY;
		let bottom = Number.NEGATIVE_INFINITY;
		for (const item of controls.querySelectorAll<HTMLElement>("[data-fab-item]")) {
			const slot = item.closest<HTMLElement>("[data-fab-slot]") ?? item;
			const style = getComputedStyle(item);
			if (
				style.display === "none" ||
				item.classList.contains("is-hidden") ||
				item.classList.contains("is-page-hidden") ||
				slot.classList.contains("hidden") ||
				item.dataset.fabPageAllowed === "false" ||
				item.dataset.fabScrollAllowed === "false"
			) {
				continue;
			}
			const button = item.querySelector<HTMLElement>("button") ?? item;
			const rect = button.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) continue;
			buttonRects.push(rect);
			left = Math.min(left, rect.left + controlOffsetX);
			right = Math.max(right, rect.right + controlOffsetX);
			top = Math.min(top, rect.top + controlOffsetY);
			bottom = Math.max(bottom, rect.bottom + controlOffsetY);
		}
		if (buttonRects.length === 0) return false;

		const candidateBlocks = this.articleTextIntersectionObserver
			? this.articleTextVisibleBlocks
			: this.articleTextBlocks;
		for (const block of candidateBlocks) {
			if (!block.isConnected) continue;
			const blockRect = block.getBoundingClientRect();
			if (
				Math.min(blockRect.right, right) <= Math.max(blockRect.left, left) ||
				Math.min(blockRect.bottom, bottom) <= Math.max(blockRect.top, top)
			) {
				continue;
			}
			const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
			while (walker.nextNode()) {
				const node = walker.currentNode;
				if (!node.textContent?.trim()) continue;
				this.articleTextRange.selectNodeContents(node);
				for (const textRect of this.articleTextRange.getClientRects()) {
					for (const buttonRect of buttonRects) {
						if (
							Math.min(textRect.right, buttonRect.right + controlOffsetX) >
								Math.max(textRect.left, buttonRect.left + controlOffsetX) &&
							Math.min(textRect.bottom, buttonRect.bottom + controlOffsetY) >
								Math.max(textRect.top, buttonRect.top + controlOffsetY)
						) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private applyMobileControlsVisibility(
		controls = document.getElementById("floating-controls"),
	): void {
		if (!controls) return;
		const scrollHidden = this.mobileViewport.matches && this.mobileScrollHidden;
		const textHidden =
			this.mobileViewport.matches &&
			(this.articleTextObscured ||
				controls.hasAttribute("data-fab-text-obstruction-pending"));
		const hidden = scrollHidden || textHidden;
		if (hidden && controls.contains(document.activeElement)) {
			(document.activeElement as HTMLElement).blur();
		}
		controls.classList.toggle("fab-scroll-hidden", scrollHidden);
		controls.classList.toggle("fab-text-obscured", textHidden);
		controls.toggleAttribute("inert", hidden);
		if (hidden) controls.setAttribute("aria-hidden", "true");
		else controls.removeAttribute("aria-hidden");
	}


	private resetMobileVisibility(): void {
		this.mobileScrollAnchor = window.scrollY;
		this.visualViewportHeight = window.visualViewport?.height ?? 0;
		this.visualViewportWidth = window.visualViewport?.width ?? 0;
		this.setMobileControlsHidden(false);
		this.syncTextObstruction();
	}

	private bindEvents(): void {
		const tocBtn = document.getElementById("fab-toc-btn");
		const closeBtn = document.getElementById("floating-toc-close-btn");
		const panel = document.getElementById("floating-toc-panel");

		tocBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleToc();
		});

		closeBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.closeToc();
		});

		// 点击面板外部区域自动收起
		document.addEventListener("click", (e) => {
			if (this.state.tocOpen && panel && !panel.contains(e.target as Node)) {
				this.closeToc();
			}
		});

		// ESC 键收起面板
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.state.tocOpen) {
				e.preventDefault();
				this.closeToc();
			} else if (e.key === "Tab" && this.state.tocOpen && panel) {
				this.trapFocus(e, panel);
			}
		});

		// Article content mounts independently from whether a TOC sidebar is configured.
		document.addEventListener("shirone:post-content-mounted", () => {
			this.refreshTextObstructionTargets();
			this.resetMobileVisibility();
		});
		// The TOC event only updates the floating TOC after its source has been rebuilt.
		document.addEventListener("shirone:toc-synced", () => {
			this.syncFloatingToc();
		});
		// Keep endpoint overlap hidden until the scroll-return transform settles.
		const syncAfterControlsTransform = (event: TransitionEvent) => {
			const controls = document.getElementById("floating-controls");
			if (event.target !== controls || event.propertyName !== "transform") return;
			this.controlsReturning = false;
			this.syncTextObstruction();
		};
		document.addEventListener("transitionend", syncAfterControlsTransform);
		document.addEventListener("transitioncancel", syncAfterControlsTransform);

		// 目录项点击平滑跳转并自动收起
		panel?.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const anchor = target.closest<HTMLAnchorElement>("a[href^='#']");
			if (anchor) {
				const hash = anchor.getAttribute("href");
				if (hash && hash.length > 1) {
					const targetId = decodeURIComponent(hash.substring(1));
					const headingEl = document.getElementById(targetId);
					if (headingEl) {
						e.preventDefault();
						const offsetTop = Math.max(
							0,
							headingEl.getBoundingClientRect().top + window.scrollY - 80,
						);
						history.pushState(history.state, "", hash);
						window.scrollTo({
							top: offsetTop,
							behavior: prefersReducedMotion() ? "auto" : "smooth",
						});
						this.mobileScrollAnchor = Math.max(window.scrollY, offsetTop);
						this.setMobileControlsHidden(false);
					}
				}
				if (panel?.dataset.tocCloseOnSelect !== "false") {
					this.closeToc();
				}
			}
		});
	}

	public toggleToc(): void {
		this.state.tocOpen ? this.closeToc() : this.openToc();
	}

	public openToc(): void {
		// 打开前总是从侧栏源（#toc nav.m3-blog-toc）刷新目录内容：
		// 加密文章解锁后侧栏 TOC 由 post-decryption 客户端重建，
		// 悬浮面板需还原实时状态而非残留 SSR 空态。
		this.syncFloatingToc();
		const panel = document.getElementById("floating-toc-panel");
		if (!panel) return;
		this.resetMobileVisibility();
		this.previousFocus =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		this.state.tocOpen = true;
		this.syncTextObstruction();
		panel.classList.add("is-open");
		panel.setAttribute("aria-hidden", "false");
		document
			.querySelector("#fab-toc-btn button")
			?.setAttribute("aria-expanded", "true");
		panel.focus();
	}

	public closeToc(): void {
		const panel = document.getElementById("floating-toc-panel");
		this.state.tocOpen = false;
		if (panel) {
			panel.classList.remove("is-open");
			panel.setAttribute("aria-hidden", "true");
		}
		document
			.querySelector("#fab-toc-btn button")
			?.setAttribute("aria-expanded", "false");
		const previousFocus = this.previousFocus;
		this.previousFocus = null;
		this.syncTextObstruction();
		const controls = document.getElementById("floating-controls");
		if (!previousFocus?.isConnected) return;
		if (controls?.contains(previousFocus) && controls.hasAttribute("inert")) {
			this.focusVisibleArticleText();
		} else {
			previousFocus.focus();
		}
	}

	private focusVisibleArticleText(): void {
		const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
		let target: HTMLElement | null = null;
		for (const block of this.articleTextVisibleBlocks) {
			if (!block.isConnected) continue;
			const rect = block.getBoundingClientRect();
			if (
				block.getClientRects().length > 0 &&
				getComputedStyle(block).visibility !== "hidden" &&
				rect.bottom > 0 &&
				rect.top < viewportHeight
			) {
				target = block;
				break;
			}
		}
		target ??= this.articleTextRoot;
		if (!target) return;
		if (!target.hasAttribute("tabindex")) {
			target.setAttribute("tabindex", "-1");
			target.addEventListener(
				"blur",
				() => target.removeAttribute("tabindex"),
				{ once: true },
			);
		}
		target.focus({ preventScroll: true });
	}

	public scrollToTop(): void {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	public scrollToComment(): void {
		const button = document.getElementById("fab-comment-btn");
		let target: Element | null = null;
		const selector = button?.dataset.fabTargetSelector;
		if (selector) {
			try {
				target = document.querySelector(selector);
			} catch {
				target = null;
			}
		}
		target ||=
			document.getElementById("comments") ||
			document.querySelector("[data-comment-section]") ||
			document.querySelector("#comment-container") ||
			document.querySelector("#twikoo") ||
			document.querySelector(".comment-section");
		if (target) {
			target.scrollIntoView({ behavior: "smooth" });
		}
	}

	public navigateToHome(): void {
		const homeUrl = (document.documentElement.dataset.base || "/") as string;
		if (window.swup) {
			window.swup.navigate(homeUrl);
		} else {
			window.location.href = homeUrl;
		}
	}

	public syncPageState(): void {
		const container = document.getElementById("swup-container");
		const currentPage = container?.dataset.currentPage;
		const controls = document.getElementById("floating-controls");
		if (controls) {
			controls.dataset.fabTextObstruction = String(currentPage === "post");
		}
		this.refreshTextObstructionTargets();
		this.resetMobileVisibility();
		const hasCommentsAttr = container?.dataset.hasComments;
		const items = document.querySelectorAll<HTMLElement>("[data-fab-item]");

		let visibilityChanged = false;
		items.forEach((item) => {
			const type = item.dataset.fabType;
			const pagesAttr = item.dataset.fabPages;

			let isAllowed = true;
			if (pagesAttr && pagesAttr !== "all" && pagesAttr !== "") {
				const allowedPages = pagesAttr.split(",").filter(Boolean);
				isAllowed = Boolean(currentPage && allowedPages.includes(currentPage));
			}
			if (type === "home" && item.dataset.fabOnlySubPages === "true") {
				isAllowed = isAllowed && currentPage !== "home";
			}

			// 评论按钮专属检测：若当前页面未启用/无评论区，则隐藏
			if (type === "comment") {
				const commentSectionExists = Boolean(
					document.querySelector("#comments, [data-comment-section]"),
				);
				const isCommentActive =
					hasCommentsAttr === "true" || commentSectionExists;
				if (!isCommentActive) {
					isAllowed = false;
				}
			}

			const nextAllowed = String(isAllowed);
			if (item.dataset.fabPageAllowed !== nextAllowed) {
				item.dataset.fabPageAllowed = nextAllowed;
				visibilityChanged = true;
			}
		});
		if (visibilityChanged) this.scheduleVisibilitySync();

		this.syncFloatingToc();
		this.closeToc();
	}

	private getFabSlot(item: HTMLElement): HTMLElement {
		let current = item;
		while (
			current.parentElement &&
			current.parentElement.id !== "floating-controls"
		) {
			current = current.parentElement;
		}
		return current;
	}

	private getVisibleSlots(): HTMLElement[] {
		return Array.from(
			document.querySelectorAll<HTMLElement>(
				"#floating-controls > [data-fab-slot]:not(.hidden), #floating-controls > [data-fab-item]:not(.hidden)",
			),
		);
	}

	private scheduleVisibilitySync(): void {
		this.visibilityGeneration += 1;
		this.visibilitySync = this.visibilitySync.then(() =>
			this.syncVisibilityCollection(),
		);
	}

	private shouldShowItem(item: HTMLElement): boolean {
		const pageAllowed = item.dataset.fabPageAllowed !== "false";
		const scrollAllowed =
			item.dataset.fabType !== "top" ||
			item.dataset.fabScrollAllowed === "true";
		return pageAllowed && scrollAllowed;
	}

	private async syncVisibilityCollection(): Promise<void> {
		const generation = this.visibilityGeneration;
		const items = Array.from(
			document.querySelectorAll<HTMLElement>("[data-fab-item]"),
		);
		const slots = items.map((item) => ({
			item,
			slot: this.getFabSlot(item),
			show: this.shouldShowItem(item),
		}));
		const exiters = slots.filter(
			({ slot, show }) => !show && !slot.classList.contains("hidden"),
		);
		const enterers = slots.filter(
			({ slot, show }) => show && slot.classList.contains("hidden"),
		);
		if (exiters.length === 0 && enterers.length === 0) return;

		const visibleBefore = this.getVisibleSlots();
		const rects = new Map(
			visibleBefore.map((visible) => [
				visible,
				visible.getBoundingClientRect(),
			]),
		);

		if (!this.animateVisibility || prefersReducedMotion()) {
			exiters.forEach(({ slot }) => {
				slot.classList.add("hidden");
			});
			enterers.forEach(({ slot }) => {
				slot.classList.remove("hidden");
			});
			this.clearLegacyVisibilityClasses(slots);
			this.syncTextObstruction();
			return;
		}
		this.clearLegacyVisibilityClasses(slots);

		await Promise.all(exiters.map(({ slot }) => fadeOutThenHide(slot)));
		if (generation !== this.visibilityGeneration) {
			return;
		}
		enterers.forEach(({ slot }) => {
			slot.classList.remove("hidden");
		});
		const settlingAnimations = new Set<Animation>();
		visibleBefore
			.filter((visible) => !exiters.some(({ slot }) => slot === visible))
			.forEach((visible) => {
				const rect = rects.get(visible);
				if (!rect) return;
				const before = new Set(visible.getAnimations());
				flipFromRect(visible, rect);
				visible.getAnimations().forEach((animation) => {
					if (!before.has(animation)) settlingAnimations.add(animation);
				});
			});
		enterers.forEach(({ slot }) => {
			const before = new Set(slot.getAnimations());
			revealIn(slot);
			slot.getAnimations().forEach((animation) => {
				if (!before.has(animation)) settlingAnimations.add(animation);
			});
		});
		this.syncTextObstruction();
		if (settlingAnimations.size > 0) {
			void Promise.all(
				Array.from(settlingAnimations, (animation) =>
					animation.finished.catch(() => undefined),
				),
			).then(() => this.syncTextObstruction());
		}
	}

	private clearLegacyVisibilityClasses(
		slots: Array<{ item: HTMLElement; slot: HTMLElement }>,
	): void {
		slots.forEach(({ item, slot }) => {
			item.classList.remove("is-hidden", "is-page-hidden");
			slot.classList.remove("is-hidden", "is-page-hidden");
		});
	}

	public syncFloatingToc(): void {
		const tree = document.getElementById("floating-toc-tree");
		const source = document.querySelector("#toc nav.m3-blog-toc");
		const panel = document.getElementById("floating-toc-panel");
		if (!tree || !panel) return;
		if (!source) {
			const empty = document.createElement("div");
			empty.className =
				"py-6 text-center text-xs text-[var(--on-surface-variant)]";
			empty.textContent = panel.dataset.emptyLabel ?? "";
			tree.replaceChildren(empty);
			return;
		}
		const clone = source.cloneNode(true) as HTMLElement;
		const maxDepth = Number.parseInt(panel.dataset.tocMaxDepth ?? "3", 10);
		const entries = [
			...clone.querySelectorAll<HTMLElement>("[data-toc-depth]"),
		];
		const depths = entries
			.map((entry) => Number.parseInt(entry.dataset.tocDepth ?? "", 10))
			.filter(Number.isFinite);
		const baseDepth = depths.length > 0 ? Math.min(...depths) : 1;
		entries.forEach((entry) => {
			const depth = Number.parseInt(entry.dataset.tocDepth ?? "", 10);
			if (Number.isFinite(depth) && depth >= baseDepth + maxDepth) {
				entry.remove();
			}
		});
		tree.replaceChildren(clone);
	}

	private trapFocus(event: KeyboardEvent, panel: HTMLElement): void {
		const focusable = [
			...panel.querySelectorAll<HTMLElement>(
				"button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
			),
		];
		if (!focusable.length) {
			event.preventDefault();
			panel.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	private bindSwupHooks(): void {
		const swup = window.swup;
		if (!swup) {
			document.addEventListener("swup:enable", () => this.bindSwupHooks(), {
				once: true,
			});
			return;
		}
		swup.hooks.on("content:replace", () => this.syncPageState());
		swup.hooks.on("page:view", () => this.syncPageState());
		swup.hooks.on("visit:start", () => this.closeToc());
	}
}

let controllerInstance: FabController | null = null;

export function initFabController(): FabController {
	if (!controllerInstance) {
		controllerInstance = new FabController();
		(window as unknown as { __shironeFab: FabController }).__shironeFab =
			controllerInstance;
	} else {
		controllerInstance.syncPageState();
	}
	return controllerInstance;
}
