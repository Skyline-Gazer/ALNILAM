import { localeRoutePath } from "./i18n.mjs";

/** @typedef {import("astro:content").CollectionEntry<"pages">} SitePageEntry */

function validSlug(slug) {
  return slug.length > 0 && slug.split("/").every((part) => part && part !== "." && part !== "..");
}

/**
 * Build canonical static routes for published Site-owned pages.
 * Locale directories are stripped only when they match the page's declared locale.
 * @param {readonly SitePageEntry[]} entries
 * @param {{ defaultLocale: string, locales: readonly string[] }} options
 */
export function buildSitePageRoutes(entries, { defaultLocale, locales }) {
  const enabledLocales = new Set(locales);
  if (!enabledLocales.has(defaultLocale)) {
    throw new Error(`ALNILAM: default page locale "${defaultLocale}" is not enabled`);
  }

  const routes = [];
  const routeKeys = new Set();
  const translationKeys = new Set();

  for (const entry of entries) {
    if (entry.data.draft) continue;

    const locale = entry.data.lang || defaultLocale;
    if (!enabledLocales.has(locale)) {
      throw new Error(`ALNILAM: page "${entry.id}" declares disabled locale "${locale}"`);
    }

    const segments = entry.id.split("/");
    const directoryLocale = segments.length > 1 && enabledLocales.has(segments[0])
      ? segments[0]
      : null;
    if (directoryLocale && directoryLocale !== locale) {
      throw new Error(
        `ALNILAM: page "${entry.id}" is under locale directory "${directoryLocale}" but declares "${locale}"`,
      );
    }

    const slug = directoryLocale ? segments.slice(1).join("/") : entry.id;
    if (!validSlug(slug)) {
      throw new Error(`ALNILAM: page "${entry.id}" has an invalid content/pages path`);
    }

    const routeKey = `${locale}\0${slug}`;
    if (routeKeys.has(routeKey)) {
      throw new Error(`ALNILAM: duplicate page route for locale "${locale}": "${slug}"`);
    }
    routeKeys.add(routeKey);

    const translationKey = entry.data.translationKey;
    if (translationKey) {
      const translationIdentity = `${locale}\0${translationKey}`;
      if (translationKeys.has(translationIdentity)) {
        throw new Error(
          `ALNILAM: duplicate page translationKey "${translationKey}" for locale "${locale}"`,
        );
      }
      translationKeys.add(translationIdentity);
    }

    routes.push({
      entry,
      locale,
      slug,
      path: localeRoutePath(locale, defaultLocale, `pages/${slug}`),
      translationKey,
    });
  }

  const translationGroups = new Map();
  for (const route of routes) {
    if (!route.translationKey) continue;
    const group = translationGroups.get(route.translationKey) ?? [];
    group.push(route);
    translationGroups.set(route.translationKey, group);
  }

  return routes.map((route) => {
    const group = route.translationKey ? translationGroups.get(route.translationKey) : null;
    if (!group || group.length < 2) return { ...route, alternates: null };

    const ordered = [...group].sort((left, right) => {
      if (left.locale === defaultLocale) return -1;
      if (right.locale === defaultLocale) return 1;
      return left.locale.localeCompare(right.locale);
    });
    const alternates = ordered.map(({ locale, path }) => ({ lang: locale, path }));
    const fallback = ordered.find(({ locale }) => locale === defaultLocale);
    if (fallback) alternates.push({ lang: "x-default", path: fallback.path });
    return { ...route, alternates };
  });
}
