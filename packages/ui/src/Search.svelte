<script lang="ts">
  import { onMount } from "svelte";

  // Pagefind loads its index lazily from /pagefind/ at interaction time —
  // nothing is serialized into the page bundle.
  let open = $state(false);
  let container: HTMLDivElement | undefined = $state();

  onMount(async () => {
    if (!open || !container) return;
    // Pagefind's runtime is generated at build time into /pagefind/ — it is a
    // URL, not a bundler module, so load it via dynamic script + window global.
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/pagefind/pagefind.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Pagefind index not available"));
      document.head.appendChild(s);
    });
    // @ts-expect-error window global injected by /pagefind/pagefind.js
    const pagefind = window.pagefind;
    await pagefind.options({ baseUrl: "/" });
    // @pagefind/default-ui mounts itself into the container
    // @ts-expect-error default-ui ships its own runtime entry
    const ui = await import("@pagefind/default-ui");
    ui.PagefindUI({
      element: container,
      showSubResults: true,
      translations: {
        placeholders: ["搜索文章…"],
        clear_search: "清除",
        load_more: "加载更多结果",
        search_label: "本站搜索",
        zero_results: "未找到“[SEARCH_TERM]”相关内容",
        many_results: "[COUNT] 个结果",
        one_result: "[COUNT] 个结果",
        searching: "搜索中…",
      },
    });
  });
</script>

<div>
  <button
    type="button"
    class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
    style="border: 1px solid var(--border); color: var(--fg-soft); background: var(--bg-card)"
    aria-expanded={open}
    aria-controls="alnilam-search"
    onclick={() => (open = !open)}
  >
    搜索
  </button>
  {#if open}
    <div id="alnilam-search" bind:this={container} class="mt-4"></div>
  {/if}
</div>
