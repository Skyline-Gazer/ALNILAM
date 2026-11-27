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

- Composition records the Core revision, Site ref and input digest in
  `alnilam-provenance.json`. Preserve deterministic builds under fixed release
  inputs, including `SOURCE_DATE_EPOCH` and the toolchain.
- A Core upgrade or rollback rebuilds an unchanged Site:
  `node scripts/upgrade-check.mjs --old <core-sha>`.
- Secrets never enter the repository, logs, URLs or Site config.
- Maintain the three-language Demo and Usage Guide. Update affected guide
  articles in all three languages when user-facing behavior changes. Routine
  fixes, refactors and dependency updates need no new articles.

## Development workflow

- Authority: GitHub `https://github.com/Skyline-Gazer/ALNILAM`. `dev` is the
  feature-development branch; `main` is release-only. CNB is a frozen source
  snapshot — do not push development work there or mirror it back.
- Group related changes, tests and docs into focused PRs to `dev`. Link
  relevant Issues. GitHub Issues and Project #17 own task status.
- Small tasks go straight to implementation. For complex tasks, make only the
  plan needed to execute. Within the Owner's scope, carry the work through
  verification, review, merge to `dev` and Issue closure without step approvals.
- GitHub Actions `verify` is required. CodeRabbit is advisory. Fix material
  findings or explain the disposition in the relevant thread. Once the actual
  checks and merge requirements pass, merge ordinary authorized PRs. Keep
  auto-merge off and never force-push or bypass a required check.
- Update affected docs with the change. Use the existing worktree unless
  isolation is useful. Remove temporary resources you created when finished.
  Preserve user files, dirty or active worktrees and unique commits.
- Use installed Ponytail for the smallest complete change. Prefer reuse and
  deletion. Use `ponytail-audit` for real complexity or redundancy problems.

## Owner authorization boundaries

Major product scope changes, irreversible operations, release tagging, `main`
promotion, Production deployment, repository protection and permission changes
require explicit Owner authorization. Escalate blockers you cannot resolve.
CNB is frozen. Do not modify ADS upstream.
