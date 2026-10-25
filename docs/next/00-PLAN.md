# ALNILAM Next — PLAN (proposal)

> **DRAFT — NOT APPROVED.** 2026-10-25. This is a proposal for a Plan → Spec → Review/Freeze → Project decomposition workflow, not an authorization to implement, merge or deploy. Related: #36–#76; product acceptance and legacy regression: #34, #35.

## 1. Problem statement and outcome
ALNILAM v0.1.3 has been published, but successful Issues, CI, and release tags do not establish that the actual product matches its owner's intended blog. The previous approach implemented architecture and generated task closure before capturing a sufficiently testable product specification.

**Outcome:** a recognizably complete, configurable, independently deployable Astro static blogging platform retaining the ALNILAM identity, Git history, protected `dev` / `main` workflow and external Site ownership. Product acceptance needs browser evidence, not issue bookkeeping.

## 2. Architectural and product direction (candidate decisions)
- **One product foundation: Shirone** `LyraVoid/Shirone` @ `55a84b2322bdfb634a59ca6383bb242e5ce646bf`. Start with upstream behavior as the observable functional baseline before adapting.
- **Targeted integrations only:** Firefly `CuteLeaf/Firefly` @ `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` for proven differentiated features/layout; KIRARI `markd3ng/KIRARI` @ `5700bcdeb965de87a1818d5d9aec6bf8e227523d` for Core/Site, build, provenance and delivery practices; Mizuki `matsuzaka-yuki/Mizuki` @ `14da4262d8aa1d93dc8cff11705f14918ed7369f` only for confirmed gaps.
- **One implementation per capability:** exactly one Astro route tree, global design token system, page transition manager, content schema, theme preference store, search-index lifecycle and optional-module registry. Do not run full themes side-by-side.
- **Protect ALNILAM contracts:** retain repository, Git history, Apache-2.0 policy with appropriate upstream notices, ADS rules, external Site as user-owned input, source immutability, separate Core/Site revisions, predictable static output and upgrade/rollback.
- **Design direction:** Shirone M3E single UI design system, retaining owner-required Fuwari-style one-post-per-row, text-left/cover-right desktop (approximately 28% cover) and mobile cover-on-top. Earlier SHBlog Next visual goals are historical input to reconcile in Spec; do not claim a 1:1 clone is required by default.
- **Static-first:** no mandatory runtime database, CMS backend, identity layer or paid always-on service.
- **Scope control:** gallery, moments and music appear in historical docs as owner-declined, but original proof is not established in this review. Treat them as *candidates pending decision*, not automatically mandatory or permanently cancelled. Comments/Bangumi are also to be tested as optional Site-configured modules.

## 3. Explicit non-goals
- Replacing GitHub repository, erasing history, force pushing, rewriting tags, auto-deploying new production code.
- Rebuilding Firefly, Mizuki and Shirone as three separate themes in ALNILAM.
- Unreviewed wholesale copy of upstream demo pictures, audio, anime artwork, logos, Live2D assets, fonts or proprietary content.
- Turning optional modules into always-on third-party trackers.
- Treating untrusted user-submitted MDX as a sandbox (trusted author content only).

## 4. Migration strategy
1. **Decision baseline:** reconcile owner intent with docs and real GitHub SHA; record Keep / Replace / Delete and source/provenance; freeze a known working ALNILAM reference.
2. **Shirone unmodified baseline:** pin upstream SHA, build and run browser flows in an isolated preview before removing old ALNILAM front-end.
3. **Single-base migration:** replace conflicting UI/route code in feature PRs, preserve repository-level CI, provenance and ownership constraints.
4. **Core/Site adapter:** fit Shirone collections/configuration into ALNILAM's frozen schema v1 or a documented opt-in v2 migration; do not mutate Site.
5. **UI and blog essentials:** progressively integrate justified Firefly features, correct links/search/SEO for root and `/ALNILAM/` deployments.
6. **Explicitly selected optional modules:** ship behind feature flags with disabled-is-zero-overhead verification.
7. **Candidate release:** independent external Site and version rollback tests, mobile/desktop evidence, performance/security/license gates and separate owner release authorization.

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

**Current Issue #36–#76 status: proposed backlog, not approved implementation scope.**