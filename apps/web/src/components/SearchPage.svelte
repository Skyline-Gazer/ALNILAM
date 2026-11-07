<script lang="ts">
  import { onDestroy } from "svelte";

  let { locale }: { locale: string } = $props();
  const strings: Record<string, { label: string; searching: string; empty: string; error: string }> = {
    "zh-CN": { label: "搜索文章", searching: "搜索中…", empty: "没有找到结果。", error: "搜索暂时不可用。" },
    en: { label: "Search articles", searching: "Searching…", empty: "No results found.", error: "Search is unavailable." },
    ja: { label: "記事を検索", searching: "検索中…", empty: "結果が見つかりませんでした。", error: "検索を利用できません。" },
  };
  const t = strings[locale] ?? strings.en;
  type Result = { url: string; meta?: { title?: string }; excerpt?: string };
  type Api = { search(query: string): Promise<{ results: { data(): Promise<Result> }[] }> };
  let query = $state("");
  let results = $state<Result[]>([]);
  let status = $state<"idle" | "searching" | "done" | "error">("idle");
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function search(value: string, current: number) {
    try {
      const loader = (window as Window & { __loadPagefind?: () => Promise<unknown> }).__loadPagefind;
      if (!loader) throw new Error("Pagefind unavailable");
      const api = await loader() as Api;
      const response = await api.search(value);
      const data = await Promise.all(response.results.slice(0, 20).map((item) => item.data()));
      if (current !== generation) return;
      const seen = new Set<string>();
      results = data.filter((item) => item?.url && !seen.has(item.url) && !!seen.add(item.url));
      status = "done";
    } catch {
      if (current === generation) status = "error";
    }
  }

  function onInput() {
    const current = ++generation;
    clearTimeout(timer);
    const value = query.trim();
    results = [];
    if (!value) { status = "idle"; return; }
    status = "searching";
    timer = setTimeout(() => void search(value, current), 200);
  }

  onDestroy(() => { generation++; clearTimeout(timer); });
</script>

<div data-pagefind-ignore="all" class="p-6">
  <label for="page-search" class="block mb-2 font-semibold">{t.label}</label>
  <input id="page-search" type="search" bind:value={query} oninput={onInput} class="w-full rounded-xl px-4 py-3" style="border: 1px solid var(--outline-variant); background: var(--surface-container); color: var(--on-surface)" />
  <div class="mt-4" aria-live="polite" data-search-results>
    {#if status === "searching"}<p>{t.searching}</p>
    {:else if status === "error"}<p>{t.error}</p>
    {:else if status === "done" && results.length === 0}<p>{t.empty}</p>
    {:else if results.length}
      <ul class="space-y-3">
        {#each results as result (result.url)}
          <li><a class="block rounded-xl p-3 hover:bg-[var(--primary-container)]" href={result.url}>
            <span class="block font-semibold">{result.meta?.title ?? result.url}</span>
            <span class="block text-sm">{(result.excerpt ?? "").replaceAll("<mark>", "").replaceAll("</mark>", "")}</span>
          </a></li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
