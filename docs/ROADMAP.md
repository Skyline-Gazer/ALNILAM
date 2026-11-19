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
3. **[#138 Deployment split](https://github.com/Skyline-Gazer/ALNILAM/issues/138) + [#88 CMS](https://github.com/Skyline-Gazer/ALNILAM/issues/88)**: Public Demo project `xxxx` remains linked to `dev`; its stable alias returned anonymous HTTP 200 and provenance for Core `a54d386f932fdcfcc1f0c983517e84dfc5dfc26e` / Site digest `527909af24317e93ea7129e89e0da952397b95ac1fdea93bd0646b29e2dfd87f`. Separate `alnilam-production-next` uses `productionBranch=main` with SSO for Production URLs and all Previews; its project alias returns HTTP 404 and its unique Production URL redirects to SSO. The legacy `alnilam-production` project remains paused. No first formal Production release or custom domain is authorized. Keep #138 In Progress; continue #88 only within its offline Pages CMS PoC.
4. **[#69 Music](https://github.com/Skyline-Gazer/ALNILAM/issues/69)**: a post-launch feature, deferred until after the vNext first Production release and separate Owner product acceptance. Roadmap placement or audit inventory does not authorize implementation.
5. **P6 [#42](https://github.com/Skyline-Gazer/ALNILAM/issues/42)**: close remaining relevant release/readiness tasks. **#73 closed 2026-11-16** after PR #156's post-merge Verify proved the current `dev` Demo output and retained browser-evidence artifact; #74, #81 and #35 Owner acceptance remain. Don't restart an unrelated broad UX audit. [#94](https://github.com/Skyline-Gazer/ALNILAM/issues/94) CNB remote Playwright pilot remains optional and must not recreate an obsolete CNB-primary provider/mirror workflow. Formal `main` / Release remains Owner-gated.
6. **FINAL PLANNING DELIVERABLE — [#136 Four-source differentiation audit → Roadmap Next](https://github.com/Skyline-Gazer/ALNILAM/issues/136)**: PR #169 supplies the dated source comparison and next-version proposal based on `dev` snapshot `e1d0174be5cda5996b39fb59737eca55782b5cc2`; its branch is refreshed to current `dev` `a54d386f932fdcfcc1f0c983517e84dfc5dfc26e`, but the source audit was not rerun against that newer code. Issue #136 remains Open / Project #17 `In Progress` pending Owner decision to accept, revise, or decline. No proposed implementation is authorized. Exclude #69 from the pre-launch sequence and retain the existing #88 boundary.

[#89 WordPress/Ghost](https://github.com/Skyline-Gazer/ALNILAM/issues/89) remains an optional post-launch source adapter candidate, not a default requirement; #83 experimental Astro acceleration remains upstream-stability gated.

**[#160 Site-owned static Markdown pages](https://github.com/Skyline-Gazer/ALNILAM/issues/160)** is `Done` in Project #17. PR #161 added optional `content/pages/` Markdown/MDX routes with localization, draft exclusion, translation alternates, and page metadata while keeping Site schema v2 and post archives, taxonomies, and feeds separate; it merged normally at `e8093e132caf3b4296102243aa718e8f20859a4a`. Follow-up [PR #162](https://github.com/Skyline-Gazer/ALNILAM/pull/162) extended the offline Pages CMS PoC to static pages and merged normally at `03341926427bf9a1194ba58e229198944eac2c5d`; final-head Required Verify, paired push Verify, Astro compatibility, and post-merge Verify attempt 2 passed. Hosted CMS access remains separate under #88. See [HANDOFF](HANDOFF.md) for heads, run receipts, and remaining limits.

**[#166 Release Artifact Hygiene Gate](https://github.com/Skyline-Gazer/ALNILAM/issues/166)** is closed and Project #17 is `Done`. PR #171 merged normally to `dev` at `4e0e189453663837054e8134b9a2c196a8b48c6c`; post-merge Verify [44516145869](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44516145869) passed. The gate checks final output in Verify, external-Site CI, GitHub Pages before upload, and `pnpm vercel-build`; the 9/9 artifact-check suite and root/nested output checks passed. No Production release or `main` change was made.


### Long-running maintenance lane (starts independently; never closes with one release)

**[#137 Upstream Watch & Selective Sync](https://github.com/Skyline-Gazer/ALNILAM/issues/137)** is **MANUAL_READY** through `scripts/upstream-watch.mjs` and `docs/upstream-watch/`. It records four-source heads/releases/tags/recent Issues, direct locked dependency candidates, all-lock advisories, and separate `last_seen`, `last_analyzed`, `last_integrated` plus decision records. Weekly/monthly/quarterly reviews remain manual; there is no schedule. Upstream fixes are adapted only for a reproducible ALNILAM defect or measured benefit and still require normal tests/review; major/breaking/UI/features remain Owner decisions.

**[#145 Build Cache](https://github.com/Skyline-Gazer/ALNILAM/issues/145)** remains open; Project #17 shows `In Progress`. P0 cleanup PR #149, shared immutable artifact PR #156, and Astro scratch PR #157 are merged; post-merge Verify [43867996657](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/43867996657) passed 310/310 contract tests. PR #158 remains open to `dev` and is being refreshed to include current `dev` `c6a7606fa4aafa6119660856db573fb606a1503b`. The previous verified head `8309bd55981f14e3c14ed4dfc029e5eafcb3bb91` passed the focused lock suite 7/7, both Required Verify runs [44539657211](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44539657211) and [44539644572](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44539644572), and CodeRabbit; the refreshed branch needs current-head Verify. Vercel Demo and `alnilam-production-next` previews passed; the legacy `alnilam-production` check is blocked while paused and non-required. The retained pre-CAS cache scan and isolated benchmark are recorded in [HANDOFF](HANDOFF.md); the historical 7.2 GiB / 246-bundle cache, matched post-CAS physical savings, working-set calibration, TTL/GC effectiveness, and 70% target remain unverified. No real cache or Site was cleaned or modified.

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

