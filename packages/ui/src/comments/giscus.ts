/**
 * One-provider comment adapter.
 *
 * The interface intentionally stays small: mount once, forward theme/language
 * changes, dispose everything. Giscus remains the only production provider;
 * Twikoo/Waline are separate post-launch evaluations with their own backends.
 */
export const GISCUS_ORIGIN = "https://giscus.app";

export interface CommentProvider {
  mount(): void;
  updateTheme(theme: string): void;
  updateLang(lang: string): void;
  dispose(): void;
}

export interface GiscusProviderConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: "specific" | "pathname" | "number";
  term?: string;
  themeLight: string;
  themeDark: string;
}

export interface GiscusProviderOptions {
  container: HTMLElement;
  config: GiscusProviderConfig;
  theme: string;
  lang: string;
  onReady?: () => void;
  onError?: (reason: "script" | "timeout") => void;
}

export class GiscusProvider implements CommentProvider {
  private readonly container: HTMLElement;
  private readonly config: GiscusProviderConfig;
  private readonly onReady?: () => void;
  private readonly onError?: (reason: "script" | "timeout") => void;
  private theme: string;
  private lang: string;
  private mountNode: HTMLDivElement | null = null;
  private script: HTMLScriptElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private observer: MutationObserver | null = null;
  private timeout: number | undefined;
  private mounted = false;
  private ready = false;
  private failed = false;
  private disposed = false;

  constructor(options: GiscusProviderOptions) {
    this.container = options.container;
    this.config = options.config;
    this.theme = options.theme;
    this.lang = options.lang;
    this.onReady = options.onReady;
    this.onError = options.onError;
  }

  mount(): void {
    if (this.disposed || this.mounted) return;
    this.mounted = true;
    const node = document.createElement("div");
    node.className = "giscus";
    node.dataset.commentsProvider = "giscus";
    this.container.appendChild(node);
    this.mountNode = node;

    const script = document.createElement("script");
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.dataset.repo = this.config.repo;
    script.dataset.repoId = this.config.repoId;
    script.dataset.category = this.config.category;
    script.dataset.categoryId = this.config.categoryId;
    script.dataset.mapping = this.config.mapping;
    if (this.config.term) script.dataset.term = this.config.term;
    script.dataset.strict = "0";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "0";
    script.dataset.inputPosition = "top";
    script.dataset.theme = this.theme;
    script.dataset.lang = this.lang;
    script.addEventListener("error", () => this.fail("script"), { once: true });
    this.script = script;
    this.observer = new MutationObserver(() => this.detectIframe());
    this.observer.observe(node, { childList: true, subtree: true });
    this.timeout = window.setTimeout(() => {
      this.detectIframe();
      if (!this.ready) this.fail("timeout");
    }, 15_000);
    node.appendChild(script);
  }

  updateTheme(theme: string): void {
    this.theme = theme;
    if (this.script && !this.ready) this.script.dataset.theme = theme;
    this.postConfig({ theme });
  }

  updateLang(lang: string): void {
    this.lang = lang;
    if (this.script && !this.ready) this.script.dataset.lang = lang;
    this.postConfig({ lang });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timeout);
    this.timeout = undefined;
    this.observer?.disconnect();
    this.observer = null;
    this.iframe = null;
    this.script = null;
    this.mountNode?.remove();
    this.mountNode = null;
  }

  private detectIframe(): void {
    if (this.disposed || this.failed || this.iframe || !this.mountNode) return;
    const iframe = this.mountNode.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (!iframe) return;
    this.iframe = iframe;
    clearTimeout(this.timeout);
    this.timeout = undefined;
    this.observer?.disconnect();
    this.observer = null;
    this.ready = true;
    this.onReady?.();
  }

  private postConfig(config: { theme?: string; lang?: string }): void {
    const frame = this.iframe?.contentWindow;
    if (!frame) return;
    frame.postMessage({ giscus: { setConfig: config } }, GISCUS_ORIGIN);
  }

  private fail(reason: "script" | "timeout"): void {
    if (this.disposed || this.ready || this.failed) return;
    this.failed = true;
    clearTimeout(this.timeout);
    this.timeout = undefined;
    this.observer?.disconnect();
    this.observer = null;
    this.iframe = null;
    this.script = null;
    this.mountNode?.remove();
    this.mountNode = null;
    this.onError?.(reason);
  }
}
