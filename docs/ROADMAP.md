# ALNILAM roadmap

Task status lives in GitHub Issues and [Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/).
This page is the product direction only; delivery receipts live in PRs, Issues and CI.

## Released

- **v0.1.3** (2026-11): Editorial theme, Core/Site composition, TOML schema v1. Rollback line only.
- **v0.2.0 Foundation** (2026-11-20, tag `v0.2.0` on `main`): Shirone-derived frontend,
  YAML-only schema v2, search/i18n/SEO, root and nested hosting, Comments and Bangumi
  opt-in modules, release artifact hygiene.

## Current: v0.3.0 stabilization

Draft entries are in [CHANGELOG.md](../CHANGELOG.md). Completed and in progress:
locale-scoped listings (#35), URL contracts (#81), lightbox zoom (#198), Demo content
(#190), product consolidation. The 2026-11-23 Owner decision
([#203](https://github.com/Skyline-Gazer/ALNILAM/issues/203)) deprecated Gallery/Albums,
Moments and site-wide Music; the `gallery`/`moments` Site keys stay accepted, ignored
and warned so existing Sites keep building. Vendored Shirone sources for retired modules
remain unreached to keep upstream tracking cheap. Dedicated standalone accessibility
audits (axe/VoiceOver/contrast gate-style acceptance) are rejected scope per
[#240](https://github.com/Skyline-Gazer/ALNILAM/issues/240); ordinary ARIA, native semantics
and keyboard behavior stay in the product.

## Next-version proposals (Owner decision required)

- [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136) — four-source differentiation
  audit (Shirone / Firefly / Mizuki / KIRARI) feeding the next version scope, including
  AiringCal and KIRARI research. No implementation is authorized by the audit itself.
- [#138](https://github.com/Skyline-Gazer/ALNILAM/issues/138) — dev Demo vs main Production
  deployment split; first formal Production release needs separate Owner authorization.

## Approved long-running research (non-blocking)

- [#137](https://github.com/Skyline-Gazer/ALNILAM/issues/137) — Upstream Watch & Selective
  Sync via `scripts/upstream-watch.mjs`; reviews are manual.
- [#88](https://github.com/Skyline-Gazer/ALNILAM/issues/88) /
  [#89](https://github.com/Skyline-Gazer/ALNILAM/issues/89) — Git-based and headless CMS
  adapters; the offline Pages CMS PoC (`scripts/pages-cms.mjs`) stays research.
- [#83](https://github.com/Skyline-Gazer/ALNILAM/issues/83) — Astro incremental build /
  parallel prerender adoption, gated on upstream stability.
- [#145](https://github.com/Skyline-Gazer/ALNILAM/issues/145) — build cache working-set
  calibration.
- Product constitution: **Shirone-first, not Shirone-only** — one frontend foundation,
  selective capability adoption, no competing themes or routers.
