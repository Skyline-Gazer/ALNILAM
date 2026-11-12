<script lang="ts">
  import { onDestroy } from "svelte";
  import { uiStrings } from "../lib/i18n.mjs";

  let { locale }: { locale: string } = $props();
  const t = uiStrings(locale);
  type Result = { url: string; meta?: { title?: string }; excerpt?: string };
  type Api = { search(query: string): Promise<{ results: { data(): Promise<Result> }[] }> };
  let query = $state("");
  let results = $state<Result[]>([]);
  let status = $state<"idle" | "searching" | "done" | "error">("idle");
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function isInternalUrl(url: unknown): url is string {
    if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(url)) return false;
    try { return new URL(url, window.location.origin).origin === window.location.origin; }
    catch { return false; }
  }

  function decodeExcerpt(excerpt: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = excerpt.replaceAll("___END_PAGEFIND_WEIGHT___", "").replaceAll("<mark>", "").replaceAll("</mark>", "");
    return textarea.value;
  }

  async function search(value: string, current: number) {
    try {
      const loader = (window as Window & { __loadPagefind?: () => Promise<unknown> }).__loadPagefind;
      if (!loader) throw new Error("Pagefind unavailable");
      const api = await loader() as Api;
      const response = await api.search(value);
      const data = await Promise.all(response.results.slice(0, 20).map((item) => item.data()));
      if (current !== generation) return;
      const seen = new Set<string>();
      results = data.filter((item) => isInternalUrl(item?.url) && !seen.has(item.url) && !!seen.add(item.url))
        .map((item) => ({ ...item, excerpt: decodeExcerpt(item.excerpt ?? "") }));
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
  <label for="page-search" class="block mb-2 font-semibold">{t.searchLabel}</label>
  <input id="page-search" type="search" bind:value={query} oninput={onInput} class="w-full rounded-xl px-4 py-3" style="border: 1px solid var(--outline-variant); background: var(--surface-container); color: var(--on-surface)" />
  <div class="mt-4" aria-live="polite" data-search-results>
    {#if status === "searching"}<p>{t.searchSearching}</p>
    {:else if status === "error"}<p>{t.searchError}</p>
    {:else if status === "done" && results.length === 0}<p>{t.searchEmpty}</p>
    {:else if results.length}
      <ul class="space-y-3">
        {#each results as result (result.url)}
          <li><a class="block rounded-xl p-3 hover:bg-[var(--primary-container)]" href={result.url}>
            <span class="block font-semibold">{result.meta?.title ?? result.url}</span>
            <span class="block text-sm">{result.excerpt ?? ""}</span>
          </a></li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
