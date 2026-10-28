# ALNILAM roadmap (Issue-driven)

The historical v0.1.x roadmap below is preserved as traceability, not the Next P1/P2 scope authority. Owner-approved Plan/Spec [G0-F](next/08-G0-F-DECISION.md) uses **Shirone-first**, retained Core/Site and Git history, and incremental PR work. PRs #95/#97/#98/#99/#101/#102/#103 are merged to protected GitHub `dev`; #101 adds ADS v0.4.2 and a dispatch-only Pages workflow on `dev`. The P1 implementation/evidence baseline is `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb` with same-SHA verify [40643212450](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212450) and ADS latest-release check [40643212443](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212443) passing. Documentation-only status refresh PR #105 later merged at `b0fff8a7af4e8925ecf716b7f1adfe254223be90`, with verify [40645005976](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005976) and ADS check [40645005970](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005970) passing. P1 is `P1_ACCEPTANCE_READY / OWNER_PHASE_SIGNOFF_PENDING`. Main Pages guard proposal #104 is open and not yet effective on `main`. The integrated gate and its limits are in [the P1 evidence ledger](p1/P1-EXIT-GATE.md) and [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37).

Current GitHub `dev` is `d1d39a889531a1642ce5b8360464eca3269aaca9` after documentation-only PR #106; same-SHA verify [40645947387](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947387) and ADS latest-release check [40645947485](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947485) pass. P1 implementation/evidence remains based on `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb`; #37 still awaits Owner signoff.

**Single work tracker:** [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/) and GitHub Issues remain authoritative after CNB code-primary cutover. Project V2 state was read back: #37 `In Progress`; #47/#48/#49/#50/#79 `Done`; #100 `In Progress`; #38/#51 `Todo`. First P2 issue: [#51](https://github.com/Skyline-Gazer/ALNILAM/issues/51), YAML-only Site v2; planning is ready, code remains unstarted until P1 signoff and development authority are established. The refreshed baseline and next-PR handoff are recorded in [#51 comment 6462317108](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6462317108).

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

