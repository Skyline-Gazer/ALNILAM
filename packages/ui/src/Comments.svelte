<script lang="ts">
  import { onDestroy } from "svelte";
  import { GiscusProvider, type CommentProvider } from "./comments/giscus";

  // Giscus comments island. The external script is created only after the
  // reader opens the click gate (default) or the section approaches the
  // viewport (`load: visible`). The provider owns one script/iframe and every
  // listener/observer is removed on retry or component teardown.
  interface CommentsLabels {
    commentsRegion: string;
    commentsDisclosure: string;
    commentsLoadNote: string;
    commentsVisibleNote: string;
    commentsLoad: string;
    commentsLoading: string;
    commentsUnavailable: string;
    commentsRetry: string;
    commentsDiscussion: string;
    commentsRequiresJs: string;
  }
  interface Props {
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
    mapping: "specific" | "pathname" | "number";
    term?: string;
    theme: "dark" | "light";
    lang: string;
    load?: "click" | "visible";
    labels: CommentsLabels;
  }
  const {
    repo,
    repoId,
    category,
    categoryId,
    mapping,
    term,
    theme,
    lang,
    load = "click",
    labels,
  }: Props = $props();

  const THEME_LIGHT = "light";
  const THEME_DARK = "dark_dimmed";
  type Status = "idle" | "loading" | "ready" | "error";
  let status = $state<Status>("idle");
  let provider = $state<CommentProvider | null>(null);
  let host = $state<HTMLDivElement | undefined>();
  let observer: IntersectionObserver | undefined;

  const discussionUrl = $derived(repo ? `https://github.com/${repo}/discussions` : undefined);
  function currentTheme(): string {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? THEME_DARK : THEME_LIGHT;
    }
    return theme === "dark" ? THEME_DARK : THEME_LIGHT;
  }

  function start(): void {
    if (!host || provider) return;
    status = "loading";
    const instance = new GiscusProvider({
      container: host,
      config: {
        repo,
        repoId,
        category,
        categoryId,
        mapping,
        term,
        themeLight: THEME_LIGHT,
        themeDark: THEME_DARK,
      },
      theme: currentTheme(),
      lang,
      onReady: () => {
        status = "ready";
      },
      onError: () => {
        status = "error";
      },
    });
    provider = instance;
    try {
      instance.mount();
    } catch {
      instance.dispose();
      provider = null;
      status = "error";
    }
  }

  function retry(): void {
    provider?.dispose();
    provider = null;
    status = "idle";
    start();
  }

  $effect(() => {
    if (load !== "visible" || provider || !host) return;
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer?.disconnect();
          observer = undefined;
          start();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(host);
    return () => {
      observer?.disconnect();
      observer = undefined;
    };
  });

  $effect(() => {
    const syncTheme = () => provider?.updateTheme(currentTheme());
    window.addEventListener("giscus-theme-change", syncTheme);
    window.addEventListener("shirone:theme-change", syncTheme);
    return () => {
      window.removeEventListener("giscus-theme-change", syncTheme);
      window.removeEventListener("shirone:theme-change", syncTheme);
    };
  });

  $effect(() => {
    provider?.updateLang(lang);
  });

  onDestroy(() => {
    observer?.disconnect();
    provider?.dispose();
    provider = null;
  });
</script>

<div
  class="comments-provider"
  data-comments-state={status}
  data-comments-load={load}
  data-comment-term={term}
  role="group"
  aria-label={labels.commentsRegion}
>
  <p class="comments-disclosure">
    {labels.commentsDisclosure}
    <a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus.app</a>
    {#if discussionUrl}
      · <a class="comments-discussion" href={discussionUrl} target="_blank" rel="noopener noreferrer">
        {labels.commentsDiscussion}
      </a>
    {/if}
  </p>
  <p class="comments-disclosure">
    {load === "click" ? labels.commentsLoadNote : labels.commentsVisibleNote}
  </p>

  {#if load === "click" && status === "idle"}
    <button class="comments-action" type="button" onclick={start}>{labels.commentsLoad}</button>
  {/if}

  {#if status === "loading"}
    <p class="comments-status" role="status">{labels.commentsLoading}</p>
  {/if}

  {#if status === "error"}
    <div class="comments-error" role="alert">
      <p>{labels.commentsUnavailable}</p>
      <div class="comments-error__actions">
        <button class="comments-action" type="button" onclick={retry}>{labels.commentsRetry}</button>
        {#if discussionUrl}
          <a class="comments-discussion" href={discussionUrl} target="_blank" rel="noopener noreferrer">
            {labels.commentsDiscussion}
          </a>
        {/if}
      </div>
    </div>
  {/if}

  <div
    bind:this={host}
    class="comments-provider__host"
    hidden={load === "click" && status === "idle"}
    aria-busy={status === "loading"}
  ></div>

  <noscript>
    <p class="comments-status">{labels.commentsRequiresJs}</p>
  </noscript>
</div>

<style>
  .comments-provider {
    min-height: 340px;
    color: var(--on-surface);
  }
  .comments-disclosure {
    margin: 0 0 0.75rem;
    color: var(--on-surface-variant);
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .comments-disclosure a,
  .comments-discussion {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .comments-action {
    min-height: 44px;
    padding: 0 1.25rem;
    border: 0;
    border-radius: var(--shape-corner-s, 0.75rem);
    background: var(--primary);
    color: var(--on-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .comments-action:focus-visible,
  .comments-discussion:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
  .comments-status {
    color: var(--on-surface-variant);
    font-size: 0.875rem;
  }
  .comments-error {
    padding: 0.875rem 1rem;
    border: 1px solid var(--outline-variant);
    border-radius: var(--shape-corner-m, 0.75rem);
    background: var(--surface-container);
    color: var(--on-surface);
  }
  .comments-error p {
    margin: 0 0 0.75rem;
  }
  .comments-error__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }
  .comments-provider__host {
    min-height: 240px;
  }
  .comments-provider__host :global(iframe.giscus-frame) {
    width: 100%;
    border: 0;
    color-scheme: light dark;
  }
</style>
