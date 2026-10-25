<script lang="ts">
  // Pagefind loads its index lazily from /pagefind/ at interaction time —
  // nothing is serialized into the page bundle. We render results with a
  // minimal custom UI (Pagefind's own default-ui bundle is webpack-era and
  // breaks under rolldown; the raw search API is ~40 lines and themeable).
  let open = $state(false);
  let query = $state("");
  let results = $state<{ url: string; title: string; excerpt: string }[]>([]);
  let searching = $state(false);
  // NOTE: deliberately NOT $state — pagefind's module namespace must not be
  // wrapped in a reactive proxy (breaks its internal state); we never render it.
  let searchApi: { search(q: string): Promise<{ results: { data(): Promise<{ url: string; meta: { title?: string }; excerpt: string }>[] } }>; init(): Promise<void>; options(o: Record<string, unknown>): Promise<void> } | undefined;

  const t = {
    placeholder: "搜索文章…",
    zero: (q: string) => `未找到“${q}”相关内容`,
    many: (n: number) => `${n} 个结果`,
    searching: "搜索中…",
  };

  $effect(() => {
    if (!open || searchApi) return;
    initSearch();
  });

  async function initSearch() {
    try {
      // Location-derived URL is computed at runtime so no bundler can resolve it.
      // Base-aware (sub-path deploys like GitHub Pages); BASE_URL ends with "/".
      const pagefindUrl = new URL("pagefind/pagefind.js", new URL(import.meta.env.BASE_URL, location.origin)).href;
      searchApi = await import(/* @vite-ignore */ pagefindUrl);
      await searchApi.init();
      await searchApi.options({ baseUrl: "/" });
      if (query) runSearch(query);
    } catch {
      // Index unavailable (e.g. built without pagefind) — leave the UI inert.
    }
  }

  let debounce: ReturnType<typeof setTimeout> | undefined;
  function oninput(e: Event) {
    query = (e.target as HTMLInputElement).value;
    clearTimeout(debounce);
    if (!query.trim()) {
      results = [];
      return;
    }
    debounce = setTimeout(() => runSearch(query), 200);
  }

  async function runSearch(q: string) {
    if (!searchApi) {
      (window as unknown as Record<string, unknown>).__rs = { stage: "no-api" };
      return;
    }
    searching = true;
    try {
      const res = await searchApi.search(q);
      (window as unknown as Record<string, unknown>).__rs = { stage: "searched", total: res.results.length };
      const data = (await Promise.all(res.results.slice(0, 10).map((r) => r.data())))
        .filter((d) => d && d.url);
      (window as unknown as Record<string, unknown>).__rs = { stage: "data", n: data.length, urls: data.map(d => d.url) };
      // Pagefind may return several entries sharing one URL (page + sub-results).
      const seen = new Set();
      results = data
        .filter((d) => (seen.has(d.url) ? false : (seen.add(d.url), true)))
        .map((d) => ({
          url: d.url,
          title: d.meta?.title ?? d.url,
          // Pagefind excerpts embed <mark> highlights; render plain text.
          excerpt: d.excerpt.replaceAll("<mark>", "").replaceAll("</mark>", ""),
        }));
    } finally {
      searching = false;
    }
  }
</script>

<div class="relative">
  <button
    type="button"
    class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
    style="border: 1px solid var(--border); color: var(--fg-soft); background: var(--bg-card)"
    aria-expanded={open}
    aria-controls="alnilam-search"
    onclick={() => {
      open = !open;
    }}
  >
    搜索
  </button>
  {#if open}
    <div
      id="alnilam-search"
      class="absolute right-0 z-30 mt-3 w-80 rounded-2xl p-4 sm:w-96"
      style="background: var(--bg-elev); border: 1px solid var(--border); box-shadow: 0 12px 40px rgba(0,0,0,.25)"
      role="dialog"
      aria-label="站内搜索"
      
    >
      <input
        type="search"
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        class="w-full rounded-xl px-3.5 py-2 text-sm"
        style="border: 1px solid var(--border); background: var(--bg-card); color: var(--fg)"
        bind:value={query}
        {oninput}
      />
      <div class="mt-3 max-h-96 overflow-y-auto" aria-live="polite">
        {#if searching}
          <p class="text-sm" style="color: var(--fg-muted)">{t.searching}</p>
        {:else if query && results.length === 0}
          <p class="text-sm" style="color: var(--fg-muted)">{t.zero(query)}</p>
        {:else if results.length > 0}
          <p class="mb-2 text-xs" style="color: var(--fg-muted)">{t.many(results.length)}</p>
          <ul class="space-y-2">
            {#each results as r, i (i)}
              <li>
                <a href={r.url} class="block rounded-xl p-2.5 transition-colors hover:bg-[var(--accent-soft)]">
                  <span class="block text-sm font-semibold" style="color: var(--fg)">{r.title}</span>
                  <span class="mt-1 block text-xs leading-relaxed" style="color: var(--fg-muted)">{r.excerpt}</span>
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/if}
</div>
