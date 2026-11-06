<script lang="ts">
/**
 * 归档面板：分组切换（SegmentedButton，按年 / 按分类 / 按标签）+ 时间轴列表（组折叠见 ArchiveList 原子）。
 * URL 参数（?category= / ?tag= / ?uncategorized）是定向浏览视图：隐藏分组切换，
 * 顶部显示筛选头（面包屑）——索引页链接 › 当前筛选值，一键回溯到分类/标签索引页；
 * 无筛选时显示分组切换，可按年 / 按分类 / 按标签切换全量归档的分组。
 */
import ArchiveList, {
	type ArchiveGroup,
	type ArchiveItem,
} from "@components/atoms/blog/ArchiveList.svelte";
import Card from "@components/atoms/display/Card.svelte";
import SegmentedButton from "@components/atoms/selection/SegmentedButton.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { formatCalendarDate } from "@utils/content-date";
import { getPostUrlBySlug, url } from "@utils/url-utils";
import { onMount } from "svelte";

interface Post {
	slug: string;
	url?: string;
	data: {
		title: string;
		tags: string[];
		category: string | null;
		published: Date;
	};
}

interface Breadcrumb {
	href: string;
	label: string;
	value: string;
}

interface Props {
	sortedPosts?: Post[];
	/** SSR 初始筛选：分类稳定键（slug/id）。仅预置，URL 显式参数仍可覆盖。 */
	initialCategory?: string;
	/** SSR 初始筛选：标签稳定键。 */
	initialTag?: string;
	/** SSR 初始筛选：仅未分类。 */
	initialUncategorized?: boolean;
	/** SSR 初始分组维度：year / category / tag。 */
	initialGroupBy?: string;
	/** 视图已由宿主页面预过滤（如分类/标签详情页）：面板跳过自身筛选，避免二次过滤致空。 */
	preScoped?: boolean;
	/** 定向视图面包屑覆盖；缺省时由当前筛选推导。 */
	breadcrumb?: Breadcrumb | null;
	/** 分类稳定键 → 本地化展示名（仅用于展示，绝不参与筛选匹配）。 */
	categoryLabels?: Record<string, string>;
	/** 标签稳定键 → 本地化展示名（仅用于展示）。 */
	tagLabels?: Record<string, string>;
}

let {
	sortedPosts = [] as Post[],
	initialCategory = "",
	initialTag = "",
	initialUncategorized = false,
	initialGroupBy = "year",
	preScoped = false,
	breadcrumb = null,
	categoryLabels = {},
	tagLabels = {},
}: Props = $props();

let category = $state(initialCategory);
let tag = $state(initialTag);
let uncategorized = $state(initialUncategorized);
/** 分组维度（SegmentedButton 驱动）：year / category / tag，string 以匹配 bind:value */
let groupBy = $state<string>(initialGroupBy);

let restoredCollapsed = $state<Record<string, boolean> | undefined>(undefined);

const COLLAPSED_STORAGE_KEY = "shirone:archive-collapsed";

function collapsedViewKey() {
	if (uncategorized) return `${groupBy}:uncategorized`;
	if (category) return `${groupBy}:category:${category}`;
	if (tag) return `${groupBy}:tag:${tag}`;
	return groupBy;
}

function readCollapsedState() {
	try {
		const stored = JSON.parse(
			localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "{}",
		) as Record<string, Record<string, boolean>>;
		restoredCollapsed = stored[collapsedViewKey()];
	} catch {
		restoredCollapsed = undefined;
	}
}

function persistCollapsedState(next: Record<string, boolean>) {
	try {
		const stored = JSON.parse(
			localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "{}",
		) as Record<string, Record<string, boolean>>;
		stored[collapsedViewKey()] = next;
		localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(stored));
	} catch {
		// Storage can be unavailable in privacy-restricted contexts.
	}
}

/** 展示名：稳定键 → 本地化标签（缺省回退原始键）；仅用于展示，绝不参与筛选匹配 */
const categoryDisplay = (key: string) => categoryLabels[key] ?? key;
const tagDisplay = (key: string) => `#${tagLabels[key] ?? key}`;

/** 筛选头数据：类别（决定索引链接）+ 展示值；无筛选为 null；宿主可提供面包屑覆盖 */
const derivedCrumb = $derived.by(() => {
	if (uncategorized) {
		return {
			href: url("/categories/"),
			label: i18n(I18nKey.categories),
			value: i18n(I18nKey.uncategorized),
		};
	}
	if (category) {
		return {
			href: url("/categories/"),
			label: i18n(I18nKey.categories),
			value: categoryDisplay(category),
		};
	}
	if (tag) {
		return {
			href: url("/tags/"),
			label: i18n(I18nKey.tags),
			value: tagDisplay(tag),
		};
	}
	return null;
});
const filterCrumb = $derived(breadcrumb ?? derivedCrumb);

const groupOptions = [
	{ value: "year", label: i18n(I18nKey.archiveGroupYear) },
	{ value: "category", label: i18n(I18nKey.archiveGroupCategory) },
	{ value: "tag", label: i18n(I18nKey.archiveGroupTag) },
];

/** 筛选后的文章（分组维度与之正交，均在下方消费）；
    preScoped 时宿主页面已按自身分类体系（别名/系列回退）完成成员筛选，
    面板不再二次过滤，避免键口径不一致把非空成员集过滤成空 */
const filtered = $derived(
	preScoped
		? sortedPosts
		: sortedPosts.filter((p) => {
				if (uncategorized && p.data.category) return false;
				if (category && p.data.category !== category) return false;
				if (tag && !p.data.tags.includes(tag)) return false;
				return true;
			}),
);

function formatDate(date: Date) {
	return formatCalendarDate(date).slice(5);
}

function toItem(post: Post): ArchiveItem {
	return {
		title: post.data.title,
		href: post.url ?? getPostUrlBySlug(post.slug),
		date: formatDate(post.data.published),
		category: post.data.category ?? undefined,
		tags: post.data.tags,
	};
}

function countLabel(count: number) {
	return `${count} ${i18n(count === 1 ? I18nKey.postCount : I18nKey.postsCount)}`;
}

/** 按当前分组维度构建组；组内保持筛选后顺序（时间倒序）。 */
const groups = $derived.by((): ArchiveGroup[] => {
	if (filtered.length === 0) return [];
	const buckets = new Map<string, ArchiveItem[]>();
	const add = (key: string, item: ArchiveItem) => {
		const list = buckets.get(key);
		if (list) list.push(item);
		else buckets.set(key, [item]);
	};
	if (groupBy === "category") {
		for (const p of filtered) {
			add(p.data.category ?? i18n(I18nKey.uncategorized), toItem(p));
		}
	} else if (groupBy === "tag") {
		for (const p of filtered) {
			for (const t of p.data.tags) add(`#${t}`, toItem(p));
		}
	} else {
		for (const p of filtered) {
			add(formatCalendarDate(p.data.published).slice(0, 4), toItem(p));
		}
	}
	const list = [...buckets.entries()].map(([id, items]) => ({
		id,
		title:
			groupBy === "tag"
				? tagDisplay(id.slice(1))
				: groupBy === "category"
					? (categoryLabels[id] ?? id)
					: id,
		items,
	}));
	if (groupBy === "year") {
		return list.sort((a, b) => Number(b.title) - Number(a.title));
	}
	return list.sort((a, b) =>
		a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
	);
});

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	// 仅当对应键显式出现在 URL 中才覆盖：详情路由（无 query）保持
	// SSR 传入的初始筛选，而不是被重置为空。`?category=` 等定向浏览行为不变。
	if (params.has("category")) category = params.get("category") ?? "";
	if (params.has("tag")) tag = params.get("tag") ?? "";
	if (params.has("uncategorized")) uncategorized = true;
	readCollapsedState();
});

$effect(() => {
	groupBy;
	category;
	tag;
	uncategorized;
	if (typeof window !== "undefined") readCollapsedState();
});
</script>

<Card color="var(--card-bg)" radius="l" class="archive-panel px-8 py-6">
	<!-- 带筛选参数（?category= / ?tag= / ?uncategorized）是定向浏览视图：
	    隐藏分组切换，只留面包屑 + 筛选后时间轴；无筛选才显示分组切换。 -->
	{#if !filterCrumb}
		<div class="archive-panel__group-switch">
			<SegmentedButton
				options={groupOptions}
				bind:value={groupBy}
				label={i18n(I18nKey.archiveGroup)}
			/>
		</div>
	{/if}
	{#if filterCrumb}
		<nav class="archive-panel__crumb" aria-label="Breadcrumb">
			<ol class="archive-panel__crumb-list">
				<li class="archive-panel__crumb-item">
					<a class="archive-panel__crumb-link m3-state-layer" href={filterCrumb.href}>
						{filterCrumb.label}
					</a>
				</li>
				<li class="archive-panel__crumb-separator" aria-hidden="true">
					<Icon icon="material-symbols:chevron-right-rounded" />
				</li>
				<li class="archive-panel__crumb-current">
					<span
						class="archive-panel__crumb-value"
						aria-current="page"
						title={filterCrumb.value}
					>{filterCrumb.value}</span>
				</li>
			</ol>
		</nav>
	{/if}
	{#if groups.length > 0}
		<ArchiveList
			{groups}
			{countLabel}
			{restoredCollapsed}
			onCollapsedChange={persistCollapsedState}
		/>
	{:else}
		<div class="archive-panel__empty">
			<span>{i18n(I18nKey.noData)}</span>
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

:global(.archive-panel)
	@media (max-width: bp-sm - 1px)
		padding: 1rem

.archive-panel
	/* 分组切换（SegmentedButton，站内 pill 语言）与下方时间轴之间的节奏 */
	:global(&__group-switch)
		margin-bottom: var(--m3e-space-4)

	:global(&__empty)
		display: flex
		align-items: center
		justify-content: center
		min-height: 11rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-large)

	:global(&__crumb)
		min-width: 0
		padding: 0 var(--m3e-space-1) var(--m3e-space-3)
		margin-bottom: var(--m3e-space-5)
		border-bottom: 1px solid var(--outline-variant)

	:global(&__crumb-list)
		display: flex
		align-items: center
		min-width: 0
		margin: 0
		padding: 0
		list-style: none

	:global(&__crumb-item)
		flex-shrink: 0

	:global(&__crumb-link)
		display: inline-flex
		align-items: center
		min-height: 2rem
		padding: 0 0.5rem
		margin-left: -0.5rem
		border-radius: var(--shape-corner-m)
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-medium)
		font-weight: 600
		text-decoration: none
		--m3e-state-color: var(--primary)
		> :global(svg)
			width: 1.125rem
			height: 1.125rem
		&:hover
			color: var(--primary)

	:global(&__crumb-separator)
		display: inline-flex
		align-items: center
		justify-content: center
		flex-shrink: 0
		width: 1.5rem
		color: var(--outline)
		> :global(svg)
			width: 1rem
			height: 1rem

	:global(&__crumb-current)
		display: block
		min-width: 0

	:global(&__crumb-value)
		display: block
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		color: var(--primary)
		font: var(--m3e-type-body-medium)
		font-weight: 600

	@media (max-width: bp-sm - 1px)
		:global(&__crumb)
			padding-inline: 0
			padding-bottom: 0.75rem
			margin-bottom: 1rem
</style>
