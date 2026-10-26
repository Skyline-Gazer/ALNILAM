# ALNILAM Next — PLAN (proposal)

> **DRAFT — NOT APPROVED.** 2026-10-25. This is a proposal for a Plan → Spec → Review/Freeze → Project decomposition workflow, not an authorization to implement, merge or deploy. Related: Phase Issues #36–#42, active candidate Tasks #43–#76/#78/#79/#80/#81/#82; future-only #83; product acceptance and legacy regression: #34, #35.

## 1. Problem statement and outcome
ALNILAM v0.1.3 has been published, but successful Issues, CI, and release tags do not establish that the actual product matches its owner's intended blog. The previous approach implemented architecture and generated task closure before capturing a sufficiently testable product specification.

**Outcome:** a recognizably complete, configurable, independently deployable Astro static blogging platform retaining the ALNILAM identity, Git history, protected `dev` / `main` workflow and external Site ownership. Product acceptance needs browser evidence, not issue bookkeeping.

## 2. Architectural and product direction (candidate decisions)
- **One product foundation: Shirone** `LyraVoid/Shirone` @ `55a84b2322bdfb634a59ca6383bb242e5ce646bf`. Start with upstream behavior as the observable functional baseline before adapting.
- **Targeted integrations only:** Firefly `CuteLeaf/Firefly` @ `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` for proven differentiated features/layout; KIRARI `markd3ng/KIRARI` @ `5700bcdeb965de87a1818d5d9aec6bf8e227523d` for Core/Site, build, provenance and delivery practices; Mizuki `matsuzaka-yuki/Mizuki` @ `14da4262d8aa1d93dc8cff11705f14918ed7369f` only for confirmed gaps.
- **One implementation per capability:** exactly one Astro route tree, global design token system, page transition manager, content schema, theme preference store, search-index lifecycle and optional-module registry. Do not run full themes side-by-side.
- **Protect ALNILAM source/code assets as the default:** do NOT replace the working `scripts/compose.mjs`, `scripts/site-contract.mjs`, `scripts/upgrade-check.mjs`, `scripts/artifact-check.mjs`, contract tests, GitHub Actions, search/comments/Bangumi or published docs merely because Shirone has a similar function. Inventory and benchmark actual existing functionality, then **KEEP/ADAPT/WRAP** before **REPLACE/RETIRE**. Keep the current repo, Git history, Apache-2.0 policy and licensed notices, external Site immutability, independent Core/Site SHA, outputs and rollback.
- **Documentation governance is part of implementation:** a single reviewed Plan/Spec, versioned ADRs, correct README/Product/Architecture/Site Onboarding/MAINTAINERS/HANDOFF/ROADMAP/CHANGELOG/NOTICE, requirement→Issue→PR→CI/browser traceability and docs checks. Never treat draft planning prose as shipped capabilities.
- **ADS v0.4 adoption, not v0.3:** official v0.4 release commit `2af17d9e1d816844c49835ae91b784405765ad46` is proposed for the retained private `.ads` Git submodule via separate Draft PR #84; CodeGraph and official full RTK mandatory development tooling, dev-only configuration, production-boundary guard and remote-first verification tracked by #82. This does NOT replace the Shirone base or ALNILAM's build scripts.
- **Design direction:** Shirone M3E single UI design system, retaining owner-required Fuwari-style one-post-per-row, text-left/cover-right desktop (approximately 28% cover) and mobile cover-on-top. Earlier SHBlog Next visual goals are historical input to reconcile in Spec; do not claim a 1:1 clone is required by default.
- **Static-first:** no mandatory runtime database, CMS backend, identity layer or paid always-on service.
- **Scope control:** gallery, moments and music appear in historical docs as owner-declined, but original proof is not established in this review. Treat them as *candidates pending decision*, not automatically mandatory or permanently cancelled. Comments/Bangumi are also to be tested as optional Site-configured modules.

## 2A. Content discovery and multilingual URL decisions (candidate)
- Initial URL design: Site-configured default locale is unprefixed; other enabled locales use a single prefix. A stable route registry generates both root and /ALNILAM/ links and canonical URLs. Existing legacy article paths need explicit compatible aliases or a recorded no-breaking-change decision.
- Taxonomy identifiers stay stable across languages; Category and Tag labels localize, with locale-scoped listings, pagination, Search/Pagefind results and feeds. Untranslated pages cannot fabricate hreflang.
- SEO is a concrete build artifact contract (canonical, reciprocal hreflang, OG/JSON-LD, sitemap, RSS, indexing/exclusions) rather than only a meta-tag checkbox.
- Include opt-in **llmstxt.org v2** support (subpath and locale indexes, source-backed Markdown views, HTML alternate/describedby); optional llms-full is a distinct policy. This is LLM discoverability support, **not** a verified search ranking improvement.
- Detailed acceptance: [04-ROUTING-SEO-LLMS-V2.md](04-ROUTING-SEO-LLMS-V2.md). This is a proposed contract awaiting G0 review, not a deployed capability.

### Upstream + Astro 7.4 official-first architecture rule

Before implementing any core capability, choose the lowest-maintenance valid source in this order: **existing functional ALNILAM KEEP/ADAPT/WRAP → stable Astro official primitive comparison → pinned Shirone frontend implementation → pinned KIRARI engineering gap → Firefly/Mizuki differentiated gap → minimal ALNILAM adapter**. This is a selection principle, not an automatic replacement order: a known-compatible Shirone v7.3.8 baseline MUST be obtained before separately testing Astro 7.4.x upgrades and plugin compatibility. Native methods are not always better for specialized CJK font subsetting or MDX/asset staging. Read [05-UPSTREAM-ASTRO-AUDIT.md](05-UPSTREAM-ASTRO-AUDIT.md) before approving any Phase. **No "already implemented in upstream" claim constitutes drop-in integration or acceptance.**

## 3. Explicit non-goals
- Replacing GitHub repository, erasing history, force pushing, rewriting tags, auto-deploying new production code.
- Rebuilding Firefly, Mizuki and Shirone as three separate themes in ALNILAM.
- Unreviewed wholesale copy of upstream demo pictures, audio, anime artwork, logos, Live2D assets, fonts or proprietary content.
- Turning optional modules into always-on third-party trackers.
- Treating untrusted user-submitted MDX as a sandbox (trusted author content only).

## 4. Migration strategy
1. **Pre-freeze evidence preflight (G0-R), then decision + preservation baseline:** reconcile owner intent with docs and real GitHub SHA; record **KEEP / ADAPT / WRAP / REPLACE / RETIRE** for each existing ALNILAM source/CI/test/schema; freeze a proven v0.1.3 source and Site fixture. #80 is mandatory before any frontend migration that could delete working assets.
2. **Shirone unmodified baseline:** pin upstream SHA, build and run browser flows in an isolated preview before removing old ALNILAM front-end.
3. **Single-base migration:** replace conflicting UI/route code in feature PRs, preserve repository-level CI, provenance and ownership constraints.
4. **Core/Site adapter:** fit Shirone collections/configuration into ALNILAM's frozen schema v1 or a documented opt-in v2 migration; do not mutate Site.
5. **UI and blog essentials:** progressively integrate justified Firefly features, correct links/search/SEO for root and `/ALNILAM/` deployments.
6. **Explicitly selected optional modules:** ship behind feature flags with disabled-is-zero-overhead verification.
7. **Candidate release:** independent external Site and version rollback tests, mobile/desktop evidence, performance/security/license gates and separate owner release authorization.

### Future optimization scope boundary

Astro experimental incremental build and parallel prerendering must **NOT** enter current M1–M3 release/Phase Gates, nor be enabled merely because 7.x ships an experimental flag. The official stable state is a future dependency; Issue [#83](https://github.com/Skyline-Gazer/ALNILAM/issues/83) tracks a separate official-stable-only benchmark/compatibility and rollback PR, not an active implementation commitment. Test actual build reproducibility, Site immutability and invalidation before any merge.

### Binding migration + docs governance

See [06-REUSE-DOC-GOVERNANCE.md](06-REUSE-DOC-GOVERNANCE.md). The **Shirone application is the sole frontend base; the existing ALNILAM repository and its functional systems are the retained platform**. Agent work shall be additive/adapter-first and require file-by-file deletion justification and regression evidence. Document authority, historical status, versioned ADRs and docs-as-code CI are acceptance Gates.

## 5. Risk / mitigation register
| Risk | Mitigation and measurable proof |
| --- | --- |
| Shirone direct content materialization mutates repository or leaks user content | Compose only in an isolated staging workspace; verify Site digest unchanged; no writeback or secrets in output |
| Component/theme/Swup conflicts from four upstreams | One-owner rule; PR must prove old duplicate removed and navigation lifecycle stable |
| Core Site schema breaks older blogs | Stable v1 fixture, versioned schema diff and explicit migration/rollback tests |
| GitHub Pages nested base path breaks links, feeds and canonical | Crawl generated output and actual preview under both `/` and `/ALNILAM/`; reference #34 |
| Licence and asset reuse problems | File-level source SHA attribution, NOTICE/THIRD_PARTY_NOTICES, third-party media excluded unless licensed |
| Appearance judged only from code | Screenshot matrix 1440px desktop/390px mobile + interactive browser review and owner acceptance |
| Project completion inflated by checkbox counts | Phase gates require links to actual CI runs, browser proof and owner review; project status is not product PASS |
| Dependency on private ADS in public CI | Root AGENTS.md remains sufficient public baseline; do not request private ADS credentials in public CI |

## 6. Explicit gate ordering: P0 evidence before frozen Spec

The **P0 source audit is allowed as read-only / non-destructive evidence gathering before final Spec freeze**. P0 cannot logically be blocked by a Spec that requires its audit results. After evidence (pinned reference checkouts, existing ALNILAM and Shirone baseline, source/asset matrix, licensing and owner history), update Spec and pass **G0-F review/freeze**. Only implementation changes in P1–P6 require frozen requirements. See [07-PHASE-READINESS.md](07-PHASE-READINESS.md).

### Required one-time post-P0 owner checkpoint

Once P0 read-only/reproducibility/audit tasks conclude, issue one **P0 Acceptance / Decision Report** covering reference SHAs, ALNILAM retained-source matrix, Shirone baseline, official-Astro tradeoffs, Site compatibility, legal/test evidence, draft Spec changes, risks and the smallest viable P1 plan. Pause feature implementation until the owner explicitly **confirms or requests corrections**. The report is not an invitation to approve every technical micro-decision; routine P0 work remains autonomous. The reporting schema and G0-F decision gate are in [07-PHASE-READINESS.md](07-PHASE-READINESS.md). **P0 PASS without owner sign-off does not authorize P1.**

## 6. Plan acceptance gate (G0-A)
- [ ] Owner confirms or requests changes to the product baseline, Shirone-first direction and styling.
- [ ] Core/Site, privacy, packaging and release boundaries have no unresolved contradictory requirements.
- [ ] Candidate feature scope is explicitly adopted/deferred; no agent assumptions.
- [ ] SPEC and traceability documents cover each P0–P6 task with testable acceptance.
- [ ] Only then restructure the real Project #17 and mark execution-ready tasks.

## 7. Planning inputs
**Required before writing the draft:** none; work with public upstream source, current ALNILAM repository/docs and connected GitHub account.

**Potential approval at G0:** which of the historically deferred media features are actually in the release scope; whether Shirone M3E supersedes the old cinematic Editorial aesthetic except the Fuwari list. Record exact owner decision with date/link in Spec.

**Only later, when specific integrations are enabled:** optional Giscus discussion IDs, third-party service settings, external private Site access and actual publish target credentials; never block planning on these or store them in a public repo.

## 8. Order of execution
`PLAN` (this proposal) → `SPEC` (normative acceptance) → `review/freeze` (owner-approved snapshot + changelog) → `Milestone/Phase/Sub-issue reconciliation` in Project #17 → `one Issue / PR / remote CI / visual verification at a time`.

**Current Issues #36–#82 (excluding PR #77) remain candidate backlog as mapped in 02-GITHUB-PROJECT; build-acceleration #83 is a future-only TODO, not part of M1–M3.** GitHub Project V2 items and true GitHub Milestones are not yet written.

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
