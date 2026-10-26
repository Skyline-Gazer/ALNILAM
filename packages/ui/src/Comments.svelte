<script lang="ts">
  // Giscus comments island. Loads the giscus script ONLY when the Site config
  // enables comments; no network calls when disabled (zero-JS guarantee holds
  // because the island itself is only rendered when enabled).
  interface GiscusConfig {
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
    mapping: "pathname" | "specific" | "number";
  }
  const { repo, repoId, category, categoryId, mapping, theme, lang } = $props() as {
    repo: string; repoId: string; category: string; categoryId: string;
    mapping: GiscusConfig["mapping"]; theme: string; lang: string;
  };

  let container: HTMLDivElement | undefined = $state();
  let loaded = false;

  const selectedTheme = () =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark_dimmed";

  $effect(() => {
    if (!container || loaded) return;
    loaded = true;
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.crossOrigin = "anonymous";
    s.async = true;
    s.setAttribute("data-repo", repo);
    s.setAttribute("data-repo-id", repoId);
    s.setAttribute("data-category", category);
    s.setAttribute("data-category-id", categoryId);
    s.setAttribute("data-mapping", mapping);
    s.setAttribute("data-strict", "0");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "top");
    s.setAttribute("data-theme", selectedTheme());
    s.setAttribute("data-lang", lang.startsWith("zh") ? "zh-CN" : lang.startsWith("ja") ? "ja" : "en");
    container.appendChild(s);
  });

  $effect(() => {
    const updateTheme = (event: Event) => {
      const iframe = container?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      iframe?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: selectedTheme() } } },
        "https://giscus.app",
      );
    };
    window.addEventListener("giscus-theme-change", updateTheme);
    return () => window.removeEventListener("giscus-theme-change", updateTheme);
  });
</script>

<div bind:this={container} class="giscus mt-10"></div>
