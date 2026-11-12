<script lang="ts">
import IconButton from "@components/atoms/action/IconButton.svelte";
import SearchPanel from "@components/atoms/blog/SearchPanel.svelte";
import SearchBar from "@components/molecules/SearchBar.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18nForLocale } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;
let requestGeneration = 0;
// The desktop capsule and the mobile panel are separate inputs sharing one
// results panel, so the empty state must follow the query the visitor can see.
let desktopLayout = false;

// client:only island: follow the page language, including after Swup navigation.
let pageLocale = "en";
$: t = (key: I18nKey) => i18nForLocale(pageLocale, key);

$: panelResults = result.map((r) => ({
	url: r.url,
	title: r.meta.title,
	excerpt: r.excerpt,
}));

// A finished search that matched nothing is an answer, not a broken panel:
// the panel states it instead of showing an empty box.
$: visibleQuery = desktopLayout ? keywordDesktop : keywordMobile;
$: showNoResults =
	Boolean(visibleQuery.trim()) &&
	panelResults.length === 0 &&
	!isSearching;

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

let panelOpen = false;
const syncPanelOpen = (panel = document.getElementById("search-panel")): void => {
	panelOpen = Boolean(panel && !panel.classList.contains("float-panel-closed"));
};

// Visibility inherits a frame after the class change, so a synchronous focus()
// on the freshly opened panel is ignored.
const focusPanelInput = (frames = 0): void => {
	const panel = document.getElementById("search-panel");
	const input = panel?.querySelector<HTMLInputElement>("input");
	if (!panelOpen || !input) return;
	if (input.checkVisibility?.({ visibilityProperty: true }) === false) {
		if (frames < 60) requestAnimationFrame(() => focusPanelInput(frames + 1));
		return;
	}
	input.focus();
};

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
	syncPanelOpen(panel);
	if (panel && panelOpen) {
		void (
			window as unknown as { __loadPagefind?: () => Promise<unknown> }
		).__loadPagefind?.();
		requestAnimationFrame(() => focusPanelInput());
	}
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel) return;
	if (!isDesktop) {
		syncPanelOpen(panel);
		return;
	}

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
	syncPanelOpen(panel);
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	const generation = ++requestGeneration;
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		if (import.meta.env.PROD) {
			if (
				!window.pagefind &&
				typeof (
					window as unknown as { __loadPagefind?: () => Promise<unknown> }
				).__loadPagefind === "function"
			) {
				await (
					window as unknown as { __loadPagefind: () => Promise<unknown> }
				).__loadPagefind();
			}
			pagefindLoaded = typeof window.pagefind?.search === "function";
			if (pagefindLoaded && window.pagefind) {
				const response = await window.pagefind.search(keyword);
				searchResults = await Promise.all(
					response.results.map((item) => item.data()),
				);
			} else {
				searchResults = [];
				console.error("Pagefind is not available in production environment.");
			}
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		}

		if (!initialized || generation !== requestGeneration) return;
		result = searchResults;
		// The results panel opens when the search finishes, carrying either the
		// results or the explicit no-results state. An empty result set must not
		// read as a panel that failed to open.
		setPanelVisibility(true, isDesktop);
	} catch (error) {
		if (!initialized || generation !== requestGeneration) return;
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		if(generation === requestGeneration) isSearching = false;
	}
};

onMount(() => {
	const syncLocale = () => {
		pageLocale = document.documentElement.lang || pageLocale;
	};
	syncLocale();
	document.addEventListener("swup:page:view", syncLocale);
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		console.log("Pagefind status on init:", pagefindLoaded);
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	const loadError = () => initializeSearch();
	// The visible query lives in the desktop capsule above 1024px and in the
	// panel input below it, so the layout decides which query the empty state
	// refers to.
	const desktopMedia = window.matchMedia("(min-width: 1024px)");
	const syncLayout = () => {
		desktopLayout = desktopMedia.matches;
	};
	syncLayout();
	desktopMedia.addEventListener("change", syncLayout);
	const escape = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		const panel = document.getElementById("search-panel");
		if (!panel || panel.classList.contains("float-panel-closed")) return;
		panel.classList.add("float-panel-closed");
		requestGeneration++;
		const trigger = window.matchMedia("(min-width: 1024px)").matches ? "search-input-desktop-switch" : "search-switch";
		document.getElementById(trigger)?.focus();
	};
	document.addEventListener("pagefindready", initializeSearch);
	// Outside-click closing happens in the Layout runtime; observe the class so the
	// toggle's aria-expanded never goes stale.
	const panelEl = document.getElementById("search-panel");
	const panelObserver = panelEl
		? new MutationObserver(() => syncPanelOpen(panelEl))
		: undefined;
	panelObserver?.observe(panelEl as HTMLElement, { attributes: true, attributeFilter: ["class"] });
	syncPanelOpen(panelEl);
	document.addEventListener("pagefindloaderror", loadError);
	document.addEventListener("keydown", escape);
	initializeSearch();
	return () => {
		initialized = false;
		requestGeneration++;
		document.removeEventListener("swup:page:view", syncLocale);
		document.removeEventListener("pagefindready", initializeSearch);
		document.removeEventListener("pagefindloaderror", loadError);
		document.removeEventListener("keydown", escape);
		desktopMedia.removeEventListener("change", syncLayout);
		panelObserver?.disconnect();
	};
});

$: if (initialized) {
	(async () => {
		await search(keywordDesktop, true);
	})();
}

$: if (initialized) {
	(async () => {
		await search(keywordMobile, false);
	})();
}
</script>

<!-- 桌面搜索：SearchBar 分子（40px 图标按钮，hover/点击展开成胶囊搜索条） -->
<SearchBar
    bind:value={keywordDesktop}
    id="search-input-desktop"
    name="search-desktop"
    placeholder={t(I18nKey.search)}
    onfocus={() => { void (window as unknown as { __loadPagefind?: () => Promise<unknown> }).__loadPagefind?.(); void search(keywordDesktop, true); }}
    oncollapse={() => { requestGeneration++; isSearching=false; setPanelVisibility(false, true); }}
/>

<!-- toggle btn for phone/tablet view -->
<IconButton
    icon="material-symbols:search"
    label={t(I18nKey.search)}
    id="search-switch"
    size="small"
    shape="round"
    ariaExpanded={panelOpen}
    ariaControls="search-panel"
    onclick={togglePanel}
    class="lg:!hidden !w-10 !h-10 !text-[1.25rem]"
/>

<!-- search panel（blog/SearchPanel 原子；开合由调用方 classList 控制，与 DisplaySettings 同款） -->
<SearchPanel
    id="search-panel"
    class="float-panel float-panel-closed absolute md:w-[30rem] top-20 left-4 md:left-[unset] right-4"
    bind:query={keywordMobile}
    results={panelResults}
    placeholder={t(I18nKey.search)}
    noResultsText={t(I18nKey.searchNoResults)}
    showNoResults={showNoResults}
    hideInputOnDesktop
/>
