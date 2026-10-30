# ALNILAM roadmap (Issue-driven)

## Current workflow decision — 2026-10-30

The Owner selected Agent-governed PRs: current CI plus actual CodeBuddy review, followed by an Agent-initiated normal merge. Independent Gatekeeper, fixed Reviewer and CNB Auto Merge prerequisites are canceled; zero-status platform risk remains disclosed. PR #96 merged at 400290acadca8a0417d41792f17fedb842993d1f. See [current decision and native evidence](cnb/CUTOVER-READINESS.md). The checkpoints below retain their historical SHA scope.

The work tracker is [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/) with live Issue state read back before each phase decision. P1 is accepted and #37 is `Done`; CNB cutover #100 remains `In Progress`; P2 #51 is `Todo` and planning-ready, with code unstarted. The P2 handoff is [#51 comment 6463406977](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6463406977). Current CNB development authority and the separate production boundary are recorded in [HANDOFF](HANDOFF.md) and [CNB cutover readiness](cnb/CUTOVER-READINESS.md).

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

