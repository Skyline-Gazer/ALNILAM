/**
 * Document-scoped Giscus installer.
 *
 * Official client.js registers an anonymous window "message" listener and has
 * no dispose API. Install that script once per document; later mounts reuse the
 * existing iframe via setConfig (theme/lang/term). Own listeners/observers are
 * cleaned up; third-party anonymous listeners are intentionally left alone.
 * See https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md
 */
export const GISCUS_ORIGIN = "https://giscus.app";
export const GISCUS_CLIENT = `${GISCUS_ORIGIN}/client.js`;

const INSTALL_KEY = "__alnilamGiscusInstall";

export type GiscusFailure =
  | "script"
  | "iframe-timeout"
  | "service"
  | "auth";

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: "specific" | "pathname" | "number";
  term?: string;
}

export interface GiscusMountOptions {
  container: HTMLElement;
  config: GiscusConfig;
  theme: string;
  lang: string;
  onReady?: () => void;
  onError?: (reason: GiscusFailure) => void;
}

interface DocumentInstall {
  script: HTMLScriptElement;
  container: HTMLElement | null;
  iframe: HTMLIFrameElement | null;
  theme: string;
  lang: string;
  config: GiscusConfig;
  messageListener: ((event: MessageEvent) => void) | null;
}

declare global {
  interface Window {
    [INSTALL_KEY]?: DocumentInstall;
  }
}

function readInstall(): DocumentInstall | null {
  return window[INSTALL_KEY];
}

function writeInstall(install: DocumentInstall | null): void {
  if (install) window[INSTALL_KEY] = install;
  else delete window[INSTALL_KEY];
}

function classifyServiceError(message: string): GiscusFailure | null {
  const text = message.toLowerCase();
  if (
    text.includes("bad credentials") ||
    text.includes("invalid state value") ||
    text.includes("state has expired")
  ) {
    return "auth";
  }
  if (text.includes("api rate limit exceeded") || text.includes("discussion not found")) {
    return "service";
  }
  return null;
}

function postSetConfig(
  iframe: HTMLIFrameElement | null,
  config: Record<string, string | number | boolean | undefined>,
): void {
  const frame = iframe?.contentWindow;
  if (!frame) return;
  const setConfig: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) setConfig[key] = value;
  }
  if (Object.keys(setConfig).length === 0) return;
  frame.postMessage({ giscus: { setConfig } }, GISCUS_ORIGIN);
}

function applyDataset(script: HTMLScriptElement, options: GiscusMountOptions): void {
  const { config, theme, lang } = options;
  script.dataset.repo = config.repo;
  script.dataset.repoId = config.repoId;
  script.dataset.category = config.category;
  script.dataset.categoryId = config.categoryId;
  script.dataset.mapping = config.mapping;
  if (config.term) script.dataset.term = config.term;
  else delete script.dataset.term;
  script.dataset.strict = "0";
  script.dataset.reactionsEnabled = "1";
  script.dataset.emitMetadata = "0";
  script.dataset.inputPosition = "top";
  script.dataset.theme = theme;
  script.dataset.lang = lang;
}

export class GiscusProvider {
  private readonly options: GiscusMountOptions;
  private mountNode: HTMLDivElement | null = null;
  private observer: MutationObserver | null = null;
  private timeout: number | null = null;
  private ownMessageListener: ((event: MessageEvent) => void) | null = null;
  private mounted = false;
  private ready = false;
  private failed = false;
  private disposed = false;
  private usedExistingInstall = false;

  constructor(options: GiscusMountOptions) {
    this.options = options;
  }

  mount(): void {
    if (this.disposed || this.mounted) return;
    this.mounted = true;

    const existing = readInstall();
    if (existing?.script.isConnected) {
      const liveIframe =
        existing.iframe && existing.iframe.isConnected
          ? existing.iframe
          : existing.container?.querySelector<HTMLIFrameElement>("iframe.giscus-frame") ?? null;
      if (liveIframe?.isConnected) {
        this.reuseInstall(existing, liveIframe);
        return;
      }
      // Script already ran in this document; remounting client.js is unsafe.
      this.reloadDocument();
      return;
    }

    if (existing && !existing.script.isConnected) {
      writeInstall(null);
    }

    const node = document.createElement("div");
    node.className = "giscus";
    node.dataset.commentsProvider = "giscus";
    this.options.container.appendChild(node);
    this.mountNode = node;

    const script = document.createElement("script");
    script.src = GISCUS_CLIENT;
    script.crossOrigin = "anonymous";
    script.async = true;
    applyDataset(script, this.options);
    script.addEventListener("error", () => this.fail("script"), { once: true });

    const install: DocumentInstall = {
      script,
      container: node,
      iframe: null,
      theme: this.options.theme,
      lang: this.options.lang,
      config: this.options.config,
      messageListener: null,
    };
    writeInstall(install);

    this.ownMessageListener = (event: MessageEvent) => {
      if (this.disposed || this.failed || event.origin !== GISCUS_ORIGIN) return;
      const payload = event.data?.giscus;
      if (!payload || typeof payload !== "object") return;
      if (typeof payload.error === "string") {
        const reason = classifyServiceError(payload.error);
        if (reason) this.fail(reason);
      }
    };
    window.addEventListener("message", this.ownMessageListener);
    install.messageListener = this.ownMessageListener;

    this.observer = new MutationObserver(() => this.detectIframe());
    this.observer.observe(node, { childList: true, subtree: true });
    this.timeout = window.setTimeout(() => {
      this.detectIframe();
      if (!this.ready) this.fail("iframe-timeout");
    }, 15_000);

    node.appendChild(script);
  }

  updateTheme(theme: string): void {
    this.options.theme = theme;
    const install = readInstall();
    if (install) install.theme = theme;
    if (install?.script && !this.ready && !install.iframe) install.script.dataset.theme = theme;
    postSetConfig(install?.iframe ?? this.findIframe(), { theme });
  }

  updateLang(lang: string): void {
    this.options.lang = lang;
    const install = readInstall();
    if (install) install.lang = lang;
    if (install?.script && !this.ready && !install.iframe) install.script.dataset.lang = lang;
    postSetConfig(install?.iframe ?? this.findIframe(), { lang });
  }

  updateIdentity(config: GiscusConfig): void {
    this.options.config = config;
    const install = readInstall();
    if (install) install.config = config;
    if (install?.script && !install.iframe) applyDataset(install.script, this.options);
    postSetConfig(install?.iframe ?? this.findIframe(), {
      repo: config.repo,
      repoId: config.repoId,
      category: config.category,
      categoryId: config.categoryId,
      term: config.term,
      number: config.mapping === "number" && config.term ? Number(config.term) : undefined,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timeout ?? undefined);
    this.timeout = null;
    this.observer?.disconnect();
    this.observer = null;
    if (this.ownMessageListener) {
      window.removeEventListener("message", this.ownMessageListener);
      this.ownMessageListener = null;
    }
    if (!this.usedExistingInstall && !this.ready && this.mountNode) {
      const install = readInstall();
      if (install?.container === this.mountNode) writeInstall(null);
      this.mountNode.remove();
    }
    this.mountNode = null;
  }

  private reuseInstall(install: DocumentInstall, iframe: HTMLIFrameElement): void {
    this.usedExistingInstall = true;
    this.ready = true;
    install.iframe = iframe;
    install.config = this.options.config;
    install.theme = this.options.theme;
    install.lang = this.options.lang;

    const host = iframe.closest(".giscus") as HTMLElement | null;
    if (host && host !== this.options.container) {
      this.options.container.appendChild(host);
      install.container = host;
      this.mountNode = host as HTMLDivElement;
    } else {
      this.options.container.appendChild(iframe);
      install.container = this.options.container;
    }

    postSetConfig(iframe, {
      theme: this.options.theme,
      lang: this.options.lang,
      repo: this.options.config.repo,
      repoId: this.options.config.repoId,
      category: this.options.config.category,
      categoryId: this.options.config.categoryId,
      term: this.options.config.term,
      number:
        this.options.config.mapping === "number" && this.options.config.term
          ? Number(this.options.config.term)
          : undefined,
    });
    this.options.onReady?.();
  }

  private reloadDocument(): void {
    this.failed = true;
    try {
      window.location.reload();
    } catch {
      this.options.onError?.("script");
    }
  }

  private findIframe(): HTMLIFrameElement | null {
    const install = readInstall();
    if (install?.iframe?.isConnected) return install.iframe;
    return (
      this.mountNode?.querySelector<HTMLIFrameElement>("iframe.giscus-frame") ??
      document.querySelector<HTMLIFrameElement>("iframe.giscus-frame")
    );
  }

  private detectIframe(): void {
    if (this.disposed || this.failed || this.ready || !this.mountNode) return;
    const iframe = this.mountNode.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (!iframe) return;
    const install = readInstall();
    if (install) {
      install.iframe = iframe;
      install.container = this.mountNode;
    }
    clearTimeout(this.timeout ?? undefined);
    this.timeout = null;
    this.observer?.disconnect();
    this.observer = null;
    this.ready = true;
    this.options.onReady?.();
  }

  private fail(reason: GiscusFailure): void {
    if (this.disposed || this.ready || this.failed) return;
    this.failed = true;
    clearTimeout(this.timeout ?? undefined);
    this.timeout = null;
    this.observer?.disconnect();
    this.observer = null;
    if (this.ownMessageListener) {
      window.removeEventListener("message", this.ownMessageListener);
      this.ownMessageListener = null;
    }
    const install = readInstall();
    if (install?.container === this.mountNode) writeInstall(null);
    this.mountNode?.remove();
    this.mountNode = null;
    this.options.onError?.(reason);
  }
}
