# Changelog

All notable changes to ALNILAM are documented here. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: [SemVer](https://semver.org/).

Tagging rules: annotated `vX.Y.Z` tags are created on `main` only, by the maintainer merging a release PR (`dev` → `main`). Every tag's commit must have passing CI on `main`.

## [Unreleased]

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

[Unreleased]: https://github.com/Skyline-Gazer/ALNILAM/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Skyline-Gazer/ALNILAM/releases/tag/v0.1.0
