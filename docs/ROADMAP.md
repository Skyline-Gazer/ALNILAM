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

### Product scope update — 2026-11-13

Owner authorization on [Issue #67](https://github.com/Skyline-Gazer/ALNILAM/issues/67#issuecomment-6854542688) reopens Gallery/Album for scoped engineering on GitHub `dev` before vNext launch. #35 and unfinished P6 work are not engineering prerequisites. Gallery remains Site-owned, optional and default OFF; this does not grant formal release acceptance. #68, #69, #88 and #89 remain outside this authorization. See the [decision addendum](next/08-G0-F-DECISION.md).

## Owner direction — 2026-11-14 · Finish current Roadmap, then audit; maintain upstream continuously

**Product constitution:** ALNILAM is **Shirone-first, not Shirone-only**. Shirone remains the **single frontend foundation**; ALNILAM keeps its own Git history and independent, immutable Core/Site contract. Firefly, Mizuki and KIRARI are *selective* capability/engineering sources. A four-source inventory or comparison does not establish that each feature was actually integrated. Do not introduce four competing themes, routers or content pipelines.

### Current product / delivery lane

The following is **execution order and scope**, not blanket authorization for every candidate. Follow the newest Issue-specific Owner decisions, verified GitHub `dev` and actual CI/Preview:

1. **#67 Gallery**: implementation delivered via GitHub PR #134 (merged to `dev`); Owner final product acceptance is separate.
2. **#68 Moments**: Owner authorized implementation in [#68 comment](https://github.com/Skyline-Gazer/ALNILAM/issues/68#issuecomment-6859734794); GitHub PR #135 merged to `dev`. Verify post-merge Demo/provenance and retain formal product sign-off boundary.
3. **[#138 Deployment split](https://github.com/Skyline-Gazer/ALNILAM/issues/138) + [#88 CMS](https://github.com/Skyline-Gazer/ALNILAM/issues/88)**: #138 is open again. Although the API reports `alnilam-production` `productionBranch=main`, Vercel created a `target=production` deployment from `dev` SHA `113ab9c7a9e6fbb38c75e808c7f94e6095244564`. The new project is paused (generated Production URL returns 503; Preview requires SSO); the existing public Demo remains available on `dev`. Confirm or correct Production → Branch Tracking in the official Dashboard before unpausing. The first formal `main` deployment and custom external-domain activation remain Owner-accepted release actions. Continue #88 using the validated offline Pages CMS PoC; hosted CMS/App-permission or content-write integration requires its own explicit scope/permission decision. Environment separation must not become a new global blocker.
4. **[#69 Music](https://github.com/Skyline-Gazer/ALNILAM/issues/69)**: next optional feature candidate, **still deferred pending distinct Owner authorization**; do not silently treat roadmap ordering as approval.
5. **P6 [#42](https://github.com/Skyline-Gazer/ALNILAM/issues/42)**: close genuinely remaining relevant release/readiness tasks (including #73, #74, #81 and #35 Owner acceptance) using existing evidence; don't restart an unrelated broad UX audit. [#94](https://github.com/Skyline-Gazer/ALNILAM/issues/94) CNB remote Playwright pilot is optional and must not recreate an obsolete CNB-primary provider/mirror workflow. Formal `main` / Release remains Owner-gated.
6. **FINAL PLANNING DELIVERABLE — [#136 Four-source differentiation audit → Roadmap Next](https://github.com/Skyline-Gazer/ALNILAM/issues/136)**: **after the current authorized Roadmap**, perform a complete source/behavior-level Shirone / Firefly / Mizuki / KIRARI comparison with actual current ALNILAM code; identify missing high-value differentiators, duplicates, compatibility and measured gains, and draft the *next version* Roadmap as atomic Issues for Owner approval. Reuse historical #44/#80/RDR rather than pretending they prove current integration. **This audit is not a prerequisite or blocker for current product PRs or the present release.**

[#89 WordPress/Ghost](https://github.com/Skyline-Gazer/ALNILAM/issues/89) remains an optional post-launch source adapter candidate, not a default requirement; #83 experimental Astro acceleration remains upstream-stability gated.

### Long-running maintenance lane (starts independently; never closes with one release)

**[#137 Upstream Watch & Selective Sync](https://github.com/Skyline-Gazer/ALNILAM/issues/137)** is **MANUAL_READY** through `scripts/upstream-watch.mjs` and `docs/upstream-watch/`. It records four-source heads/releases/tags/recent Issues, direct locked dependency candidates, all-lock advisories, and separate `last_seen`, `last_analyzed`, `last_integrated` plus decision records. Weekly/monthly/quarterly reviews remain manual; there is no schedule. Upstream fixes are adapted only for a reproducible ALNILAM defect or measured benefit and still require normal tests/review; major/breaking/UI/features remain Owner decisions.

The vendored Shirone source is pinned in `themes/shirone/upstream/SOURCE.json` to `55a84b23…` (that upstream revision declares **1.0.6**); on 2026-11-14 the upstream `main` package declared **2.0.0**. These are source-version facts, **not** evidence of an ALNILAM package version nor authorization to mass-upgrade or reintroduce removed Fancyapps. Always re-read moving upstream heads when doing maintenance.

**Scheduling boundary:** GitHub Actions `schedule` executes from the repository default branch (currently `main`). Initial issue/planning/manual read-only work can proceed on `dev`. Do not write a new scheduled workflow to protected `main` or claim `SCHEDULED_ACTIVE` until an explicitly authorized read-only scheduler mechanism is actually deployed and verified. This does **not** block ordinary `dev` development.

Source of detailed audit / maintenance requirements: the linked Issues. GitHub Project #17 should link these tasks when native Project V2 editing is available; an Issue URL alone does not prove Project item membership.

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

