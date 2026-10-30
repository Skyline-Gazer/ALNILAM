# ALNILAM roadmap (Issue-driven)

2026-10-30: GitHub remains primary while CNB Gatekeeper identity and stale-approval guarantees are unverified. The Owner selected a future GitHub PR mirror with a fixed `sync/cnb-main` branch and Merge Commit, without a ruleset bypass; neither cutover nor the first mirror is authorized. [PR #112](https://github.com/Skyline-Gazer/ALNILAM/pull/112) proposes the required `verify` compatibility fix; [PR #113](https://github.com/Skyline-Gazer/ALNILAM/pull/113) proposes local candidate construction only. P2 planning remains independent of CNB cutover; implementation requires its own development authority.

Latest status readback (2026-10-28): GitHub/CNB `dev` = `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`; GitHub/CNB `main` = `285a62cecd87f8f20276c7cc989537a391f488c8`; historical tags `v0.1.0`–`v0.1.3` match. Owner accepted P1; Issue #37 is closed and Project #17 marks it `Done`. PR #104 merged to `main` at `285a62…`, making Pages dispatch-only. CNB cutover remains a separate, unaccepted Issue #100 workstream; see [CNB readiness](cnb/CUTOVER-READINESS.md).

The historical v0.1.x roadmap below is preserved as traceability, not the Next P1/P2 scope authority. Owner-approved Plan/Spec [G0-F](next/08-G0-F-DECISION.md) uses **Shirone-first**, retained Core/Site and Git history, and incremental PR work. PRs #95/#97/#98/#99/#101/#102/#103 are merged to protected GitHub `dev`; #101 adds ADS v0.4.2 and a dispatch-only Pages workflow on `dev`. The P1 implementation/evidence baseline is `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb` with same-SHA verify [40643212450](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212450) and ADS latest-release check [40643212443](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212443) passing. Documentation-only status refresh PR #105 later merged at `b0fff8a7af4e8925ecf716b7f1adfe254223be90`, with verify [40645005976](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005976) and ADS check [40645005970](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005970) passing. The later P1 signoff and PR #104 merge supersede the older status snapshot immediately below.

Docs-only PR #106 merged at `d1d39a889531a1642ce5b8360464eca3269aaca9` with same-SHA verify [40645947387](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947387) and ADS check [40645947485](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947485) passing. PR #107 then merged at `9f477396470718579802095f316173cf3cacb900`; post-merge CI [40648304578](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40648304578) and ADS check [40648304569](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40648304569) passed. These are merge-evidence snapshots, not a guarantee of the current `dev` head. P1 implementation/evidence remains based on `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb`; the pending-signoff statements below are historical and are superseded by the Owner's 2026-10-28 acceptance.

**Single work tracker:** [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/) and GitHub Issues remain authoritative. Current Project readback: #37 `Done`, #100 `In Progress`, #51 `Todo`; #47/#48/#49/#50 are `Done`. First P2 issue: [#51](https://github.com/Skyline-Gazer/ALNILAM/issues/51), YAML-only Site v2; planning is ready, code remains unstarted until development authority is established. The refreshed baseline and next-PR handoff are recorded in [#51 comment 6463406977](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6463406977).

Historical pre-PR readback (2026-10-28): `dev` was `489e58096ca416124e9a74e7d11891c5cafc3188`, with docs-only PR #109 checks [40649905042](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40649905042) / [40649905077](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40649905077) passing; `main` was `07fac43cba0c3d303c930c098b6e2124b2c79e4a`. This snapshot predates docs-only PR #110, P1 Owner acceptance, and PR #104's merge. The current P2/T01 baseline and handoff are in [#51 comment 6463406977](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6463406977).

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

