# ALNILAM — Agent Entry Point

## Project

ALNILAM is an Apache-2.0 open-source static-first personal blogging platform.
**Core owns the program; Site owns content, configuration and assets.** The
Site is an immutable build input — no production operation may write into it.

## Stack and layout

- `apps/web` — Astro 7 + Svelte 5 + Tailwind CSS 4 assembly and routes.
- `packages/core` — Site config contract; `packages/ui` — Svelte islands.
- `themes/shirone` — the released frontend foundation (vendored upstream plus
  `adapter/` glue; do not opportunistically refactor vendored files).
  `themes/editorial` — released v0.1.x rollback package.
- `sites/demo` — bundled Demo fixture only, never a user's Site.
- Site contract: `alnilam.config.yaml` (`schemaVersion: 2`), `content/posts/`,
  optional `assets/` and `data/`. YAML-only: a TOML-only Site fails closed and
  there is no v1 fallback or automatic migration.
- Product obligations: Fuwari-style one-post-per-row reading flow, responsive
  layouts, dark/light themes, categories/tags/archives/series, Pagefind search,
  multilingual content with locale isolation, article images with PhotoSwipe,
  optional Bangumi and Comments, CLS/perceived-performance budgets, Release
  Artifact Hygiene. Gallery, Moments and site-wide Music are retired; do not
  restore them.

## Commands

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test        # node contract tests
pnpm check       # Astro type and content checks
pnpm build       # compose demo + artifact + SEO checks
python3 -m unittest discover -s scripts/tests -p '*_test.py'
node scripts/compose.mjs --site /absolute/path/to/site --out /absolute/path/to/output
```

`pnpm browser:local`, `pnpm cls:local` and `pnpm lighthouse:local` reuse the
same Playwright/CLS/Lighthouse settings as CI against root and subpath outputs;
rebuild after product changes.

## Contracts that must not regress

- Composition emits `alnilam-provenance.json` binding the Core revision, the
  Site ref and the Site input digest; repeated builds are byte-identical with
  `SOURCE_DATE_EPOCH` pinned.
- A Core upgrade or rollback rebuilds an unchanged Site:
  `node scripts/upgrade-check.mjs --old <core-sha>`.
- Secrets never enter the repository, logs, URLs or Site config.
- Three-language Usage Guide articles accompany each implemented feature.

## Development workflow

- Authority: GitHub `https://github.com/Skyline-Gazer/ALNILAM`. `dev` is the
  feature-development branch; `main` is release-only. CNB is a frozen source
  snapshot — do not push development work there or mirror it back.
- Ordinary development is Issue-linked PRs to `dev`. The required check is
  GitHub Actions `verify` (CI workflow, scope-aware: documentation-only
  changes run the documentation tests, everything else runs the full
  functional suite). Address material findings; independent approval is not
  mandatory. CodeRabbit is advisory — reply in its threads with disposition
  and evidence. Keep Auto-merge disabled; no force pushes.
- GitHub Issues and Project #17 are the only task-tracking state. Do not
  maintain a duplicate task database in Markdown.
- Development methodology is the installed Ponytail skill set: smallest
  complete change, reuse before new code, deletion before addition, no new
  frameworks or governance layers.

## Owner authorization boundaries

Production deployment, `main` promotion, release tags, repository ruleset or
protection changes, and credential scope changes require explicit Owner
authorization. Do not start recurring CNB mirroring or modify ADS upstream.
