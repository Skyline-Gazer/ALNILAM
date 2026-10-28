# ALNILAM roadmap (Issue-driven)

The historical v0.1.x roadmap below is preserved as traceability, not the Next P1/P2 scope authority. Owner-approved Plan/Spec [G0-F](next/08-G0-F-DECISION.md) uses **Shirone-first**, retained Core/Site and Git history, and incremental PR work. PRs #95/#97/#98/#99 are merged to protected GitHub `dev`; #101 adds ADS v0.4.2 and a dispatch-only Pages workflow on `dev`. P1 is `P1_ACCEPTANCE_READY / OWNER_PHASE_SIGNOFF_PENDING` at `dev` `faf2f08a7d47ab0202cf69e6069ef5c37b1ae824`; the integrated gate and its limits are in [the P1 evidence ledger](p1/P1-EXIT-GATE.md) and [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37).

**Single work tracker:** [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/) and GitHub Issues remain authoritative after CNB code-primary cutover. Project V2 state was read back: #37 `In Progress`; #47/#48/#49/#50/#79 `Done`; #100 `In Progress`; #38/#51 `Todo`. First P2 issue: [#51](https://github.com/Skyline-Gazer/ALNILAM/issues/51), YAML-only Site v2; planning is ready, code remains unstarted until P1 signoff and development authority are established.

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

