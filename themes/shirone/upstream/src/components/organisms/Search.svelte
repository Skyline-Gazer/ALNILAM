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

// client:only island: follow the page language, including after Swup navigation.
let pageLocale = "en";
$: t = (key: I18nKey) => i18nForLocale(pageLocale, key);

$: panelResults = result.map((r) => ({
	url: r.url,
	title: r.meta.title,
	excerpt: r.excerpt,
}));

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

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
	if (panel && !panel.classList.contains("float-panel-closed")) {
		void (
			window as unknown as { __loadPagefind?: () => Promise<unknown> }
		).__loadPagefind?.();
		panel.querySelector<HTMLInputElement>("input")?.focus();
	}
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
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
		setPanelVisibility(result.length > 0, isDesktop);
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
    hideInputOnDesktop
/>
