/**
 * Structured-data builders (schema.org JSON-LD).
 *
 * Only facts the Site actually owns are emitted: no fabricated authors,
 * ratings, publishers or `dateModified` values. Absolute canonical URLs and
 * localized `inLanguage` values come from the caller, which derives them from
 * the same route registry as the page canonical and hreflang links.
 */

const SCHEMA = "https://schema.org";

/** Open Graph locale identifiers use underscores ("en_US"), not BCP-47 hyphens. */
export function ogLocale(locale) {
  return locale.replace(/-/g, "_");
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

export function websiteJsonLd({ name, description, url, inLanguage }) {
  return compact({
    "@context": SCHEMA,
    "@type": "WebSite",
    name,
    description,
    url,
    inLanguage,
  });
}

export function blogPostingJsonLd({
  headline,
  description,
  url,
  image,
  datePublished,
  dateModified,
  inLanguage,
  keywords,
}) {
  return compact({
    "@context": SCHEMA,
    "@type": "BlogPosting",
    headline,
    description,
    keywords: Array.isArray(keywords) && keywords.length > 0 ? keywords : undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image,
    datePublished,
    // Only a real Site-provided update date becomes dateModified.
    dateModified,
    inLanguage,
  });
}

/** `items`: [{ name, url }] in document order, starting at the site root. */
export function breadcrumbListJsonLd(items) {
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function collectionPageJsonLd({ name, description, url, inLanguage, items }) {
  return compact({
    "@context": SCHEMA,
    "@type": "CollectionPage",
    name,
    description,
    url,
    inLanguage,
    mainEntity: Array.isArray(items) && items.length > 0
      ? {
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: item,
          })),
        }
      : undefined,
  });
}
