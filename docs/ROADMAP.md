# ALNILAM roadmap (Issue-driven)

This is the historical v0.1.x P0–P4 roadmap. The ALNILAM Next Plan/Spec is frozen in the [G0-F decision](next/08-G0-F-DECISION.md), which authorizes P1 only. The Shirone vertical slice shipped in [PR #95](https://github.com/Skyline-Gazer/ALNILAM/pull/95) under [#48](https://github.com/Skyline-Gazer/ALNILAM/issues/48); current P1 follow-ups are [#49](https://github.com/Skyline-Gazer/ALNILAM/issues/49), [#50](https://github.com/Skyline-Gazer/ALNILAM/issues/50), and [#79](https://github.com/Skyline-Gazer/ALNILAM/issues/79). These development PRs do not themselves close P1 or authorize a release.

**Tracker:** [Skyline-Gazer Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/). Project v2 board status is **not verified** merely because a linked repository Issue exists.

## Current P1 status — 2026-10-27

The implementation candidates and evidence are summarized in the [P1 exit-gate report](p1/P1-EXIT-GATE.md). PRs [#97](https://github.com/Skyline-Gazer/ALNILAM/pull/97), [#98](https://github.com/Skyline-Gazer/ALNILAM/pull/98), and [#99](https://github.com/Skyline-Gazer/ALNILAM/pull/99) target `dev`. Keep the P1 parent [#37](https://github.com/Skyline-Gazer/ALNILAM/issues/37) open until the candidate PRs are reviewed and merged and the Owner confirms the phase gate. The proposed first P2 issue is [#51](https://github.com/Skyline-Gazer/ALNILAM/issues/51); it is a handoff only and remains unstarted.

## P0 · Bootstrap & Core/Site
- Initial Monorepo, ADS v0.3 submodule, docs, Astro + Svelte + Tailwind baseline.
- External Site composition, config schema, non-mutation checks, separately reproducible Core/Site inputs.
- CI green, lockfile committed and frozen, content fixtures with upgrades/rollback and path/security tests.
- Complete platform README, developer and user setup, and branch governance.

## P1 · Editorial design
- Brand visual system based on SHBlog Next editorial aesthetics (original implementation).
- Fuwari single-row post list; rich article typography and consistent mobile layout.
- Real dark/light theming, navigation, accessible interactive states and visual regression.
- No unnecessary client JS; reduced-motion and keyboard accessibility.

## P2 · Blogging essentials
- Content schema versioning, archives, tags, categories, Pagefind local search.
- RSS, sitemap, SEO metadata, social preview, i18n and image pipeline.
- Upgrade tests using fixed old Site fixtures, deployment guides for static hosts.

## P3 · Optional advanced features
- **Shipped (v0.1.x)**: comments (giscus, feature-flagged), Bangumi collections (build-time fetch, static output).
- **Declined by owner decision (2026-10-25)**: gallery/album, moments/dynamics, music player — will not be built unless the owner reopens them.
- Standing discipline: no disabled-module network calls or unused runtime bundles (enforced); per-file upstream provenance audit before any copied code/assets are accepted.

## P4 · Release readiness
- Deterministic locked CI build, test matrix, security audit, end-to-end mobile desktop checks.
- External Site onboarding example, maintainer docs, changelog and first stable tagged release.
- Native hosting provider deployment only when owner authorizes production cutover.

**Acceptance discipline:** Issue is not closed until linked PR and relevant actual GitHub Actions/browser evidence are recorded. Unavailable GitHub Projects v2 permission must remain explicitly unverified.

