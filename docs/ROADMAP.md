# ALNILAM roadmap (Issue-driven)

## Current workflow decision — 2026-11-13

GitHub is the development authority. Use ordinary Issue-linked PRs to GitHub
`dev` and the existing Actions `verify` check. CNB `dev` is frozen at
`9916a0c4984f8e9d762f59247cf923f0fd7f0071`; do not use it for new work or start
a recurring mirror. `main`, production, tags and protection changes retain their
separate Owner authorization. Follow [AGENTS.md](../AGENTS.md) and [HANDOFF](HANDOFF.md)
for exact live refs, CI evidence and the Vercel state.

GitHub Project #17 remains the live work tracker. Read its state and the linked
Issues before choosing work. Historical status and cutover decisions below remain
records of their original dates; they do not override this current authority.

## Historical v0.1.x phase sketch

The P0–P4 sketch below is historical, not the current Issue phase numbering or completion state. Current planning is [ALNILAM Next](next/00-PLAN.md); live Issues and the current handoff take precedence. Gallery/music decisions, provider and optional-audit rules below must not override newer Owner decisions.

### P0 · Bootstrap & Core/Site
- Initial Monorepo, ADS v0.3 submodule, docs, Astro + Svelte + Tailwind baseline.
- External Site composition, config schema, non-mutation checks, separately reproducible Core/Site inputs.
- CI green, lockfile committed and frozen, content fixtures with upgrades/rollback and path/security tests.
- Complete platform README, developer and user setup, and branch governance.

### P1 · Editorial design
- Brand visual system based on SHBlog Next editorial aesthetics (original implementation).
- Fuwari single-row post list; rich article typography and consistent mobile layout.
- Real dark/light theming, navigation, accessible interactive states and visual regression.
- No unnecessary client JS; reduced-motion and keyboard accessibility.

### P2 · Blogging essentials
- Content schema versioning, archives, tags, categories, Pagefind local search.
- RSS, sitemap, SEO metadata, social preview, i18n and image pipeline.
- Upgrade tests using fixed old Site fixtures, deployment guides for static hosts.

### P3 · Optional advanced features
- **Shipped (v0.1.x)**: comments (giscus, feature-flagged), Bangumi collections (build-time fetch, static output).
- **Declined by owner decision (2026-10-25)**: gallery/album, moments/dynamics, music player — will not be built unless the owner reopens them.
- Standing discipline: no disabled-module network calls or unused runtime bundles (enforced); per-file upstream provenance audit before any copied code/assets are accepted.

### P4 · Release readiness
- Deterministic locked CI build, test matrix, security audit, end-to-end mobile desktop checks.
- External Site onboarding example, maintainer docs, changelog and first stable tagged release.
- Native hosting provider deployment only when owner authorizes production cutover.

**Current acceptance discipline:** Close Issues only for proven requirements, with source SHA and the relevant actual primary-provider CI/browser evidence. Project state is read from the live API; unavailable evidence remains explicitly unverified.

