# Changelog

All notable changes to ALNILAM are documented here. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [SemVer](https://semver.org/).

Tagging rules: annotated `vX.Y.Z` tags are created on `main` only, by the maintainer merging a release PR (`dev` → `main`). Every tag's commit must have passing CI on `main`.

## [Unreleased]

### Changed

- Listings are now scoped to one locale's corpus ([#35](https://github.com/Skyline-Gazer/ALNILAM/issues/35)): the default-locale home, `/posts/`, `/archives/`, `/categories/`, `/tags/` and the taxonomy detail routes list only default-locale articles instead of the whole multilingual corpus, matching the per-locale RSS feeds and the language-sliced Pagefind index that were already locale-scoped. Page counts, pagination boundaries and taxonomy routes are per locale, and a locale without members in a category or tag no longer gets a route. Site pages, article URLs and `hreflang` alternates are unchanged; series pages stay corpus-wide until their own localization change.
### Removed

- Retire the Gallery/Albums, Moments and Music product features: no `/albums/` or `/moments/` route, navigation link, client module, content collection or Demo fixture is emitted any more. The `gallery` and `moments` Site config keys remain accepted so existing Sites keep building, are ignored, and now print a one-line build warning; remove them from `alnilam.config.yaml`. Article image lightboxes are unchanged ([#203](https://github.com/Skyline-Gazer/ALNILAM/issues/203)).
- Remove the legacy fixture and HTTPS lightbox test articles from the published Demo. The PhotoSwipe browser matrix composes the HTTPS article from a dedicated test Site ([#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194)).

### Changed

- Home is the canonical article Feed. The old `/posts/` indexes redirect to the corresponding locale’s Home and the primary Posts item is removed. Numbered pages and article URLs keep their published paths ([#200](https://github.com/Skyline-Gazer/ALNILAM/issues/200)).
- The article category bar and the sidebar tag widget are now contextual opt-in decided by the layout page capability instead of a global default with a route denylist: the bar renders only on home and article pages, the tag cloud only in blog contexts (home, article, listing, category and tag routes), and every other capability is excluded — series, module pages and static Site pages opt in to nothing, while a route that declares no capability at all, such as search, inherits nothing either. Site-identity Profile stays on every page, and the 404 page now declares the excluded `notFound` capability rather than impersonating the home context ([#204](https://github.com/Skyline-Gazer/ALNILAM/issues/204)).
- The Vercel deployment serves the content-hashed `/_astro/*` build assets with `Cache-Control: public, max-age=31536000, immutable` instead of Vercel's `max-age=0, must-revalidate` default, so a navigation no longer revalidates the 16 render-blocking stylesheets before first paint. Lab A/B on the same Demo build (390×844, +60 ms RTT, 10 Mbps, 2× CPU, 8 samples per arm, two rounds): Home→article first contentful paint median 696–700 ms → 336–344 ms on the first navigation and 680–684 ms → 224–228 ms on the repeat; HTML, feeds, Pagefind and Site assets keep revalidating ([#74](https://github.com/Skyline-Gazer/ALNILAM/issues/74)).

### Fixed

- Use the article language for the mobile contents and back-to-top controls. The three getting-started guides now support keyboard scrolling in their code examples ([#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194)).
- Place archive and taxonomy detail headings and post counts inside Shirone’s timeline card. The existing detail breadcrumb links back to its locale’s taxonomy index ([#196](https://github.com/Skyline-Gazer/ALNILAM/issues/196)).
- Keep desktop navigation links readable and clickable while the header search expands, including at the desktop breakpoint and with translated labels ([#189](https://github.com/Skyline-Gazer/ALNILAM/issues/189)).
- Stop the component entry animation from moving interactive content ([#213](https://github.com/Skyline-Gazer/ALNILAM/pull/213), [#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194)): components now fade opacity only, and the reading column carries no animation delay. The old slide moved every link inside the animated container by up to 32 px after it was already tappable, so a press whose release landed during the slide was cancelled by the browser and the tap silently did nothing. Measured on `/categories/release/`: 4 of 8 slow "previous page" taps lost before, 0 of 8 after; the new `tests/browser/entry-animation.spec.ts` fails 3 of 4 on the previous animation and passes 4 of 4 after.
- Article reading controls no longer float over the text on phones and narrow viewports ([#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194)): below 1024 px (`lg`) the reading column keeps its full width and carries an in-flow contents disclosure at the top of the article plus an in-flow back-to-top link at the end, both with 44 px targets; the floating cluster is not rendered there, non-desktop floating TOC markup is omitted, and text-obstruction measurement is skipped. Desktop (`>= 1024 px`) keeps the existing cluster, panel and #211 focus behaviour. The former mobile contract ("the cluster must be visible, or hidden when it overlaps") could not hold on long articles: the 49 px cluster intruded 45 px into a 264–374 px column (and still overlapped 4 text blocks at 768 px single-column layout), so the outcome depended on host text metrics.
- Narrow the mobile reading-control change to article pages and clean its labels ([#194](https://github.com/Skyline-Gazer/ALNILAM/issues/194)): below 1024 px only article pages hide the floating cluster, so archives, tags and other listing pages again show their configured mobile/tablet controls (home, back-to-top), which have no in-flow replacement there; and the in-flow contents disclosure no longer prints the autolink `#` after every heading label. `floating-controls-overlap.spec.ts` asserts both; on the previous build 20 of its 29 cases fail (16 label, 4 listing-page).

## [0.2.0] - 2026-11-20

### Migration from v0.1.x

- Foundation targets **v0.2.0** because v0.1.3 Sites use the incompatible TOML v1 contract. Before switching, keep the old Core tag, Site revision and working output. In a separate Site revision, author `alnilam.config.yaml` with `schemaVersion: 2`, add `locales` including `site.locale`, and remove `alnilam.config.toml`. A Site containing both config files is rejected. Use the [schema example](docs/SITE_ONBOARDING.md#alnilamconfigyaml-schema-v2) and review all enabled modules.
- For existing Giscus pathname discussions, explicitly set `comments.mapping: pathname` and retain the same public paths. `specific` uses a different identity and does not migrate discussions. Check translated article aliases, canonical URLs, feeds and Pagefind at the actual deployment base before switching output.
- Roll back across the schema boundary by restoring the previous output or rebuilding the pinned v0.1.3 Core with its original TOML Site revision. For compatible YAML revisions, use the [same-Site upgrade and rollback procedure](docs/SITE_ONBOARDING.md#core-upgrade--rollback-workflow).


### Added
- **Optional Site Gallery (Issue #67):** `gallery.enabled` gates Site-owned `data/albums.yaml` album/list pages, locale-aware routes, lazy Gallery images and PhotoSwipe. Image references accept validated Site asset paths or HTTPS URLs; Core does not fetch or proxy remote images. The Demo Site opts in with licensed remote samples and local illustrations.
- **Git-based CMS authoring PoC (Issue #88):** an isolated Site `.pages.yml`, an offline write-back adapter and dual-base compose tests verify post field mapping, unknown-frontmatter and MDX roundtrip with no data loss, media paths at root and `/ALNILAM/`, and that removing the editor config leaves the Site digest, build and provenance unchanged. No Core runtime, hosted service or production integration is included.
- **Pages CMS post creation (Issue #88):** `scripts/pages-cms.mjs create` writes a new post from declared frontmatter fields, validating required values, field types and select options before writing; it refuses overwrite and paths outside `content/posts/`, and keeps the body verbatim.
- **Pages CMS schema generation (Issue #88):** `scripts/pages-cms.mjs init` renders `.pages.yml` from the Site's categories and tags (including optional `data/taxonomy.yaml`), refuses to replace an existing file without `--force`, and `verify` reports category drift between the editor select and published posts.
- **Manual upstream watch (Issue #137):** `pnpm upstream:watch` records four-source Release/tag/head/recent-Issue evidence, direct locked dependency candidates, lockfile drift and `pnpm audit` advisories. The tracker separates `last_seen`, `last_analyzed` and `last_integrated`; it is manual-only and adds no scheduled workflow.
- **Inline Markdown code spacing (Issue #137; Firefly `994c0b8da0cb63f7a6190b4da88ecb08446575c4`):** preserve consecutive spaces in inline code on both root and `/ALNILAM/` pages; code blocks keep their existing rendering.
- **Pages CMS Site branch preflight (Issue #88):** write commands can require an explicit current Git branch with `--expect-branch`; mismatches fail before Site files are written. This local check does not replace remote branch protection or PR review.
- **Opt-in llms.txt v2 discovery (Issue #78):** site and locale indexes, source-backed article Markdown views and HTML discovery; optional full aggregation defaults off. Draft, private and unlisted posts are excluded from published routes.
- **Site schema v2 validation (Issue #51)**: strict `schemaVersion: 2`, closed-world unknown-field rejection, locale/routing/taxonomy validation, and a fail-closed YAML parser (no duplicate keys, unresolved tags or non-plain values).
- **Comments provider/privacy contract (Issue #71):** Giscus is the single first-launch provider with stable `specific` terms (`commentId` → `translationKey` → content id), explicit `sharing`/`load`/`lang` options, third-party disclosure, provider-scoped CSP, non-blocking failure/retry fallback and idempotent provider teardown. Disabled comments still ship zero comment JS/network.
- **Shirone frontend:** one Shirone-derived M3E application for home, posts, archives and taxonomy, retaining the ALNILAM Core/Site boundary, Pagefind and optional module behavior.
- **Bangumi snapshots (Issue #70):** opt-in builds cache public collections and locally emitted covers outside the Site. Provider or cover failures reuse the matching last valid snapshot; a successful empty result replaces it. Visitors make no third-party data or cover requests.
- **Optional Site Moments (Issue #68):** Site-owned `data/moments.yaml`, build-time filtering and localized Moments routes. The Demo enables Moments explicitly.
- **Build cache safety and reuse (Issue #145):** normal Compose preserves project-local legacy paths; managed and legacy cleanup stay explicit; bounded GC protects active builds and manifests. Shirone reuses compiled output by Core-input fingerprint and shares identical verified bytes across input fingerprints in immutable SHA-256 objects; mutable Site state stays isolated.
- **Site-authored static pages (Issue #160):** optional `content/pages/` Markdown/MDX pages render at `/pages/<path>/` and locale-prefixed routes. Drafts are excluded; canonical, sitemap and translation alternates, Open Graph covers/article metadata, and root/subpath output are covered. Page categories and tags do not enter post taxonomies, archives or feeds.
- **Release artifact hygiene gate (Issue #166):** Verify, external-Site CI, GitHub Pages uploads and `pnpm vercel-build` inspect final `dist/site` output, including copied Site assets, and fail on publication-inappropriate files without printing their contents.
- **Repository notices in the Demo (#147):** the bundled Demo copies the canonical license, notice, credits, third-party ledger and license texts to `site-assets/alnilam-notices/` during Compose, for both Vercel and Pages builds. The ledger now covers the client modules found in emitted bundles, the bundled icon sets and the pinned Pagefind WebAssembly dependency lockfile. Generic Compose builds for independent Sites still add nothing; no blog page or route is added.

### Changed
- **Search runtime (Pagefind 1.6.0):** the indexer and WASM search runtime move from 1.5.2, whose release inputs included the GPL-3.0-only `pagefind_microjson` parser, to 1.6.0, which uses the MIT `hifijson` parser. Root and `/ALNILAM/` builds, localized search and pagination were re-verified.
- The demo Site includes a two-article introductory series and a published MDX example.
- **Site configuration is YAML-only**: `alnilam.config.yaml` replaces `alnilam.config.toml`; a TOML-only Site now fails closed with an actionable message. No automatic v1→v2 migration is provided.
- Local browser and CLS commands remain available for local checks. Lighthouse measurements use `pnpm lighthouse:local`, which runs `scripts/ci/cnb-lighthouse.mjs` with `lighthouserc.cjs` as a baseline and replaces its routes with composed root and `/ALNILAM/` routes. GitHub Actions `verify` runs its declared checks, including browser acceptance; it does not run Lighthouse. CNB artifact transport belongs to the historical [browser/CLS pilot](docs/pilots/CNB-BROWSER-PLUGINS.md), not current validation.
- **Comments mapping migration (breaking when comments.enabled):** enabled Sites must explicitly set `mapping`. Existing Sites can select `pathname` to retain URL-based threads; `specific` uses stable terms and starts separate discussions. Omitted mapping now fails the build. `load` defaults to `click`.

### Removed
- Runtime TOML Site config parsing (`smol-toml` dependency), `alnilam.config.toml` support, and the in-repo `sites/legacy-demo` path (the v1 fixture moved to `tests/fixtures/site-v1-legacy`).

### Fixed
- **Build cache safety (Issue #145):** cleanup and GC reject dangling namespace symlinks, compiled bundle repair atomically replaces corrupt artifacts under concurrent rebuilds, and stale build locks fail closed for explicit operator recovery instead of racing automatic eviction. Lock acquisition retries if the previous holder releases between a collision and lock inspection; malformed or unreadable lock state still fails closed. Managed-cache ownership markers publish atomically during concurrent first use. Astro builds serialize against the shared per-worktree `.astro` scratch state, including builds with different Site digests and cache roots.
- **Optional Site Gallery (Issue #67):** album cards use the current locale's detail route, empty album lists and unmatched filters show distinct states, and photo descriptions survive normalization.
- Article pages now render series context and previous/next links using their canonical localized routes.
- **Pages CMS field validation (Issue #88):** post creation and edits reject non-integer or unsafe `seriesOrder` values before writing; edits also validate changed fields against the editor schema while preserving unrelated metadata.
- **Search panel (Issue #131):** a finished search that matched nothing now states it in the page language (all ten dictionaries) instead of leaving an empty panel on mobile and closing without any feedback on desktop.
- **Navigation landmarks (Issue #35):** the desktop navigation and the drawer navigation announce their names in the page language instead of hardcoded English, also after a client-side language switch. The shared browser contracts select the navigation landmark by its stable id, not by its English name.
- **Locale resolution (Issue #35):** a regional locale without its own dictionary entry now uses its base language (`es-ES` renders Spanish instead of English), and a translation key that no dictionary defines degrades to the English text instead of an empty label.
- Archive and taxonomy timeline controls and post counts follow the active page language.
- **Mobile navigation drawer (Issue #35):** while the modal drawer is open, the header and page content are `inert`, so assistive technology and scripts cannot reach the obscured page; navigation links, Escape, outside press, desktop resize and unmount clear that state.
- **Mobile navigation drawer (Issue #35):** `aria-expanded` now flips only once the panel is visible and focus has moved inside, so a Tab in the opening frame cannot reach the page behind the modal.
- **Search and display-settings panels (Issue #35):** closed float panels leave the accessibility tree and tab order (`visibility: hidden`), and their toggles expose `aria-expanded`/`aria-controls`, including after Escape or an outside click.
- **Header and drawer accessible names (Issue #35):** menu, display-settings, search and theme-switch labels now follow the page language (`zh-CN`/`en`/`ja` and every shipped dictionary) instead of hardcoded English, including after client-side language switches.
- Search pages retain their route when switching between available languages, including under nested base paths.
- Search results no longer display Pagefind's internal weight delimiter in titles or excerpts on the search page or header panel.
- **Mobile navigation drawer (Issue #35):** a tap on the menu button before the drawer island hydrates is replayed instead of dropped, so the first tap always opens the drawer.
- **Mobile navigation drawer (Issue #35):** the open drawer keeps keyboard focus inside its `aria-modal` panel and returns focus to the menu button when dismissed by a press outside the panel or Escape.
- **Mobile navigation drawer (Issue #35):** the menu button ships `aria-expanded`/`aria-controls` before hydration, so assistive technology sees the disclosure relationship and state from first paint.
- Archive pages serialize only the post fields needed for display and filtering, reducing HTML size while retaining archive interactions.
- Markdown links retain their text while unsafe URL schemes are removed.
- Markdown feature styles load as page-scoped assets, reducing HTML size for articles with code blocks and diagrams while retaining navigation cleanup.
- Series detail pages retain separate Layout and Markdown runtime scripts; Expressive Code's generated client behavior is shared with those runtimes to keep article script counts within budget.
- Reduced repeated Shirone layout markup so nested-base pages retain more room within the HTML size budget.
- Localized category and tag indexes now remain available for locales with published posts but no taxonomy, with reciprocal language links matching the generated indexes.
- Nested-base canonicals/internal links, Pagefind runtime/index resolution under `/ALNILAM/`, and disabled Bangumi route output for the default fixture.

## [0.1.3] — 2026-10-25

### Added
- **Comments + Bangumi modules shipped on the release line** (PR #24/#27): feature-flagged via `[comments]` / `[bangumi]`; module route gating (disabled = nothing shipped).
- **GitHub Pages deployment pipeline live**: https://skyline-gazer.github.io/ALNILAM/ (contract-gated workflow).

### Fixed
- Deploy trigger moved from tag refs to main pushes (github-pages environment policy rejects tag refs at job startup); manual dispatch retained.

## [0.1.2] — 2026-10-25

### Added
- **GitHub Pages deployment**: tag-triggered workflow (contract tests gate the deploy); Pages `build_type=workflow`.
- **Base-path aware builds**: `ALNILAM_SITE_URL` deployment override; Astro `base` derives from the URL path; `withBase` helper prefixes internal links, assets, pagefind runtime and site-authored covers (external URLs untouched). Root-hosted Sites unchanged (regression-verified).
- Docs: optional-modules usage section (comments/Bangumi) in Site onboarding.

## [0.1.1] — 2026-10-25

### Added
- **Comments module** (opt-in): giscus provider, feature-flagged via `[comments]`; lazy `client:visible` island; disabled = zero JS / zero third-party requests. Fail-closed config validation.
- **Bangumi module** (opt-in): `/bangumi/` page built from a single build-time `api.bgm.tv` fetch — fully static output, zero client third-party calls; covers hotlinked with `referrerpolicy="no-referrer"`; API failure degrades to an inline warning.
- **Module route gating**: optional-module pages (`src/pages/opt/`) are injected via an Astro integration only when enabled — a disabled module ships no page, no 404 stub, no JS.
- Owner declined (recorded): gallery/album, moments/dynamics, music player.

### Fixed
- CI old-core fetch chain (variable SHA → `v0.1.0` tag → bootstrap state) after `upload-pack` "not our ref" rejections from PR checkouts.

---

## [0.1.0] — 2026-10-25

First tagged release: Core/Site platform baseline through P2 essentials.

### Added
- **Core/Site composition**: independent Site ownership (`alnilam.config.toml`, `content/posts/`, optional `assets/`, `data/`); non-mutating staged builds with pre/post digest checks; `alnilam-provenance.json` binding Core revision + Site SHA-256; safe output placement (no overlap with Site, no symlinks in Site inputs).
- **Schema v1 (frozen)**: explicit `schemaVersion` validation, fails closed on unknown versions; additive i18n fields `lang` (BCP-47) and `translationKey`.
- **Upgrade/rollback acceptance**: two Core revisions build one unchanged external Site; Site digest verified identical across upgrade and rollback; CI-enforced (`scripts/upgrade-check.mjs`).
- **Editorial theme**: original design-token system with true dark/light palettes; Fuwari-style one-post-per-row cards (text left / cover right ~28% desktop, cover-top mobile); cinematic homepage hero with original constellation artwork; semantic prose typography; keyboard accessibility, focus-visible, prefers-reduced-motion.
- **Content discovery**: archives by year, tags index, per-tag listings, paginated post stream (`/posts/`, pageSize 5).
- **Feeds & SEO**: RSS 2.0, sitemap.xml (with hreflang `xhtml:link` entries), robots.txt, OpenGraph/Twitter cards, JSON-LD (WebSite/BlogPosting), canonical URLs, per-post `<html lang>`.
- **Local search**: Pagefind index built during compose, lazy-loaded UI island (no post content in page bundles); zh-CN UI.
- **i18n**: locale-directory content convention, hreflang alternates, RSS per-item language.
- **Composable CLI**: `node scripts/compose.mjs --site <dir> --out <dir>`; `SOURCE_DATE_EPOCH`-pinnable deterministic output.
- **CI**: frozen-lockfile install, contract tests, astro check, demo compose + output assertions, external-Site isolation, two-version upgrade/rollback, artifact budgets (zero scripts on posts pages, ≤2 islands/page, img CLS dimensions, provenance integrity), ADS gitlink pin.

### Platform
- Astro 7, Svelte 5 (runes), Tailwind CSS 4, pnpm 10.19 workspace; Node ≥22.23.4.
- Rulesets `alnilam-dev` / `alnilam-main`: PR-only merges, required `verify` check, force-push/deletion protection.

