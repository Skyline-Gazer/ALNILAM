# ALNILAM Next — Reuse-first migration and document governance

> **G0-F APPROVED normative annex** · 2026-10-26 · Owner [decision](08-G0-F-DECISION.md). There is exactly one new product foundation: **Shirone**. Existing functional ALNILAM infrastructure **must be reused unless an evidence-backed incompatibility requires adaptation or retirement**. Neither Shirone migration nor ADS v0.4.1 licenses a rewrite from scratch. Current release v0.1.3 remains unchanged until a separately approved release.

## A. Architecture source of truth

1. **Shirone (LyraVoid/Shirone)** is the sole baseline for pages/layout/main frontend components and bundled working blog capabilities. Establish its pinned upstream unmodified baseline before integrations.
2. **ALNILAM existing repository (Skyline-Gazer/ALNILAM)** is the retained platform/codebase of record. Keep its Git history, release tags, Project #17, protected dev/main workflow, immutable Site builder/validation, test corpus and release documentation. **Migrate incrementally inside the existing monorepo**, not `git init`, mass-file deletion, a new repository or a wholesale switch to Shirone's own Git history.
3. **KIRARI** is the pinned source reference for specific missing engineering mechanisms (Site v2 schema, i18n taxonomy pages, LLMs v2) only if ALNILAM's existing mechanism cannot satisfy the contract.
4. **Firefly/Mizuki** are sources for differentiated UX/functions only; never merge whole-theme routing/CSS/JS/component systems as second or third main application.
5. **Astro official APIs first** where a stable API already solves standard work. Official framework primitives supplement the Shirone product base; they do not authorize rewriting the entire existing ALNILAM platform.
6. **Preserve behavior by default**. Source deletion requires independent functional equivalence/feature regression tests, a smaller/more-maintainable replacement, a file-by-file diff and an explicit PR rationale/rollback.

## B. Verified existing ALNILAM areas (inventory seed, not completed source audit)

Verified from `dev` tree at `5fd74cea8197dc91d8391e7ee677eacbc32d3234`. This is not proof every piece already works against Shirone. Audit and run tests before selection.

| Existing area | File/path evidence | Default migration choice and rationale |
| --- | --- | --- |
| Immutable external Site composition | `scripts/compose.mjs` | **KEEP/ADAPT**: Site hash before/after, staged output and provenance; do not substitute Shirone sync blindly. |
| Site schema v1 and config validation | `scripts/site-contract.mjs`, `packages/core/src/index.mjs` | **KEEP/ADAPT**: existing frozen Site v1 consumer compatibility, use stable Astro Content Layer loaders as implementation enhancement. |
| Two-version upgrade/rollback | `scripts/upgrade-check.mjs` | **KEEP** automated old/new Core same-Site evidence. |
| HTML/image/island/provenance-shape checks | `scripts/artifact-check.mjs` | **KEEP/EXTEND** with multilingual taxonomy, llms v2 and nested-path crawl. |
| Existing contract tests | `scripts/tests/contract.test.mjs` | **KEEP** and expand; proof of migration is old+new fixtures passing. |
| Search + comments | `packages/ui/src/Search.svelte`, `packages/ui/src/Comments.svelte` | **COMPARE/ADAPT** against Shirone's existing UI modules; reuse tested Pagefind/feature gate behavior instead of recreating search and comments. Exactly one production implementation each. |
| Build-time Bangumi | `apps/web/src/lib/bangumi.mjs`, `apps/web/src/pages/opt/bangumi.astro` | **COMPARE/REUSE** verified static data behavior, provider fallback and optional route gate; dedicated Bangumi/provider tests are absent from the current contract suite; integrate with Shirone UI rather than duplicate provider fetches. |
| Existing i18n and publishing routes | `apps/web/src/lib/i18n.mjs`, `apps/web/src/pages/posts/`, `tags/`, `rss.xml.js`, `sitemap.xml.js`, `robots.txt.js` | **ADAPT** into Astro-native i18n/official RSS/sitemap with regression evidence; retain behavior and compatibility even if file-level implementation is replaced. |
| Existing Editorial UI/PostCard | `themes/editorial/src/PostCard.astro`, `BaseLayout.astro`, `editorial.css` | **VISUAL REFERENCE/SELECTIVE REUSE** for agreed Fuwari single-row layout and branding. Do not run Editorial as competing full frontend after Shirone migration; copy proven behavior then only retire redundant code with tests. |
| Existing CI / deploy | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | **KEEP** and increment. Production deploy remains gated; do not replace working Actions with a new platform without benefit. |
| Existing Site fixtures/config/documentation | `sites/demo/`, `docs/SITE_ONBOARDING.md`, `docs/ARCHITECTURE.md`, `docs/MAINTAINERS.md` | **KEEP** as regression fixtures and historical contract evidence. No content deletion; version/migrate documents to match new architecture. |
| ADS Git submodule | `.ads`, `.gitmodules`, root `AGENTS.md` | Exact v0.4.1 pin merged via PR #84; retain ADS consumer preflight and dev-only tooling boundary. Preserve public CI no-private-ADS dependency. |
| Release, license, history | `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`, tags | **KEEP/UPDATE** attribution as code origins change; never reset repository history or relicense current ALNILAM simply because ADS or Shirone license differs. |

## C. Required Reuse Decision Record (RDR)

For every nontrivial change that removes or rewrites existing ALNILAM code, the implementing Issue/PR MUST include:

- **Legacy area / exact tree SHA / previous behavior** and linked contract test(s).
- **Shirone baseline equivalent** (exact upstream SHA/path); Firefly/KIRARI/Mizuki only if genuine missing behavior.
- **Astro official API feasibility**.
- **Decision**: `KEEP`, `ADAPT`, `WRAP`, `REPLACE`, `RETIRE`; default is `KEEP/ADAPT` without contradictory evidence.
- **Reason**: incompatible API, duplication, security, performance, maintainability or feature gap; *"cleaner to rewrite"* alone is insufficient.
- **Proof**: old scenario failing/passing in migration, Site v1 compatibility, output comparison and browser results as relevant.
- **Docs and rollback**: new owners, migration notes, restore source path/commit, and when the old path may be removed.

**Avoid bulk import/rewrite PRs without stepwise diff review.** Preserve old tests in a compatibility suite until equivalent or stronger tests pass. Ideally PRs target a single component/contract, not a mass delete. Never use code deletion as progress metric.

## D. Document governance — single source of truth, owners and timing

The repository Owner owns product/normative decisions, ADR and Spec acceptance, and release/deployment authorization. The change maintainer owns accuracy of directly affected docs, examples, and tests in the same PR. These are role owners; no personal names are assigned here, and delegation of named people remains an Owner decision. Each artifact version is its Git revision; historical receipts retain their source SHA and date.

| Artifact | Decision owner | Maintenance owner | Required update trigger |
| --- | --- | --- | --- |
| [Plan](00-PLAN.md) | Repository Owner approves product scope and risks | Change maintainer updates affected planning links | Product direction or scope changes |
| [Spec](01-SPEC.md) and normative annexes | Repository Owner approves normative behavior | Change maintainer updates impacted requirements and evidence | Before affected work enters Ready |
| [ADRs](../adr/) | Repository Owner approves decisions and status | Decision author / maintainer records alternatives, consequences and links | Framework/API/source or compatibility decisions |
| [AGENTS](../../AGENTS.md) | Repository Owner | Repository maintainer | Agent governance or tooling changes |
| [README](../../README.md), [PRODUCT](../PRODUCT.md), [ARCHITECTURE](../ARCHITECTURE.md) | Repository Owner owns product claims | Change maintainer aligns shipped behavior with source | Product behavior or build interfaces change |
| [CONTRIBUTING](../../CONTRIBUTING.md) | Repository Owner controls authorization and project policy | Contributors and change maintainers follow shared branch, test, Site, and licensing rules | Contributor process or repository policy changes |
| [Site onboarding](../SITE_ONBOARDING.md), [Site contract](../../scripts/site-contract.mjs), [composition CLI](../../scripts/compose.mjs) | Maintainer owns executable contract; Owner approves material Site-boundary changes | Source change owner updates docs and tests together | Schema, CLI, configuration or content layout changes |
| [ROADMAP](../ROADMAP.md), [PROJECT_TRACKING](../PROJECT_TRACKING.md) | Repository Owner owns scope; live Project readback owns status claims | Issue/PR owner records evidence and current links | Scope or status changes |
| [HANDOFF](../HANDOFF.md), [release procedure](../MAINTAINERS.md#release-procedure-vxyz) | Repository Owner owns authorization boundaries; maintainer owns evidence | Integrator records verified refs, CI and deployment evidence | Handoff, release or operational procedure changes |
| [CHANGELOG](../../CHANGELOG.md), [NOTICE](../../NOTICE), [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md), [CREDITS](../../CREDITS.md), [LICENSES](../../LICENSES/) | Repository Owner approves licensing/attribution decisions; no product Credits page is permitted | Maintainer updates repository-level notices and provenance | Release, copied source/assets or license changes |
| [Traceability](03-TRACEABILITY.md) and task Issues | Repository Owner approves requirement mapping | Issue/PR owner links real PR, commit and CI/browser evidence | Every task or Phase gate |

The existing [Markdown link test](../../scripts/tests/docs_test.py) checks tracked Markdown relative targets and includes a deliberate missing-link negative fixture; this PR also rejects duplicate ADR identifiers. GitHub Actions `verify` runs these tests on pull requests, while `.cnb.yml` retains a separate candidate under the frozen CNB workflow. `pnpm test` and build checks exercise executable Site contracts and fixtures, but do not prove every normative example or feature claim. No Markdown frontmatter convention or dedicated style checker exists; external anchors and claims still need review. Keep the checks narrow rather than adding an unmaintained docs framework.
Independent Site onboarding remains unverified: GitHub CI copies `sites/demo`, and the CNB script fetches a pinned test fixture. Neither is a real independently owned user Site. `docs/SITE_ONBOARDING.md` records that real use has not been exercised; closure requires review and regression evidence from an independent Site owner.

ADR identifiers are unique and traceable: [0001](../adr/0001-shirone-core-site.md) records Shirone and retained ALNILAM; [0002](../adr/0002-native-mpa-and-pagefind-lifecycle.md) records native MPA/Pagefind and is accepted through PR #97; [0003](../adr/0003-vnext-yaml-requirement-delta.md) records the implemented YAML-only Site v2 decision; [0004](../adr/0004-site-locale-taxonomy-seo.md) records locale/taxonomy/SEO rationale against the single normative [04 contract](04-ROUTING-SEO-LLMS-V2.md); [0005](../adr/0005-optional-integrations-disabled-by-default.md) records the optional-module boundary; [0006](../adr/0006-ads-consumer-pin.md) records the current ADS consumer pin. Target requirements remain distinct from implementation evidence. Current ADS policy lives in [AGENTS.md](../../AGENTS.md) and [ads-pin.txt](../../ads-pin.txt); current task-to-run proof belongs in HANDOFF and linked Issues, not this inventory.

### Governance rules

1. **Version and ownership labels** on docs: `DRAFT`, `FROZEN SPEC`, `IMPLEMENTED`, `HISTORICAL`; distinguish which Git SHA/release a claim refers to. Do not silently replace documented v0.1.3 reality with unshipped vNext.
2. **Docs-as-code per PR**: implementation PRs update relevant `PRODUCT/ARCHITECTURE/SITE_ONBOARDING/README/CHANGELOG/NOTICE` when they change behavior. A separate docs-only deferred PR is not a substitute for accuracy.
3. **Review gate for Spec/ADR change**: note original requirement, scope impact, compatible Site version, alternatives, owner decision date/link. Phase acceptance checks requirement IDs against actual browser and CI evidence.
4. **History preservation**: archive or label obsolete docs as historical and link replacements; do not delete older decisions and evidence without a migration reference.
5. **Automated integrity**: relative links, broken refs, frontmatter validity, code examples, feature matrix contradictions, ADS tag/gitlink mismatch and package/version claims should have CI checks where verifiable. Avoid huge new documentation toolchains.
6. **No duplicate trackers**: GitHub Project #17 remains tracker, native Milestones/Phase parent/subissues; Markdown is source documentation, not an invented parallel status database.
7. **Before Agent execution**: all required accounts, external Site credentials, service provider config and permissions are collected **up front**; optional provider gaps cannot block independent feature work. Never ask for private access just to validate public CI.

## E. ADS v0.4.1 adoption and current consumer pin
- **Current ALNILAM consumer pin:** `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` on ADS `cnb/dev`, a development line rather than a release tag. `AGENTS.md` and `ads-pin.txt` are current policy; optional CodeGraph/RTK and strict profiles are not enabled.

- Verified upstream release [ADS v0.4.1](https://github.com/Skyline-Gazer/ADS/releases/tag/v0.4.1), **commit SHA `3abf6025657a5d716476029cc8cbf5239543210b`**; annotated tag object `e38d01ff176448a13180afe2419c1c9c94a6ab43` is not the gitlink.
- ALNILAM's `dev` gitlink was `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac` (v0.3) before adoption; PR #84 recorded the historical move to v0.4.1. That historical adoption does not describe the current project-specific pin.
- ADS v0.4.1 is historical release/adoption evidence from PR #84. Its release-level CodeGraph/RTK descriptions do not mean those tools or optional profiles are enabled by ALNILAM's current project-specific pin.
- ALNILAM public CI MUST NOT recursively fetch the private ADS repo. Verify `.ads` gitlink and root policies against pinned external release metadata. ADS v0.4 MIT license does not automatically relicense ALNILAM's Apache-2.0 work.
- **Historical adoption evidence:** the P0 report records the v0.4.1 review. Stable CodeGraph publication was NOT_FOUND; no claim is made that stable CodeGraph or optional CodeGraph/RTK profiles are active under the current pin.

## F. Deferred upstream build optimizations

**Issue #83 (Future/WAITING_UPSTREAM_STABLE)**: Astro experimental incremental build and parallel prerendering are **not** in any active M1/M2/M3 requirement. No speculative optimizations now. After the respective features are officially stable and compatible with Shirone ALNILAM, run representative build/time/memory/reproducibility tests, Site hash isolation, cache invalidation and rollback. Merge only when performance improves without correctness regressions. Never introduce this future task as a blocker to P6.

## G. New task mapping
- **P0 parent #36:** new #80 existing code inventory/reuse-first hard gate, new #82 ADS v0.4.1 consumer adoption.
- **P6 parent #42:** new #81 docs governance, exercised from P0 onward.
- **Future:** #83 upstream build acceleration, no active Milestone and no release gate.
- Existing P0–P6 tasks remain candidate backlog until G0 Spec freeze. Project #17 membership and native parent/subissue attachment remain **not verified** with the current connected tools.

## H. P0 mandatory reference source snapshot workspace (read-only)

**Decision:** prepare a reproducible, **pinned, reusable reference checkout directory** before feature mapping and importing any third-party code. This is a **P0 prerequisite** (#80, #44), not a greenfield project or a new dependency checked into ALNILAM. The local agent workspace and the ephemeral GitHub Actions workspace share the same path convention.

```text
<workspace>/
├── ALNILAM/                    # the only writable application repository, dev feature branches
└── ALNILAM-ref/                # outside ALNILAM Git tree; do not commit or publish
    ├── Shirone/                # product baseline; pinned pristine checkout
    ├── Firefly/                # selective feature source
    ├── KIRARI/                 # retained platform/LLMs v2/taxonomy engineering reference
    ├── Mizuki/                 # selective additional source
    └── ALNILAM-v0.1.3/        # historical accepted-code baseline, read-only
```

**Pinned manifest (do not float to main/master/latest):**

| Reference | GitHub repository | Exact SHA |
| --- | --- | --- |
| Shirone | `LyraVoid/Shirone` | `55a84b2322bdfb634a59ca6383bb242e5ce646bf` |
| Firefly | `CuteLeaf/Firefly` | `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` |
| KIRARI | `markd3ng/KIRARI` | `5700bcdeb965de87a1818d5d9aec6bf8e227523d` |
| Mizuki | `matsuzaka-yuki/Mizuki` | `14da4262d8aa1d93dc8cff11705f14918ed7369f` |
| Existing ALNILAM | `Skyline-Gazer/ALNILAM` | release tag `v0.1.3` (resolve and record exact commit on setup) |

**Setup contract:**
1. Determine ALNILAM checkout root by `git rev-parse --show-toplevel`. Default `ALNILAM_REF_DIR` to its **sibling** `../ALNILAM-ref`; in GitHub Actions prefer ${RUNNER_TEMP}/ALNILAM-ref. Never put references inside a tracked `ref/`, `vendor/`, `src/`, monorepo workspace package, or production artifact directory.
2. First invocation clones exact repositories and checks out **detached HEAD at the full SHA**. Repeated invocation must verify URL, `HEAD`, and a clean worktree and **reuse the checkout**, not pull newer upstream revisions or reset unknown user changes. Fail loudly on mismatch. Never auto-update reference revisions during an unrelated task.
3. Provide a machine-checkable `references.lock.json` or equivalent documented manifest containing source URL/SHA/role/license. The manifest can be versioned; **cloned trees and their `.git` directories must never be committed**.
4. Reference trees are logically **read-only**. Do not edit or run production builds in them. For upstream behavior reproduction, make a separate disposable trial worktree/copy (not the pinned snapshot) and run only reviewed lockfile/install/build steps. Never run unreviewed upstream install hooks with production credentials.
5. Review source code/API/file-level licenses and images/fonts/music separately before copying. A reference checkout is **not** permission to redistribute artwork or assets.
6. Before removing an ALNILAM component, compare its historical v0.1.3 checkout, present `dev` code and Shirone equivalent, link exact paths and SHAs in its Reuse Decision Record; preserve existing tests and Site v1 fixtures.
7. GitHub Actions: use an isolated **P0 source-audit job**, not mandatory full four-repo checkout on every CI run. Repository sources can be fetched only where needed with read-only Git credentials and short-lived runner disk; never need the user's Mac/Homelab or a private ADS token. Retain only **summaries, diff evidence and measured results** as CI artifacts; do not upload full third-party source trees.
8. Project doc/handoff identifies which reference snapshot was used. Changes to a reference SHA require a separate reviewed decision and refreshed compatibility tests, not an implicit `git pull`.

**Gate sequencing:** this pinned-reference preparation and non-destructive source inspection are **G0-R pre-freeze P0 discovery work**. They are deliberately allowed before owner freezes the final Spec; the read-only evidence enables the freeze. Only full application migration and release work stay blocked pending G0-F. See [07-PHASE-READINESS.md](07-PHASE-READINESS.md).

**Acceptance:** print exact `git remote -v`, `git rev-parse HEAD`, clean worktree for every snapshot, prove reference path is outside `git rev-parse --show-toplevel`, and ensure the ALNILAM working-tree status and Site hash are unchanged. No implementation begins with guessed upstream version provenance. This workflow is required for development preparation, **not** a hard runtime/install prerequisite for using the already shipped ALNILAM blog.

**Release gate**: evidence that actual ALNILAM code was *retained/adapted* and that Shirone's production-ready UI is the starting point, not a greenfield recreation.

## P0 G0-R execution receipt — 2026-10-26

Actual execution findings are maintained once in [the upstream audit receipt](05-UPSTREAM-ASTRO-AUDIT.md#p0-g0-r-execution-receipt--2026-10-26), linked to the authoritative [P0 report](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/p0/P0-ACCEPTANCE.md). Dev baseline before G0-F Plan/Spec merge is `bcf7c642287af1528cd0e60c0a3388126db7e527` after #85/#84/#86/#87. The Owner [approved G0-F scope](https://github.com/Skyline-Gazer/ALNILAM/issues/36#issuecomment-6416284698) on 2026-10-26; retain original NOT_READY as historical P0 pre-decision evidence. Only bounded P1 is authorized; publication and wider scopes remain excluded.
