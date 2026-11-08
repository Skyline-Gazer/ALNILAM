/** Stable comment identity + CSP. Mapping/term rules: docs/SITE_ONBOARDING.md §Comments. */
import { postLang } from "./i18n.mjs";

export const GISCUS_ORIGIN = "https://giscus.app";

// giscus UI locales from https://giscus.app (client.js `data-lang`).
const GISCUS_LANGS = new Set([
  "ar", "be", "bg", "ca", "cs", "da", "de", "el", "en", "eo", "es", "eu",
  "fa", "fr", "he", "hbs", "hu", "id", "it", "ja", "kh", "ko", "nl", "pl",
  "pt", "ro", "ru", "sr-hr", "th", "tr", "uk", "uz", "vi", "zh-CN", "zh-TW",
  "zh-HK",
]);
const GISCUS_LANG_ALIASES = {
  "zh": "zh-CN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
  "zh-hk": "zh-HK",
  "pt-br": "pt",
  "sr-hr": "sr-hr",
};
const CONTENT_EXTENSION = /\.(?:md|mdx)$/i;

/**
 * Map a page/Site locale to a giscus UI locale. Unknown languages fall back to
 * English instead of asking giscus for a code it cannot render.
 */
export function giscusLang(locale) {
  const raw = String(locale || "en").trim();
  const aliased = GISCUS_LANG_ALIASES[raw.toLowerCase()] ?? raw;
  if (GISCUS_LANGS.has(aliased)) return aliased;
  const primary = aliased.split(/[-_]/)[0];
  return GISCUS_LANGS.has(primary) ? primary : "en";
}

/** Resolve `comments.lang: auto` against the current page locale. */
export function commentLang(config, pageLocale) {
  const requested = config.comments.lang === "auto" ? pageLocale : config.comments.lang;
  return giscusLang(requested || pageLocale);
}

function contentId(post) {
  return String(post.id)
    .replace(/^\/+/, "")
    .replace(CONTENT_EXTENSION, "");
}

/** Resolve Giscus mapping/term for one post; null when comments are disabled. */
export function resolveCommentIdentity(post, config) {
  const comments = config.comments;
  if (!comments.enabled) return null;
  const lang = postLang(post, config.site.locale);
  if (comments.mapping === "pathname") {
    return { mapping: "pathname", term: null, lang, source: "pathname", sharedAcrossLocales: false };
  }
  const explicit = typeof post.data?.commentId === "string" ? post.data.commentId.trim() : "";
  const translationKey = typeof post.data?.translationKey === "string" ? post.data.translationKey.trim() : "";
  let base;
  let source;
  if (explicit) {
    base = explicit;
    source = "commentId";
  } else if (translationKey) {
    base = `alnilam:translation:${translationKey}`;
    source = "translationKey";
  } else {
    base = `alnilam:content:${contentId(post)}`;
    source = "contentId";
  }
  const term = comments.sharing === "locale" ? `${base}::${lang}` : base;
  if (term.length > 512) {
    throw new Error(
      `ALNILAM: comments term for post "${post.id}" is longer than 512 characters; ` +
        "shorten frontmatter commentId or translationKey",
    );
  }
  if (comments.mapping === "number" && !/^\d+$/.test(term)) {
    throw new Error(
      `ALNILAM: comments.mapping "number" requires a numeric frontmatter commentId ` +
        `and comments.sharing "translation" for post "${post.id}" (computed term ${JSON.stringify(term)})`,
    );
  }
  return {
    mapping: comments.mapping,
    term,
    lang,
    source,
    sharedAcrossLocales: comments.sharing === "translation",
  };
}

/** Article CSP when comments.csp is on. wasm-unsafe-eval is required by Pagefind. */
export function commentsCsp(config) {
  if (!config.comments.enabled || !config.comments.csp) return null;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${GISCUS_ORIGIN} 'wasm-unsafe-eval'`,
    `style-src 'self' 'unsafe-inline' ${GISCUS_ORIGIN}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    `connect-src 'self' ${GISCUS_ORIGIN} https://api.github.com`,
    `frame-src ${GISCUS_ORIGIN} https://www.youtube-nocookie.com https://player.bilibili.com https://www.acfun.cn`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://github.com",
  ].join("; ");
}
