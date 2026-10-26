# ALNILAM Next — Phase readiness and stage-gate audit

> **DRAFT · 2026-10-26.** This is a **readiness assessment**, not implemented functionality, CI acceptance, approval to merge, or an assertion that GitHub Project #17 is synchronized. Product frontend foundation remains **Shirone**. The current **ALNILAM** repository, its Site contract, existing code, CI, tests and docs remain the reused platform. Keep licensed upstream sources in isolated `ALNILAM-ref/` checkouts.

## Gate correction: evidence collection cannot depend on Spec freeze

Earlier issues erroneously described **all P0 tasks as blocked by final G0 Spec freeze**, while that freeze itself requires P0 source audit, project-state readback and owner scope reconciliation. Avoid the circular dependency:

1. **G0-R / Evidence preflight — authorized immediately for read-only, non-destructive work.** Work includes GitHub state, docs/spec scrutiny, pinned reference checkouts in a temporary/sibling directory, original source code inspection, reproducible **isolated** baseline builds and browser screenshots, version/license proof, Keep/Adapt/Wrap/Replace/Retire inventory and proposed amendments to draft docs. No existing ALNILAM code removals, no private secrets, no tool installs/global settings without approval, and no production merges/deployments. Related candidate Issues #43/#44/#45/#46/#80. Draft PR #77 stays open for edits.
2. **G0-F / Spec freeze** after the evidence-backed P0 findings. Resolve genuine product-scope choices, confirm Shirone design target and original Site backwards-compatibility, then approve/freeze normative specs and phase dependencies. A frozen Spec is a **prerequisite for feature implementation**, not evidence collection.
3. **G1–G6 / Per-Phase Ready gates.** Before entering each Phase, require verified upstream/source versions, relevant official Astro implementation choice, stable interface/API/schema, specific acceptance fixtures, independent success/failure cases, expected code reuse and concrete rollback. Keep sub-issue scope small. New findings amend the Spec through a reviewed change request, not silent architectural drift.
4. **Release Gate:** actual running product, independently pinned unchanged Site, accessibility/performance/browser/SEO/LLMs/privacy proof and owner acceptance; no auto-main merge/tag/production.

## Readiness map (26 October 2026)

| Phase | What is known in Plan/Spec | Unverified before implementation | Next independent evidence | Status |
| --- | --- | --- | --- | --- |
| P0 #36 — Evidence + freeze | Source candidates/versions, published v0.1.3 baseline, mandatory reuse, licensing/ADS v0.4, reference structure | **Actual pinned clones/clean SHA readback**, original Shirone build, ALNILAM old/current test results, Keep/Adapt/Wrap/Replace/Retire inventory, code/asset provenance, historical feature decisions | Read-only #43/#44/#45/#46/#80; document RDR, link evidence, reconcile docs. ADS pin separate Draft PR #84; consumer-tool verification #82 remains open | **Evidence work ready, freeze not ready** |
| P1 #37 — Shirone frontend import | Shirone sole frontend, ALNILAM retained platform, no full theme duplication, independent Astro 7.4.x pilot #79 | No proven pristine Shirone artifact, no one-to-one functional smoke screenshot, no integrated existing ALNILAM package/route plan or diff; no actual frontend migration | Baseline Shirone check/build/E2E in disposable env; map every retained component; create minimal incremental migration PR with browser proof | **Architecture chosen, execution not ready** |
| P2 #38 — Core/Site contract | Existing ALNILAM read-only compose + SHA/provenance + rollback; KIRARI contract & Shirone overlay available | Exact adaptation into Shirone Content Layer and v1 Schema; external assets and content paths; failure/rollback in new UI; no end-to-end verified matrix | Spike using **unchanged existing Site fixture** and external `glob/file`, verify before/after site digest, two SHA provenance, Core upgrades; not a new compose engine | **Contract known, integration spec incomplete** |
| P3 #39 — Design and UX | Shirone M3E main design + Fuwari single-column text-left/cover-right; no second design/transition engine | Original screenshot baseline not approved; responsive breakpoints, navigation, TOC, dark/light, motion, view lifecycle, no-jump measures need exact acceptance | 1440/390 screenshots from Shirone reference, UI element matrix, interaction/walkthrough against agreed reference; decide minimal components to adapt | **Direction known, visual acceptance incomplete** |
| P4 #40 — Blogging/SEO/i18n/LLMs v2 | Detailed ROUTE/TAX/SEARCH/SEO/LLM contracts in 04; Astro official-first APIs, Pagefind and KIRARI llms-v2 provenance | Multilingual real URL fixtures/legacy alias semantics, translation/taxonomy migration tests, official `@astrojs/sitemap` partial-translation behavior in target site, exact output content mapping | Build root and `/ALNILAM/` variants with zh-CN/en/ja 12+ post fixtures; tests of category/tag/search/feeds/SEO/hreflang/llms Markdown/disabled | **Detailed spec, target compatibility unverified** |
| P5 #41 — Optional modules | Sources for gallery/dynamics/music/Bangumi/comments are inventoried; feature-flag rule, privacy and zero-overhead | Existing recorded scope says gallery/moments/music declined for v0.1.3, not automatically mandatory for vNext; which Shirone components actually beat retained ALNILAM Bangumi/comments needs behavior comparison | Component-by-component **keep/adapt/reuse** and optional scope matrix with owner decision when genuinely needed; fixture enabled/disabled & network proof | **Features located, selection/scope unresolved** |
| P6 #42 — Acceptance/docs | CI, browser, performance, license, docs governance #81, ADS v0.4 #82; Phase exit needs evidence | Final reproducibility/perf budget and exact cross-host workflows, doc schema/ADR ownership, negative fixtures, external Site onboarding, v0.1.3 migration | During earlier Phases establish evidence archive, docs-as-code checks, CI smoke; RC must replay against target integration, not only isolated references | **Quality framework known, full acceptance matrix incomplete** |

## P0 completion report and explicit owner confirmation — mandatory G0-F checkpoint

**The first Phase is a deliberate stop-and-confirm gate.** The agent may autonomously run all safe P0 evidence gathering, reproduce builds, compare sources and prepare draft Plan/Spec/ADR updates. However, it MUST NOT automatically start P1 application migration, mark Spec FROZEN, or claim that M1 is ready when P0 audit activity is completed. Publish one consolidated human-readable **P0 Acceptance / Decision Report**, as a GitHub Issue #36 comment or linked evidence document, and present it to the owner for explicit sign-off.

The report MUST include:

| Section | Required evidence and decision |
| --- | --- |
| 1. Verified state | ALNILAM dev/main/v0.1.3 Git SHAs, reference clone URLs/SHAs, clean checkouts, CI/preview links, ADS v0.4 Gitlink and host-tool verification status separately |
| 2. Existing asset reuse | Per-file **KEEP / ADAPT / WRAP / REPLACE / RETIRE** matrix, including compose/schema/rollback/tests/CI/Pagefind/comments/Bangumi/docs; each proposed removal has a reason and a backward-compatibility test |
| 3. Shirone baseline | Pristine build, screenshots and key routes/features; gaps against ALNILAM requirements; specific Firefly/KIRARI/Mizuki source additions only where needed |
| 4. Official Astro | Official APIs vs upstream implementations vs necessary custom adapter; compatibility and identified risks; no unverified latest-version claims |
| 5. Contract/quality | Independent Site v1, old/new Core, SHA immutability, root + /ALNILAM/ URLs, copyright/license, privacy, test PASS/PARTIAL/FAIL/NOT VERIFIED with artifact URLs |
| 6. Spec delta | What changed from draft #77, exact unresolved decisions (e.g. design acceptance and deferred optional modules), and ADR links; never silently mark tentative decisions approved |
| 7. Proposed P1 execution | Small Issue/PR sequence, dependencies, reuse constraints, rollback/verification approach, expected owner actions and real blockers |
| 8. Gate verdict | **READY / CONDITIONAL / NOT READY**, with explicit remaining risks; mark tested vs inferred items separately |

**Owner decision options**: `Approve P0 / freeze Spec / authorize P1`; `Approve with explicit constraints`; or `Revise P0/Spec first`. Record the owner's actual decision link/date and resulting scoped authorization. No reply, ambiguous praise, or PR review signal must be treated as unconditional P1 authorization. A separate approval is still required to merge/release/deploy where Git governance requires it.

After approval, update the exact Plan/Spec/ADR frozen revision; reconcile real Project #17 Milestone → parent Phase → native sub-issues with readback verification and then start the scoped P1 PRs. If owner asks for changes, keep #36 open and revise the audit/Spec before proceeding. **Do not block P0 itself for this confirmation**; the checkpoint happens *after* the evidence report.

Subsequent phases should publish their Gate summaries, but they need another owner decision only for a substantive scope/architecture change, missing authorization, a real risk acceptance, or release/promotion. Do not interrupt the owner for routine individual code changes already covered by a frozen Spec.

## Mandatory next sequence (not a request to start full implementation)

1. **Run P0 Evidence Preflight only**: prepare `ALNILAM-ref/` checkouts at pinned SHA and v0.1.3, verify clean detached heads; current and old ALNILAM tests/outputs; pristine Shirone build; source-selection matrix; actual defect and license report. No need to choose a new platform or ask owner for credentials to read public sources.
2. **Fix/read Plan/Spec** using observed behavior; update 00–06 and ADRs; collapse duplicates. Request only concrete unresolved product choices, not every technical selection. Include a human-readable visual acceptance summary.
3. **G0-F Spec Freeze**: explicit owner acceptance of the proposed design/scope and no missing mandatory core contract. This is distinct from future release authorization.
4. **Then Projects v2 reconciliation**: existing Project #17; native GitHub M1/M2/M3 milestone, Phase parents and native sub-issues, existing Issue numbers preserved. Verify actual readback before declaring done; Requires `gh`/GraphQL access.
5. **P1** starts with unchanged Shirone baseline and retaining ALNILAM; **P2–P6** use per-Phase spec refinement and proof gates, not an endless speculative full rewrite.
6. **Future #83** build acceleration: excluded from current milestones until Astro incremental/parallel features are officially stable and measured.

## What must NOT be misreported

- An Issue exists ≠ Project Item exists, Spec Frozen, milestone linked or implementation done.
- Upstream source exists ≠ code legally/technically drop-in compatible, benchmarked, or passing product E2E.
- Merged upstream backend pattern ≠ released vNext user-facing blog.
- Documentation says ADS v0.4 ≠ actual merged gitlink + complete CodeGraph/full RTK host and production boundary verification.
- Original v0.1.3 release and its historical acceptances must remain intact and explicitly differentiated from proposed vNext.


## P0 G0-R execution receipt — 2026-10-26

Authoritative audit and exact evolving receipts: [ALNILAM P0 Acceptance & Decision Report](https://github.com/Skyline-Gazer/ALNILAM/blob/chore/p0-evidence-preflight/docs/p0/P0-ACCEPTANCE.md), [file-level RDR](https://github.com/Skyline-Gazer/ALNILAM/blob/chore/p0-evidence-preflight/docs/p0/REUSE-DECISIONS.md), [Draft PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85). This supplements these existing Draft documents; it does not create a second Spec or freeze any requirement.

- Published v0.1.3 tests/check/build/external Site/two-version upgrade-rollback pass on an ephemeral runner. Product source at dev5fd74ce and release07fac43 is identical; retain it and every old test. Provenance is Core SHA + Site digest; separately pinned Site Git SHA is caller responsibility.
- All four fixed references and v0.1.3 are materialized detached/clean outside Core. Shirone7.3.8 and isolated Astro7.4.2 pass typecheck,681 Node tests and build. Non-mutating Biome lint has5 actual errors in both. Initial480-test single-worker browser run exceeded10minutes; complete suites are separately sharded on isolated runners, and a Swup content-wait flaw in the P0 preview harness is corrected. Consult exact outcomes rather than Actions continue-on-error step conclusions. No production dependency changed.
- Shirone already defaults list/right; Firefly is not needed for that layout. Shirone default font subsetting requests Meting text; build is not proven offline/deterministic. Its sync writes/prunes Core staging/mounts and timestamp-locks; preserve ALNILAM's immutable external Site controller.
- KIRARI locale taxonomy/source Markdown is useful source evidence, but its ClientRouter/Swup dual mechanism is not imported. Its llms-full is HTML-derived and does not automatically inherit source-export/privacy guarantees. No upstream is a complete drop-in ALNILAM contract.
- Repository code licenses do not clear media/fonts. Firefly imagery includes miHoYo rights; Mizuki has per-file inherited MIT notices; Shirone Yozai font clearance is unverified. No upstream frontend/media imported.
- Existing ALNILAM generated nested-base canonicals/post-list links escape /ALNILAM/, default disabled Bangumi still emits /opt/bangumi/, and Search hydrates on posts despite a weaker script-tag guard. These are regression requirements, not authorizations to rewrite/delete old code.
- #84 stable ADS pin remains separate/unmerged; its stale CI pin assertion is repaired with verify PASS. Official CodeGraph provenance and RTK latest-stable compliance remain blocked; exact stable production guard rejects historical tool-specific .gitignore entries. No global install or gate relaxation.
- Actual Project17 read-back has17 historical Done items, no Next membership, no Phase field, no milestones or native Next hierarchy. Existing tracker structure remains unchanged pending G0-F.
- CNB Development + GitHub Release Gate is a distinct proposed extension, not ADS v0.4 or the current CNB-authoritative mirror. [ADS Draft #67](https://github.com/Skyline-Gazer/ADS/pull/67) records the incompatibility/forward-only version-title correction. Two-round offline Git mechanics pass; real protection/credentials/review/event-loop acceptance remains NOT_RUN/BLOCKED. Greptile App is installed for ALNILAM, but current-SHA review/required-check and account entitlement remain unverified.

**Owner Gate stays closed:** accept P0 findings, decide G0-F frozen Plan/Spec and authorize an exact P1 scope explicitly. No CI result, Issue state, this document update or proposed ADR grants implementation/release/cutover permission. Optional modules, runtime budgets, legacy aliases, Site schema migration and tool installation still require the recorded relevant decisions.
