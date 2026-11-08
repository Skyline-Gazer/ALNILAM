# ALNILAM roadmap (Issue-driven)

## Current workflow decision — 2026-11-03 (historical tip; see HANDOFF)

CNB is the development authority. Follow [AGENTS.md](../AGENTS.md) and the Owner's 2026-11-02 override: use ordinary Issue-linked PRs or already-authorized non-force dev integration, proportionate functional checks and material CodeBuddy feedback. Honor actually configured required checks; do not invent PASS or add Gatekeeper/extra-reviewer prerequisites. Main, mirror writes, tags/releases, production and ADS upstream remain separately authorized. Historical cutover decisions remain in [the cutover record](cnb/CUTOVER-READINESS.md).

The work tracker is [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/), read live before each phase decision. The 2026-11-03 correction text that reopened P1/P3 Issues and described CNB PR #47 as unmerged is **historical** and must not be read as live completion state. Exact refs, open Issues, CI evidence and next steps live in [HANDOFF](HANDOFF.md); older planning/status text is not current completion evidence.

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

