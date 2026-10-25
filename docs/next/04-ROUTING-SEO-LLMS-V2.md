# ALNILAM Next — i18n / Taxonomy / SEO / LLMs v2 contract

> **PROPOSED NORMATIVE CONTRACT · review required**. 2026-10-25. Subordinate to [01-SPEC.md](01-SPEC.md) and [00-PLAN.md](00-PLAN.md). All behavior in this document is a target, NOT a claim of current implementation. Scope: Astro 7 SSG; Shirone frontend; standalone Site; GitHub Pages subpath and domain-root hosting. Source references: Astro i18n docs, Pagefind multilingual docs, Google Search Central localized versions, https://llmstxt.org/ (v2, 2026-08-10), and KIRARI archived P6/#101 LLMs v2 implementation.

## A. Single URL and locale contract (ROUTE-01–ROUTE-07)

**ROUTE-01 · Locale strategy.** Default language is the Site-configured locale, example `zh-CN`, with `prefixDefaultLocale: false`. Every other enabled locale has exactly one URL prefix, example `en`, `ja`. Keep locale code stable and BCP-47-valid; translate UI labels, not locale IDs. Enable only languages explicitly configured by Site. No automatic `Accept-Language` rewriting of already published canonical URLs; optional homepage language suggestion must not prevent crawling.

**ROUTE-02 · Canonical routes.** Apply trailing slash to HTML pages, no trailing slash to files:
| Content | zh-CN default | en | ja |
| --- | --- | --- | --- |
| Homepage | `/` | `/en/` | `/ja/` |
| Posts index | `/posts/` | `/en/posts/` | `/ja/posts/` |
| Article | `/posts/hello/` | `/en/posts/hello/` | `/ja/posts/hello/` |
| Posts page 2 | `/posts/2/` | `/en/posts/2/` | `/ja/posts/2/` |
| Categories index | `/categories/` | `/en/categories/` | `/ja/categories/` |
| Category | `/categories/tech/` | `/en/categories/tech/` | `/ja/categories/tech/` |
| Category page 2 | `/categories/tech/2/` | `/en/categories/tech/2/` | `/ja/categories/tech/2/` |
| Tags index | `/tags/` | `/en/tags/` | `/ja/tags/` |
| Tag | `/tags/astro/` | `/en/tags/astro/` | `/ja/tags/astro/` |
| Tag page 2 | `/tags/astro/2/` | `/en/tags/astro/2/` | `/ja/tags/astro/2/` |
| Archives | `/archives/` | `/en/archives/` | `/ja/archives/` |
| Search | `/search/` | `/en/search/` | `/ja/search/` |
| RSS | `/rss.xml` | `/en/rss.xml` | `/ja/rss.xml` |
| LLMs v2 index | `/llms.txt` | `/en/llms.txt` | `/ja/llms.txt` |
| Article LLM view | `/posts/hello/index.md` | `/en/posts/hello/index.md` | `/ja/posts/hello/index.md` |

Do not generate optional locale pages whose content does not exist merely to satisfy a symmetric URL table.

**ROUTE-03 · Single route builder.** Site has one validated absolute `site.url` and explicit normalized `basePath` (root `/`, Pages `/ALNILAM/`). Resolve `absoluteUrl(routeId, locale, params)` and `internalHref(...)` from one shared route registry. A subpath must appear **exactly once**. Never `new URL('/posts/...', site.url)` when `site.url` includes a base path, because a leading slash discards that path. Prevent traversal, double encoding, locale duplication, unsupported language, URL-parameter collisions and invalid/duplicate slug. External HTTP(S), anchors, mailto and tel are outside route rewriting.

**ROUTE-04 · Stable content identity.** Each article has a stable `translationKey` (not a translated title) linking only genuine translated articles. Its `slug` may differ by locale and MUST be mapped explicitly to the right canonical route. Untranslated articles do not become fictional translations through template/UI fallback. All published locale URLs require actual locale-specific article content. Same rule applies to translated static pages.

**ROUTE-05 · Real alternate availability.** A language switch from an article or category should navigate to the same entity in the selected locale only when it exists. Otherwise fall back to the destination locale's relevant listing/homepage with clearly defined UI, not an invisible wrong-language duplicate. `hreflang` lists only actual equivalent URLs. Default home may be `x-default` if deliberately serving unmatched languages; do not fabricate `x-default` for pages missing a fallback.

**ROUTE-06 · Existing links and migration.** ALNILAM v0.1.x contains older locale article URLs (`/posts/en/<slug>/`). Preserve compatibility with aliases that are never canonicals or sitemap entries. Where hosting supports redirects use 301/308. Static GitHub Pages has no universal native redirect status configuration; a generated HTML fallback with canonical + user-facing navigation is only a compatibility substitute, NOT a claimed HTTP 301. Keep current URLs by default when migration cannot guarantee a viable user and SEO policy. Changing slug/permalink is a versioned Site migration with explicit owner review.

**ROUTE-07 · Localized site base.** All examples above are logical paths. At the existing Pages project site the route is `https://skyline-gazer.github.io/ALNILAM/en/categories/tech/`, and `https://skyline-gazer.github.io/ALNILAM/en/posts/hello/index.md`. Do not publish Pages project files at `https://skyline-gazer.github.io/en/...`.

## B. Category & tag model (TAX-01–TAX-06)

**TAX-01 · Stable machine identifiers.** Category and tag are independent taxonomies. They have stable ASCII `id` / URL `slug` (e.g. `tech`, `astro`), separate from localized display names. For the initial contract, the slug is the same across languages; optional localized slugs are a future versioned extension because they complicate re-links and maintenance.

Example Site-owned structured metadata, with schema validation:

```yaml
categories:
  - id: tech
    slug: tech
    label:
      zh-CN: 技术
      en: Technology
      ja: 技術
tags:
  - id: astro
    slug: astro
    label:
      zh-CN: Astro
      en: Astro
      ja: Astro
```

**TAX-02 · Article ownership.** Frontmatter uses `category: tech` (optional zero or one primary category for initial contract) and `tags: [astro]` (zero or more). Unknown category IDs fail validation; optionally auto-register unknown tag IDs only when configured to do so with an explicit default label/slug policy. Duplicate case-folded ID/slug is a build error. Category nesting, category aliases and translated Slugs are explicitly out of the initial release until approved.

**TAX-03 · Taxonomy lists per locale.** `/en/categories/tech/` lists only published **English** articles in that category, not Chinese posts displayed in an English chrome. `/en/tags/astro/` follows the same rule. Count, filters, pagination and sorting are locale-scoped. Draft/unlisted/nonindexable content is not leaked through counts or links. Do not emit empty localized taxonomy detail pages solely to create hreflang. Tag label fallback when not translated is deterministic and documented, not silent creation of a new category.

**TAX-04 · Taxonomy i18n equivalence.** Pages for the same taxonomy ID in distinct locales are alternates **only if each localized page is publicly rendered with meaningful data**; each is self-canonical and mutual hreflang links are emitted. Category and tag index language routes similarly represent actual locale content.

**TAX-05 · Taxonomy SEO.** Each category/tag page has localized title/description, unique self-canonical URL, accessible heading and optional collection-level JSON-LD. Paginated pages are independently self-canonical (`/tags/astro/2/` points to itself); page 1 is `/tags/astro/`, not a duplicate `/1/`. Avoid misleading indexes for empty categories; exclude empty routes from sitemap.

**TAX-06 · Taxonomy source ownership.** Category/tag catalog lives in Site data (`data/taxonomy.yaml` or a schema-equivalent JSON input), not hand-coded in Core/theme. Site v1 fields may continue to use plain string tags; migration must normalize without modifying original Site.

## C. Search and language isolation (SEARCH-01–SEARCH-03)

**SEARCH-01.** One Pagefind build can produce separate indexes per language by inspecting each page's `<html lang="...">`; use this official behavior rather than duplicating full search engines. `zh-CN`, `en`, `ja` need language-specific URLs, UI labels, and tests with same-name fixtures. Default search only covers current language; a global/all-languages search is a separate opt-in UX decision.

**SEARCH-02.** Index only published, indexable article/content routes. Exclude search results, draft, private/unlisted, alias, duplicate pagination shells and generated Markdown mirrors. A taxonomy page may be discoverable in conventional HTML sitemap but should not be returned as an article result unless explicitly desired. Verify manual segmented Chinese query and English case in browser.

**SEARCH-03.** Search results must use the same route URL builder as navigation; verify root and `/ALNILAM/` deployments. Lazy init and repeat navigation cannot cause multiple independent Pagefind instances or cross-locale search leakage.

## D. SEO and discoverability (SEO-01–SEO-09)

**SEO-01 · Canonical.** Every indexable page has exactly one absolute self-canonical URL with normalized slash, base path and locale. Localized article versions are **each independently canonical**; never canonical English content to Chinese merely because Chinese is the default. Search query parameters, tracking params and aliases are not canonical URLs.

**SEO-02 · hreflang.** Only true equivalent pages linked reciprocally, including self. Use language tags correctly and an `x-default` URL only when a real fallback page exists. Google supports HTML link tags or XML sitemap hreflang; choose one authoritative generation registry and validate consistency if both output. Avoid generic redirect on language guess.

**SEO-03 · Page metadata.** Localized `<title>`, unique `meta description`, `<html lang>`, OG title/description/type/image/url/locale where applicable, Twitter preview and article published/modified dates. Missing title is a build-time content error; description has defined fallback. No silent runtime fetch required.

**SEO-04 · Structured data.** WebSite on site root; BlogPosting/Article on post pages with `headline`, `mainEntityOfPage`, `datePublished`, real `dateModified`, `inLanguage`, author and licensed image if available; BreadcrumbList on hierarchical pages; CollectionPage on appropriate taxonomy archives if supported and meaningful. No fictional rating/review schema or duplicated site metadata.

**SEO-05 · Sitemap.** Include indexable public canonicals only, not drafts, aliases, Markdown mirrors, empty taxonomy pages, noindex/search UI result pages or soft redirects. Use meaningful `lastmod` from actual content updates. Build-time artifacts link to canonical origin/base. Output can use one sitemap with locale URLs; sitemap index is optional at scale.

**SEO-06 · Feeds.** Generate one RSS/Atom feed per enabled locale only when appropriate. Each feed contains that locale's posts with absolute canonical item URLs, stable GUID, proper content/date escaping and self link. Feed discovery from pages points to the matching locale file. Cross-language links belong in equivalent HTML pages, not by mixing languages in a single feed.

**SEO-07 · robots policy.** Root-domain `/robots.txt` is a host-level protocol; when hosted at a GitHub Pages project subpath `/ALNILAM/`, a file at `/ALNILAM/robots.txt` is NOT automatically the origin-wide robots file. Do not claim subpath robots governs the whole host; rely on meta `noindex` and sitemap inclusion for per-page policy, and document the hosting limitation. `robots.txt` is not access control for sensitive content.

**SEO-08 · Media and performance.** Image dimensions, descriptive alt, first hero/cover responsive format, self-host where licensed and performant, OG preview path correctness; respect Site ownership and privacy. Resolve CSS/JS/fonts in a path-safe way.

**SEO-09 · Automated verification.** Build root and GitHub Pages subpath variants; crawl real generated HTML link targets; parse Canonical/hreflang/sitemap/JSON-LD and compare expected URL set. Include localized taxonomies with no posts, pagination > 1, legacy aliases, cross-locale links and translation missing. Browser E2E covers clicking through each route and changing language.

## E. llms.txt v2 and Markdown views (LLM-01–LLM-08)

Official source is the **llmstxt.org v2 proposal modified 2026-08-10**; it is a community proposal, **not** an official Google ranking signal. It complements SEO rather than replacing HTML, sitemap, robots or Search structured data. Reference KIRARI P6/#101 source-backed solution, not its historical condensed HTML extraction approach.

**LLM-01 · Optional feature flag.** Site config provides `[llms] enabled = true|false`, with explicit preview defaults. When disabled, generate no public LLM discovery or Markdown mirrors and do not add head discovery links. No runtime dependency required.

**LLM-02 · Scope indexes.** On a Pages subpath generate `/ALNILAM/llms.txt` for site-wide curated discovery, `/ALNILAM/en/llms.txt` and `/ALNILAM/ja/llms.txt` for locale-specific coverage, optionally deeper indexes if collections grow. More specific index controls subpath coverage. Each generated file has a site H1, useful description, H2 link groups, optional secondary links, and points to **real** Markdown page views at canonical Site paths.

**LLM-03 · Clean Markdown.** Each indexable, public, selected content page has a source-backed Markdown representation, e.g. `/en/posts/hello/index.md`, served `text/markdown; charset=utf-8`. Build from the actual Markdown/MDX AST/entries, **not HTML stripped to plaintext**. Preserve code fences, math, diagrams in useful source format, headings, semantic links and images; MDX-only interactive components need meaningful text/link fallbacks. Fix relative assets and content links through canonical path resolver, respecting base and locale.

**LLM-04 · Discovery.** On each generated HTML article with a view, emit HTML links or equivalent HTTP Link headers:
```html
<link rel="alternate" type="text/markdown" href="https://example.com/en/posts/hello/index.md">
<link rel="describedby" type="text/plain" href="https://example.com/en/llms.txt">
```
Do not advertise nonexistent Markdown views or stale locale indexes.

**LLM-05 · Visibility.** Reuse exactly the public/indexable route inventory for Markdown views and curated indexes: no draft, unlisted, private/secret, disabled routes, duplicated aliases or untranslated generated shell. `noindex` isn't confidentiality; material must not be published at all when declared private. Never include README, Site secrets, generated logs or build manifests as user content.

**LLM-06 · Full aggregation optional.** `llms-full.txt` is a large aggregated convenience format, not a mandatory requirement of the v2 proposal. Make it explicitly configurable and OFF by default until owner evaluates copyright, filesize, robots policy and provider hosting limits. If enabled, build only from public selected Markdown views; preserve original Markdown semantics and document that 'no-store' HTTP headers may be unavailable on static Pages and robots exclusions are not security boundaries. Do not impose numeric limits absent from upstream proposal without measuring.

**LLM-07 · Index coherency.** All links inside llms indexes, Markdown source views and HTML discovery are absolute/canonical, correct for `/ALNILAM/` or root deployment, and refer only to existing generated files. Under a multilingual Site, default and locale-specific indexes cover the correct language while the root may contain a link to each locale index.

**LLM-08 · Tests.** Fixture-tests enabled/disabled, two+ locales, nested content slug, missing translation, draft, category/tag pages (no fake article views), code+math+Mermaid preservation, MDX fallback, relative images, rooted/external links, and repeat-build output determinism. A head discovery crawler verifies every published alternate/describedby reference resolves. LLMS v2 does not change Google indexing guarantees.

## F. Implementation ownership and review checkpoints

| Owner Issue | Contract IDs | Exit evidence |
| --- | --- | --- |
| #51 Schema | ROUTE-01–04, TAX-01–02, TAX-06 | Site-owned taxonomy fixture, versioned schema validation, legacy Site v1 tests |
| #62 Content model | ROUTE-04, TAX-01–06 | Category/tag/translationKey fixtures and actual pages |
| #63 Search | SEARCH-01–03 | Multi-locale Pagefind E2E, root/base tests |
| #64 SEO & URLs | ROUTE-02–07, SEO-01–09 | URL builder unit tests, root/base artifact crawler and localized SEO verification |
| #65 i18n | ROUTE-01–06, SEARCH-01, SEO-02, SEO-06 | Localized route/navigation/feeds/hreflang regression |
| **New P4 Issue** | LLM-01–08 | llmstxt.org v2 syntax/discovery/source-Markdown/browser/static artifact tests |
| #73 Multi-host E2E | ROUTE, TAX, SEARCH, SEO, LLM | Production-like preview screenshots/crawler and accessibility outputs |

**Acceptance rule:** a `supported` checkbox without the above route/data/metadata fixtures is NOT spec-complete. Freeze this contract only after owner reviews it as part of PR #77.