<script lang="ts">
/**
 * 全站导航抽屉（M3 ModalNavigationDrawer 应用，自包含实现，不改原子）。
 * 顶部栏菜单按钮派发 site-drawer:toggle 事件开合；内容：
 *   一级导航（navBarConfig）+ 可折叠「分类」分组（多级扩展点）。
 * 链接由 Swup 自动接管，点击后收起抽屉；高亮与当前路由/分类筛选同步。
 */
import Icon from "@iconify/svelte";
import I18nKey from "@i18n/i18nKey";
import { getTranslation } from "@i18n/translation";
import { resolveNavBarLinks, resolvePageKey } from "@utils/nav-utils";
import { url } from "@utils/url-utils";
import { onMount, tick } from "svelte";
import { siteConfig } from "@/config";
import { navBarConfig } from "@/config/navBarConfig";
import { siteLocales } from "../../user/user-config";

let { lang }: { lang?: string } = $props();
const defaultLocale = siteConfig.lang.replaceAll("_", "-");
let pageLocale = $state((lang || defaultLocale).replaceAll("_", "-"));
let localizedRoute = $state(false);

function routeLocale(path: string): string | undefined {
	const base = (import.meta.env?.BASE_URL ?? "/").replace(/\/+$/, "");
	const stripped = base && (path === base || path.startsWith(`${base}/`)) ? path.slice(base.length) : path;
	return siteLocales.find((locale: string) => locale !== defaultLocale && (stripped === `/${locale}` || stripped.startsWith(`/${locale}/`)));
}
localizedRoute = false;

function localizedHref(path?: string, external = false) {
	if (!path || external) return path;
	const localized = localizedRoute && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/series") && !path.startsWith("/bangumi")
		? `/${pageLocale}${path}` : path;
	return url(localized);
}

function localizedLabel(name: string, pageKey?: string) {
	if (!localizedRoute || !pageKey) return name;
	const t = getTranslation(pageLocale.replaceAll("-", "_"));
	const labels: Record<string, string> = {
		home: t[I18nKey.home],
		posts: pageLocale === "ja" ? "記事" : pageLocale.startsWith("en") ? "Posts" : "文章",
		categories: t[I18nKey.categories],
		archive: t[I18nKey.archive],
		tags: t[I18nKey.tags],
		series: t[I18nKey.series],
	};
	return labels[pageKey] ?? name;
}

let open = $state(false);
let activePrimary = $state("");
const openGroups = $state<Record<string, boolean>>({});

const links = resolveNavBarLinks(navBarConfig.links);

const localeNames: Record<string, string> = {
	"zh-CN": "中文",
	en: "EN",
	ja: "日本語",
};
// Language-switch targets reuse the same availability contract as TopAppBar:
// a real translated entity when provided, otherwise the target locale homepage.
// The switcher derives its targets on the client from the page hreflang links
// (already serialized in <head>), keeping the serialized island payload tiny.
let hydrated = $state(false);
let pageAlternates = $state<Array<{ lang: string; href: string }> | undefined>(undefined);
$effect(() => {
	hydrated = true;
	pageAlternates = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')]
		.map((link) => ({ lang: link.getAttribute("hreflang") ?? "", href: link.href }));
});
const languageSwitchTargets = $derived.by(() => {
	const alts = pageAlternates ?? [];
	return (siteLocales as string[])
		.filter((locale: string) => locale !== pageLocale)
		.map((locale: string) => {
			const direct = alts.find((alt) => alt.lang === locale)?.href;
			let href: string;
			if (direct) {
				try {
					href = new URL(direct).pathname;
				} catch {
					href = direct;
				}
			} else {
				href = url(locale === defaultLocale ? "/" : `/${locale}/`);
			}
			return {
				locale,
				label: localeNames[locale] ?? locale,
				href,
				active: locale === pageLocale,
				exact: Boolean(direct),
			};
		});
});

const primaryItems = $derived(links.map((link) => {
	const key = link.name.toLowerCase();
	return {
		value: key,
		label: localizedLabel(link.name, link.pageKey),
		icon: link.icon,
		href: localizedHref(link.url, link.external),
		external: !!link.external,
		pageKey: link.pageKey ?? "",
		children: link.children?.map((child) => ({
			value: child.name.toLowerCase(),
			label: localizedLabel(child.name, child.pageKey),
			icon: child.icon,
			href: localizedHref(child.url, child.external),
			external: !!child.external,
			pageKey: child.pageKey ?? "",
		})),
	};
}));

function syncFromRoute() {
	const locale = routeLocale(window.location.pathname);
	pageLocale = locale ?? defaultLocale;
	localizedRoute = Boolean(locale);
	const pageKey = resolvePageKey(new URL(window.location.href));
	activePrimary = "";
	for (const item of primaryItems) {
		if (item.pageKey && item.pageKey === pageKey) {
			activePrimary = item.value;
			break;
		}
		const activeChild = item.children?.find(
			(child) => child.pageKey && child.pageKey === pageKey,
		);
		if (activeChild) {
			activePrimary = activeChild.value;
			openGroups[item.value] = true;
			break;
		}
	}
}

// 点击链接后收起抽屉；外部链接不改变路由，高亮已由路由同步维护
function handleNavClick() {
	open = false;
	document
		.getElementById("nav-drawer-switch")
		?.setAttribute("aria-expanded", "false");
}

function toggleGroup(group: string) {
	openGroups[group] = !openGroups[group];
}

onMount(() => {
	syncFromRoute();
	const syncButtonAria = (isOpen: boolean) => {
		document
			.getElementById("nav-drawer-switch")
			?.setAttribute("aria-expanded", String(isOpen));
	};
	// The open class and its computed visibility land one frame after the state
	// update, so focusing in `tick()` alone silently did nothing.
	const focusFirstItem = (frames = 0) => {
		const panel = drawerEl;
		const target = panel?.querySelector<HTMLElement>("a, button");
		if (!open || !panel || !target) return;
		if (getComputedStyle(panel).visibility !== "visible") {
			if (frames < 120) requestAnimationFrame(() => focusFirstItem(frames + 1));
			return;
		}
		target.focus();
	};
	// Replay taps recorded before this island subscribed, then own the state again.
	const root = document.documentElement;
	if (Number(root.dataset.siteDrawerPending ?? 0) % 2 === 1) {
		open = true;
		tick().then(() => focusFirstItem());
	}
	delete root.dataset.siteDrawerPending;
	syncButtonAria(open);
	const onToggle = () => {
		delete document.documentElement.dataset.siteDrawerPending;
		open = !open;
		syncButtonAria(open);
		if (open) tick().then(() => focusFirstItem());
	};
	const closeDrawer = () => {
		open = false;
		syncButtonAria(false);
		document.getElementById("nav-drawer-switch")?.focus();
	};
	// The panel is aria-modal, so Tab must stay inside it while it is open.
	const focusableItems = () => {
		const panel = drawerEl;
		if (!panel) return [] as HTMLElement[];
		return [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
			.filter((item) => item.checkVisibility?.({ visibilityProperty: true }) ?? true);
	};
	const onKey = (e: KeyboardEvent) => {
		if (!open) return;
		if (e.key === "Escape") {
			closeDrawer();
			return;
		}
		if (e.key !== "Tab") return;
		const items = focusableItems();
		if (!items.length) return;
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		const outside = !drawerEl?.contains(active);
		if (e.shiftKey ? active === first || outside : active === last || outside) {
			e.preventDefault();
			(e.shiftKey ? last : first).focus();
		}
	};
	const onClose = () => closeDrawer();
	const desktopMedia = window.matchMedia("(min-width: 1024px)");
	const onDesktopChange = (e: MediaQueryListEvent) => {
		if (e.matches && open) {
			open = false;
			syncButtonAria(false);
		}
	};
	document.addEventListener("site-drawer:toggle", onToggle);
	document.addEventListener("site-drawer:close", onClose);
	document.addEventListener("swup:content:replace", syncFromRoute);
	document.addEventListener("swup:page:view", syncFromRoute);
	window.addEventListener("keydown", onKey);
	desktopMedia.addEventListener("change", onDesktopChange);
	return () => {
		document.removeEventListener("site-drawer:toggle", onToggle);
		document.removeEventListener("site-drawer:close", onClose);
		document.removeEventListener("swup:content:replace", syncFromRoute);
		document.removeEventListener("swup:page:view", syncFromRoute);
		window.removeEventListener("keydown", onKey);
		desktopMedia.removeEventListener("change", onDesktopChange);
	};
});

let drawerEl: HTMLElement | undefined = $state();
</script>

<div
	class="site-drawer"
	class:site-drawer--open={open}
>
	<div class="site-drawer__scrim" aria-hidden="true" onclick={() => document.dispatchEvent(new CustomEvent("site-drawer:close"))}></div>
	<aside
		bind:this={drawerEl}
		id="site-drawer-panel"
		class="site-drawer__panel"
		role="dialog"
		aria-modal="true"
		aria-label={siteConfig.title}
	>
		<div class="site-drawer__brand">
			<div class="site-drawer__title">{siteConfig.title}</div>
			<div class="site-drawer__subtitle">{siteConfig.subtitle}</div>
		</div>

		<nav class="site-drawer__nav" aria-label="Navigation drawer">
			{#each primaryItems as item (item.value)}
				{#if item.children}
					<div class="site-drawer__group">
						<button type="button" class="site-drawer__group-head" class:site-drawer__item--active={item.children.some((child) => activePrimary === child.value)} onclick={() => toggleGroup(item.value)} aria-expanded={openGroups[item.value] ?? false}>
							{#if item.icon}<span class="site-drawer__group-icon" aria-hidden="true"><Icon icon={item.icon} /></span>{/if}
							<span class="site-drawer__group-label">{item.label}</span>
							<Icon class={openGroups[item.value] ? "site-drawer__group-arrow site-drawer__group-arrow--open" : "site-drawer__group-arrow"} icon="material-symbols:keyboard-arrow-down" />
						</button>
						{#if openGroups[item.value]}
							<div class="site-drawer__group-body">
								{#each item.children as child (child.value)}
									<a href={child.href} class="site-drawer__item site-drawer__item--child" class:site-drawer__item--active={activePrimary === child.value} aria-current={activePrimary === child.value ? "page" : undefined} target={child.external ? "_blank" : undefined} rel={child.external ? "noopener noreferrer" : undefined} onclick={handleNavClick}>
										{#if child.icon}<span class="site-drawer__item-icon" aria-hidden="true"><Icon icon={child.icon} /></span>{/if}
										<span class="site-drawer__item-label">{child.label}</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{:else if item.href}
					<a href={item.href} class="site-drawer__item" class:site-drawer__item--active={activePrimary === item.value} aria-current={activePrimary === item.value ? "page" : undefined} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} onclick={handleNavClick}>
						{#if item.icon}<span class="site-drawer__item-icon" aria-hidden="true"><Icon icon={item.icon} /></span>{/if}
						<span class="site-drawer__item-label">{item.label}</span>
					</a>
				{/if}
			{/each}
			{#if hydrated && languageSwitchTargets.length > 0}
				<div class="site-drawer__lang-row" data-lang-switcher>
					{#each languageSwitchTargets as target (target.locale)}
						<a href={target.href} data-lang-target={target.locale} data-lang-exact={target.exact ? "true" : "false"} class:site-drawer__lang-item--active={target.active} aria-current={target.active ? "true" : undefined} onclick={handleNavClick}>{target.label}</a>
					{/each}
				</div>
			{/if}
		</nav>
	</aside>
</div>

<style lang="stylus">
.site-drawer
	position: fixed
	inset: 0
	z-index: 60
	visibility: hidden
	pointer-events: none

	&--open
		visibility: visible
		pointer-events: auto

	&__scrim
		position: absolute
		inset: 0
		background: unquote("color-mix(in oklab, var(--scrim, #000) 32%, transparent)")
		opacity: 0
		transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard)

	&--open &__scrim
		opacity: 1

	/* 面板：360dp 宽、surface-container-low、右侧 16dp 大圆角，左侧滑入 */
	&__panel
		position: absolute
		top: 0
		bottom: 0
		left: 0
		display: flex
		flex-direction: column
		width: 360px
		max-width: 85vw
		box-sizing: border-box
		background: var(--surface-container-low)
		color: var(--on-surface)
		border-radius: 0 var(--shape-corner-l) var(--shape-corner-l) 0
		transform: translateX(-100%)
		transition: transform var(--m3e-duration-long) var(--m3e-easing-emphasized-decelerate)

	&--open &__panel
		transform: translateX(0)

	&__brand
		padding: var(--m3e-space-5) var(--shape-corner-xl) var(--m3e-space-3)
		flex: none

	&__title
		font: var(--m3e-type-title-large)
		color: var(--on-surface)

	&__subtitle
		margin-top: var(--m3e-space-1)
		font: var(--m3e-type-body-medium)
		color: var(--on-surface-variant)

	&__nav
		flex: 1
		overflow-y: auto
		padding: var(--m3e-space-2) var(--m3e-space-3) var(--m3e-space-4)

	/* 一级/子项：全宽 56dp，选中整项 secondary-container 全圆 pill */
	&__item
		display: flex
		align-items: center
		gap: var(--m3e-space-3)
		width: 100%
		min-height: 56px
		box-sizing: border-box
		padding: 0 var(--m3e-space-4)
		border-radius: var(--shape-corner-full)
		color: var(--on-surface-variant)
		text-decoration: none
		cursor: pointer
		transition:
			background-color var(--m3e-duration-short) var(--m3e-easing-standard),
			color var(--m3e-duration-short) var(--m3e-easing-standard)

		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")

		&:focus-visible
			outline: 2px solid var(--secondary)
			outline-offset: -2px

		&--active
			background: var(--secondary-container)
			color: var(--on-secondary-container)
			&:hover
				background: var(--secondary-container)

		&--child
			min-height: 48px
			padding-left: var(--m3e-space-8)

	&__item-icon
		display: flex
		flex: none
		color: var(--on-surface-variant)
		> :global(svg)
			width: 1.5rem
			height: 1.5rem

	&__item--active &__item-icon
		color: var(--on-secondary-container)

	&__item-label
		flex: 1
		min-width: 0
		font: var(--m3e-type-label-large)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__item--child &__item-label
		font: var(--m3e-type-body-medium)

	/* 分组头部 */
	&__group
		margin-top: 4px

	&__group-head
		display: flex
		align-items: center
		gap: 12px
		width: 100%
		min-height: 56px
		box-sizing: border-box
		padding: 0 16px
		border: none
		border-radius: var(--shape-corner-full)
		background: none
		color: var(--on-surface-variant)
		cursor: pointer
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)
		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")
		&:focus-visible
			outline: 2px solid var(--secondary)
			outline-offset: -2px

	&__group-icon
		display: flex
		flex: none
		> :global(svg)
			width: 1.5rem
			height: 1.5rem

	&__group-label
		flex: 1
		text-align: left
		font: var(--m3e-type-label-large)
		color: var(--on-surface-variant)

	&__group-arrow
		display: flex
		flex: none
		transition: transform var(--m3e-duration-short) var(--m3e-easing-standard)
		> :global(svg)
			width: 1.25rem
			height: 1.25rem

		&--open
			transform: rotate(180deg)

	/* 语言切换：紧凑 pill 行，不占用可折叠分组 */
	&__lang-row
		display: flex
		gap: var(--m3e-space-2)
		padding: var(--m3e-space-2) var(--m3e-space-2) 0

	&__lang-item
		flex: 1
		display: flex
		align-items: center
		justify-content: center
		min-height: 40px
		border-radius: var(--shape-corner-full)
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)
		text-decoration: none
		background: var(--surface-container)
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)
		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")
		&:focus-visible
			outline: 2px solid var(--secondary)
			outline-offset: -2px

		&--active
			background: var(--secondary-container)
			color: var(--on-secondary-container)
</style>
