const LABEL = "ALNILAM: content/moments image";

function fail(message) {
  throw new Error(`${LABEL} ${message}`);
}

function safePathname(pathname) {
  if (!pathname) fail("must not be empty");
  const segments = pathname.replace(/^\//, "").split("/");
  for (const segment of segments) {
    if (!segment) fail("contains an empty path segment");
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      fail("contains invalid percent encoding");
    }
    if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
      fail("contains an encoded path traversal segment");
    }
  }
}

/** Normalize a Site asset reference without fetching or rewriting URL suffixes. */
export function normalizeMomentImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) fail("URL must be a non-empty string");
  const raw = value.trim();
  if (/[\u0000-\u001f\\]/.test(raw)) fail("contains a control character or backslash");

  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      fail("must be a valid HTTPS URL or Site path");
    }
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      fail("external images must use HTTPS without embedded credentials");
    }
    return raw;
  }
  if (raw.startsWith("//")) fail("must use HTTPS, not a protocol-relative URL");

  const suffixAt = raw.search(/[?#]/);
  const pathname = suffixAt < 0 ? raw : raw.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? "" : raw.slice(suffixAt);
  if (pathname.startsWith("/")) {
    safePathname(pathname);
    return `${pathname}${suffix}`;
  }

  const relative = pathname.replace(/^(?:\.\/)+/, "");
  safePathname(relative);
  const assetPath = relative.startsWith("assets/")
    ? relative.slice("assets/".length)
    : relative.startsWith("site-assets/")
      ? relative.slice("site-assets/".length)
      : relative;
  safePathname(assetPath);
  return `/site-assets/${assetPath}${suffix}`;
}

/** Locales that need a prefixed Moments route; default locale follows Site routing policy. */
export function momentsRouteLocales(config) {
  return config.routing.prefixDefaultLocale
    ? [...config.locales]
    : config.locales.filter((locale) => locale !== config.site.locale);
}

export function momentsPath(locale, config) {
  if (config.routing.prefixDefaultLocale || locale !== config.site.locale) {
    return `/${locale}/moments/`;
  }
  return "/moments/";
}
