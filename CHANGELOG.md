# Changelog

All notable changes to ALNILAM are documented here. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [SemVer](https://semver.org/).

Tagging rules: annotated `vX.Y.Z` tags are created on `main` only, by the maintainer merging a release PR (`dev` → `main`). Every tag's commit must have passing CI on `main`.

## [Unreleased]

### Added
- **Git-based CMS authoring PoC (Issue #88):** an isolated Site `.pages.yml`, an offline write-back adapter and dual-base compose tests verify post field mapping, unknown-frontmatter and MDX roundtrip with no data loss, media paths at root and `/ALNILAM/`, and that removing the editor config leaves the Site digest, build and provenance unchanged. No Core runtime, hosted service or production integration is included.
- **Opt-in llms.txt v2 discovery (Issue #78):** site and locale indexes, source-backed article Markdown views and HTML discovery; optional full aggregation defaults off. Draft, private and unlisted posts are excluded from published routes.
- **Site schema v2 validation (Issue #51)**: strict `schemaVersion: 2`, closed-world unknown-field rejection, locale/routing/taxonomy validation, and a fail-closed YAML parser (no duplicate keys, unresolved tags or non-plain values).
- **Comments provider/privacy contract (Issue #71):** Giscus is the single first-launch provider with stable `specific` terms (`commentId` → `translationKey` → content id), explicit `sharing`/`load`/`lang` options, third-party disclosure, provider-scoped CSP, non-blocking failure/retry fallback and idempotent provider teardown. Disabled comments still ship zero comment JS/network.
- **P1 Shirone frontend vertical slice (candidate, #48):** local Shirone-derived M3E home/list/article/archive/tag presentation with the retained ALNILAM Core/Site contracts, Pagefind, optional-module and rollback coverage. Not released or deployed.
- **Bangumi snapshots (Issue #70):** opt-in builds cache public collections and locally emitted covers outside the Site. Provider or cover failures reuse the matching last valid snapshot; a successful empty result replaces it. Visitors make no third-party data or cover requests.

### Changed
- **Site configuration is YAML-only**: `alnilam.config.yaml` replaces `alnilam.config.toml`; a TOML-only Site now fails closed with an actionable message. No automatic v1→v2 migration is provided.
- Local browser, CLS and Lighthouse commands share the CNB test configuration; CNB evidence upload verifies downloaded commit attachments and supports a confirmed per-file-limit fallback.
- **Comments mapping migration (breaking when comments.enabled):** enabled Sites must explicitly set `mapping`. Existing Sites can select `pathname` to retain URL-based threads; `specific` uses stable terms and starts separate discussions. Omitted mapping now fails the build. `load` defaults to `click`.

### Removed
- Runtime TOML Site config parsing (`smol-toml` dependency), `alnilam.config.toml` support, and the in-repo `sites/legacy-demo` path (the v1 fixture moved to `tests/fixtures/site-v1-legacy`).

### Fixed
- **Search panel (Issue #131):** a finished search that matched nothing now states it in the page language (all ten dictionaries) instead of leaving an empty panel on mobile and closing without any feedback on desktop.
- **Navigation landmarks (Issue #35):** the desktop navigation and the drawer navigation announce their names in the page language instead of hardcoded English, also after a client-side language switch. The shared browser contracts select the navigation landmark by its stable id, not by its English name.
- **Locale resolution (Issue #35):** a regional locale without its own dictionary entry now uses its base language (`es-ES` renders Spanish instead of English), and a translation key that no dictionary defines degrades to the English text instead of an empty label.
- **Mobile navigation drawer (Issue #35):** while the modal drawer is open, the header and page content are `inert`, so assistive technology and scripts cannot reach the obscured page; the state is cleared on Escape, outside press, desktop resize and unmount.
- **Mobile navigation drawer (Issue #35):** `aria-expanded` now flips only once the panel is visible and focus has moved inside, so a Tab in the opening frame cannot reach the page behind the modal.
- **Search and display-settings panels (Issue #35):** closed float panels leave the accessibility tree and tab order (`visibility: hidden`), and their toggles expose `aria-expanded`/`aria-controls`, including after Escape or an outside click.
- **Header and drawer accessible names (Issue #35):** menu, display-settings, search and theme-switch labels now follow the page language (`zh-CN`/`en`/`ja` and every shipped dictionary) instead of hardcoded English, including after client-side language switches.
- Search pages retain their route when switching between available languages, including under nested base paths.
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

