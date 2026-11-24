# ALNILAM roadmap (Issue-driven)

## Navigation context policy — 2026-11-24

[#204](https://github.com/Skyline-Gazer/ALNILAM/issues/204) replaces the global-default taxonomy strip
with a declared page capability: the category bar renders only for `home` and `post`, the article
tag widget only for `home`, `post`, `archive`, `categories` and `tags`, Profile stays site identity,
and every other capability is excluded — series, module pages, static Site pages and the `notFound`
404 page opt in to nothing — while a route that declares no capability at all, such as search,
inherits nothing either. Excluded or undeclared, both mean off, so a new route cannot leak article
taxonomy by accident. Implemented in [#213](https://github.com/Skyline-Gazer/ALNILAM/pull/213) (not merged, Owner
authorization required). The visibility matrix is documented in
[docs/ARCHITECTURE.md](ARCHITECTURE.md#navigation-context-policy-issue-204).

## Web engineering capability pilot — #209

Use the optional [Web Evidence Skill](../.agents/skills/alnilam-web-evidence/SKILL.md) for browser audits, timing comparisons and flaky UI scenarios. [#209](https://github.com/Skyline-Gazer/ALNILAM/issues/209) tracks the pilot and its disposition after the next 3–5 naturally completed frontend deliveries. [#148](https://github.com/Skyline-Gazer/ALNILAM/issues/148) tracks the existing Learning Loop independently.

## Foundation v0.2.0 released — 2026-11-20

Foundation is published from `main` at `e8239cf4f2272c7cb9429f8c740aa6677f9ed040`
with annotated tag `v0.2.0` and
[GitHub Release](https://github.com/Skyline-Gazer/ALNILAM/releases/tag/v0.2.0). The
release commit passed Required Verify
[44677251989](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44677251989) on
`main`; the tagged asset was rebuilt twice from that commit and byte-compared
before publication.

The release keeps the `v0.2.0` scope frozen in the section below. Post-release
work is stabilization only: patch releases for confirmed defects, the deferred
manual and field acceptance items, and the recorded notice/provenance follow-ups.
New product scope remains with [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136)
and the Owner.

During stabilization no new feature work starts: Music (#69), hosted CMS
(#88), additional content adapters (#89), a Shirone major-version migration and
experimental Astro acceleration stay outside this release. The merged offline
Pages CMS PoC remains available as-is and is not an active workstream. Any new
scope needs a fresh Owner decision under [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136).

Open acceptance at publication, approved by the Owner as post-release work:
[#35](https://github.com/Skyline-Gazer/ALNILAM/issues/35) product/visual sign-off,
[#74](https://github.com/Skyline-Gazer/ALNILAM/issues/74) field p75 and manual
Safari/VoiceOver, and [#81](https://github.com/Skyline-Gazer/ALNILAM/issues/81)
reviewed real-user onboarding from an independently owned Site. They are
**NOT VERIFIED** or **MANUAL_NOT_RUN**, never PASS. The public Demo remains on
`dev`; public Production promotion is a separate Owner action.

The public Demo at Core `ad8e28c1cfe82724f45d0715265936de2d7ec9e8` passed the
live PhotoSwipe focus check ([#184](https://github.com/Skyline-Gazer/ALNILAM/issues/184)).
Desktop search obscures part of primary navigation on that deployment
([#189](https://github.com/Skyline-Gazer/ALNILAM/issues/189)). Demo acceptance and
the Owner's [#35](https://github.com/Skyline-Gazer/ALNILAM/issues/35) sign-off remain
open. See [Handoff](HANDOFF.md) for deployment and Verify links.

## Foundation GA scope freeze — 2026-11-20

Foundation targets `v0.2.0`. The release includes the existing Shirone-based
blog, the YAML-only Site schema v2, Markdown/MDX posts and pages, search, i18n,
SEO, root and nested builds, and the existing opt-in Gallery, Moments,
Comments, Bangumi and LLM discovery modules. The Core/Site contract and
upgrade/rollback guidance are release requirements.

Only fixes for release blockers are in scope until GA. [#42](https://github.com/Skyline-Gazer/ALNILAM/issues/42) tracks the release gate, including the applicable [#74](https://github.com/Skyline-Gazer/ALNILAM/issues/74) field and manual accessibility evidence, [#81](https://github.com/Skyline-Gazer/ALNILAM/issues/81) independent Site onboarding, [#35](https://github.com/Skyline-Gazer/ALNILAM/issues/35) product sign-off, and [#147](https://github.com/Skyline-Gazer/ALNILAM/issues/147) obligations for distributed materials. Keep unmet requirements open pending evidence or an explicit Owner change to the acceptance contract. First public Production deployment requires separate authorization under [#138](https://github.com/Skyline-Gazer/ALNILAM/issues/138).

After the GitHub release, prioritize stability and patch releases. Music,
hosted CMS, additional content adapters, a Shirone major-version migration and
experimental Astro acceleration remain outside Foundation. The offline Pages
CMS PoC remains optional. Upstream watch and cache working-set calibration
continue separately. [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136) holds the next-version proposal for a separate Owner decision.

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
3. **[#138 Deployment split](https://github.com/Skyline-Gazer/ALNILAM/issues/138) + [#88 CMS](https://github.com/Skyline-Gazer/ALNILAM/issues/88)**: The Vercel Demo project `xxxx` remains linked to GitHub `dev`. On 2026-11-21, exact `dev` SHA `fd64c5decc49d56de91a7810d0951abdace4cb03` was deployed as `dpl_GzyqkyquuXH8sgauKA6NTAUAVQyX`, READY at the stable Demo alias; public provenance matches that Core SHA and Site digest `1761ca3abb68de22ddffc157b1763b20dd847ffa0fb9b9bfedb56d9f1d65c4db`. This was a Demo-only deployment; it was not a formal Production deployment or release. The prior READY deployment `dpl_Boj4fvzMayQuUXUu9F5RLYL4hKxf` remains available for rollback. The separate `alnilam-production-next` project retains its pre-existing SSO-gated Production-target deployment on `main`; pushing this PR branch triggered only Preview deployments `dpl_DrKciigUV3Vjj67SF2GfcieHQwoC` (Demo) and `dpl_5pzTaTynYDboyCCy7Ay5h3uKAgW9` (`alnilam-production-next`), not a new Production-target deployment. No Vercel configuration or domain changed. Keep #138 In Progress while the historical dev-to-Production anomaly remains unexplained and first formal Production release/custom-domain activation remain Owner-gated. Continue #88 only within its offline Pages CMS PoC.
4. **[#69 Music](https://github.com/Skyline-Gazer/ALNILAM/issues/69)**: a post-launch feature, deferred until after the vNext first Production release and separate Owner product acceptance. Roadmap placement or audit inventory does not authorize implementation.
5. **P6 [#42](https://github.com/Skyline-Gazer/ALNILAM/issues/42)**: close remaining relevant release/readiness tasks. **#73 is closed** after PR #156's post-merge Verify proved the current `dev` Demo output and retained browser-evidence artifact; #166 is Done after PR #171. #74 remains In Progress because field p75 is **NOT VERIFIED** and manual Safari/VoiceOver is **MANUAL_NOT_RUN**; #81 remains In Progress after PR #165 because real-user onboarding from an independently owned Site is unverified; #35 remains Owner-pending product/visual acceptance. Don't restart an unrelated broad UX audit. [#94](https://github.com/Skyline-Gazer/ALNILAM/issues/94) CNB remote Playwright pilot remains optional and must not recreate an obsolete CNB-primary provider/mirror workflow. Formal `main` / Release remains Owner-gated.
6. **FINAL PLANNING DELIVERABLE — [#136 Four-source differentiation audit → Roadmap Next](https://github.com/Skyline-Gazer/ALNILAM/issues/136)**: PR #169 merged normally to `dev` at `2c1939012c32facf59eb5753948cf2bcc6a4074e`, carrying the dated source comparison and next-version proposal based on snapshot `e1d0174be5cda5996b39fb59737eca55782b5cc2`. The source audit was not rerun against the pre-handoff GitHub `dev` base `6b26bdacf0dcaaf47dc29c947fa5579f91e38668`. Issue #136 remains Open / Project #17 `In Progress` pending Owner accept/revise/decline; no proposed implementation is authorized. Exclude #69 from the pre-launch sequence and retain the existing #88 boundary.

[#89 WordPress/Ghost](https://github.com/Skyline-Gazer/ALNILAM/issues/89) remains an optional post-launch source adapter candidate, not a default requirement; #83 experimental Astro acceleration remains upstream-stability gated.

**[#160 Site-owned static Markdown pages](https://github.com/Skyline-Gazer/ALNILAM/issues/160)** is `Done` in Project #17. PR #161 added optional `content/pages/` Markdown/MDX routes with localization, draft exclusion, translation alternates, and page metadata while keeping Site schema v2 and post archives, taxonomies, and feeds separate; it merged normally at `e8093e132caf3b4296102243aa718e8f20859a4a`. Follow-up [PR #162](https://github.com/Skyline-Gazer/ALNILAM/pull/162) extended the offline Pages CMS PoC to static pages and merged normally at `03341926427bf9a1194ba58e229198944eac2c5d`; final-head Required Verify, paired push Verify, Astro compatibility, and post-merge Verify attempt 2 passed. Hosted CMS access remains separate under #88. See [HANDOFF](HANDOFF.md) for heads, run receipts, and remaining limits.

**[#166 Release Artifact Hygiene Gate](https://github.com/Skyline-Gazer/ALNILAM/issues/166)** is closed and Project #17 is `Done`. PR #171 merged normally to `dev` at `4e0e189453663837054e8134b9a2c196a8b48c6c`; post-merge Verify [44516145869](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44516145869) passed. The gate checks final output in Verify, external-Site CI, GitHub Pages before upload, and `pnpm vercel-build`; the 9/9 artifact-check suite and root/nested output checks passed. No Production release or `main` change was made.

**[#147 Repository credits, attribution and license notices](https://github.com/Skyline-Gazer/ALNILAM/issues/147)** remains Open / Project #17 `In Progress`. PR #172 added canonical notice distribution to the Vercel Demo; PR #173 extends its direct-runtime notice coverage with MIT texts for Svelte, Pagefind, PhotoSwipe and KaTeX plus the SIL OFL 1.1 notice for all 12 KaTeX font families. The 2026-11-21 Demo deployment exposes four canonical notice files at `/site-assets/alnilam-notices/` and 15 license texts under `/site-assets/alnilam-notices/LICENSES/`; all 19 URLs returned HTTP 200 and byte-matched their sources. `/credits/`, `/licenses/`, and `/alnilam-notices/` remain 404, with no Credits/Licenses route or navigation/footer link. Issue #147 continues to prohibit any ALNILAM Credits/Licenses page, route, component, navigation/footer link, or Site-template injection. The transitive dependency/source-license inventory, current-tree credential review, and historical raster rights remain incomplete. Keep the Issue open.


### Long-running maintenance lane (starts independently; never closes with one release)

**[#137 Upstream Watch & Selective Sync](https://github.com/Skyline-Gazer/ALNILAM/issues/137)** is **MANUAL_READY** through `scripts/upstream-watch.mjs` and `docs/upstream-watch/`. It records four-source heads/releases/tags/recent Issues, direct locked dependency candidates, all-lock advisories, and separate `last_seen`, `last_analyzed`, `last_integrated` plus decision records. Weekly/monthly/quarterly reviews remain manual; there is no schedule. Upstream fixes are adapted only for a reproducible ALNILAM defect or measured benefit and still require normal tests/review; major/breaking/UI/features remain Owner decisions.

**[#145 Build Cache](https://github.com/Skyline-Gazer/ALNILAM/issues/145)** remains Open / Project #17 `In Progress`. P0 cleanup PR #149, immutable artifact reuse PR #156, Astro scratch serialization PR #157, and lock-race PR #158 are merged; PR #158's focused lock suite passed 7/7 and both Required Verify runs [44566598039](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44566598039) and [44566580992](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44566580992) passed. The last verified `dev` Verify before this handoff was [44594781749](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/44594781749) on base `6b26bdacf0dcaaf47dc29c947fa5579f91e38668`. The matched six-Site scratch workload reduced allocated cache bytes from 188,866,560 to 46,129,152 (75.58%), removed 142,588,750 duplicate bundle logical bytes, and showed cold 23.40/23.42 s and warm medians 22.53/21.40 s; fixed-order timings are not a causal speed claim. The historical 7.2 GiB / 246-key cache, post-CAS savings on that cache, effective working-set calibration, and 70% target remain unverified; 14-day / 2 GiB GC defaults remain uncalibrated. No real cache or Site was cleaned. See [HANDOFF](HANDOFF.md) and [the matched Issue #145 evidence](https://github.com/Skyline-Gazer/ALNILAM/issues/145#issuecomment-7021931966).

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

