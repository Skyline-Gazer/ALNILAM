# ALNILAM Next — GitHub Project #17 Reconciliation Plan

> **PROPOSAL ONLY.** The Issues below already exist as an *unspecified candidate backlog*. They are NOT confirmed Project #17 items, are NOT currently native sub-issues, and are NOT approved implementation tasks. No GitHub Milestones, Project fields, parent/sub-issue links or Project membership were changed by this planning PR.

## Project identities
- **Existing repository:** https://github.com/Skyline-Gazer/ALNILAM
- **Existing GitHub Project:** https://github.com/orgs/Skyline-Gazer/projects/17/
- **Do not create another repository or Project.** Preserve closed previous work, v0.1.3 Git tags and completed work history.
- **Plan & Spec Gate G0:** docs/next/00-PLAN.md and docs/next/01-SPEC.md reviewed/frozen by owner. Gate is **not** a deliverable-phase or an arbitrary release deadline.

## Real GitHub Milestones → native Phase parent Issues → native sub-issue Tasks

Use repository-native Milestones as product outcomes, not to replace Phases. Show repository milestone field in Project #17; do not create an unnecessary duplicate "Milestone" dropdown.

| Milestone (proposed, not created) | Target outcome | Phase parent Issues | Candidate Task Issues |
| --- | --- | --- | --- |
| **M1 — Foundation Alpha** | Verifiable Shirone blog base + independently versioned immutable Site | P0 #36, P1 #37, P2 #38 | #43–#56 plus #79 (15) |
| **M2 — Product Beta** | Unified responsive design + real blogging/search/SEO | P3 #39, P4 #40 | #57–#66 plus #78 (11) |
| **M3 — Integration & RC** | Owner-selected optional modules + quality/release readiness | P5 #41, P6 #42 | #67–#76 (10) |

Milestone completion means its actual Phase Gates are PASS, not a pre-assigned date. Set milestone dates only if a real deadline exists; do not invent dates or release numbers.

### Parent → sub-issue mapping (existing Issues, do not re-create)

| Phase parent | Native sub-issues to attach after G0 | Phase Gate |
| --- | --- | --- |
| **#36 P0 Planning/architecture** | #43 baseline, #44 functionality matrix, #45 licensing, #46 ADR/old Issue reconciliation | Source SHA and keep/replace/delete, licence notice plan, owner-approved ADR |
| **#37 P1 Shirone foundation** | #47 pristine upstream build, #48 ALNILAM import, #49 single dependency/router stack, #50 browser preview, **#79 Astro 7.4 official-API compatibility pilot** | Single real site runs on preview, CI and browser evidence |
| **#38 P2 Core/Site** | #51 schema, #52 immutable builder, #53 assets, #54 provenance/rollback, #55 CI, #56 build security | External Site immutability, upgrade+rollback, dual provenance and read-only proof |
| **#39 P3 UI** | #57 M3E tokens, #58 Fuwari feed, #59 responsive nav/settings, #60 transition lifecycle, #61 visual tests | User-visible responsive browser comparison + accessible interaction |
| **#40 P4 Blogging** | #62 content/taxonomy, #63 pagination/search, #64 SEO/base paths, #65 i18n, #66 markdown/images, **#78 llms.txt v2 source Markdown views/discovery** | Real content fixture and root/subpath E2E PASS |
| **#41 P5 Extensions** | #67 gallery, #68 moments, #69 music, #70 Bangumi, #71 comments | **Only selected features** must be implemented; remaining items are explicitly deferred or closed as not planned with source decision |
| **#42 P6 Release candidate** | #72 privacy/zero-cost, #73 cross-host E2E, #74 performance/a11y, #75 security/licenses, #76 docs/release | Evidence-based release candidate and owner signoff, not auto-deploy |

### Dependencies
```text
G0 Plan + Spec review/freeze
    └── P0 (#36)
          └── P1 (#37)
                └── P2 (#38)
                      ├── P3 (#39)  ──────────┐
                      └── P4 (#40) ── P5 (#41)├── P6 (#42)
                                             ┘
```
P3/P4 may overlap once the relevant P2 contract is stable. P6 test infrastructure may start earlier. Do not block a Phase merely because a scoped-out optional feature never enters delivery.

## Recommended Project #17 fields

Discover *real* Project fields before writing anything, reuse instead of duplicating:
- **Built-in**: Title, Status, Assignees, Milestone (native issue metadata), Parent issue, Sub-issue progress, Linked PRs where available.
- **Spec Gate** (only if useful and not present): `Proposed`, `In review`, `Frozen`, `Rework needed`; default all candidate tasks `Proposed` until G0.
- **Priority**: `P0`, `P1`, `P2` as actual work priority, NOT the Phase number.
- **Phase ownership**: derive from native Parent issue rather than add redundant custom `Phase` field unless Projects views cannot express required grouping.
- **Status**: preserve existing organization values; map semantically to Backlog/Todo, Ready, In progress, Review, Verified/Done, Blocked. Do not invent new values without looking at schema.
- **Optional size/target iteration** only after P0 estimation. Iterations are sprint cycles, NOT a substitute for release Milestones.
- **No fabricated delivery dates.**

## Recommended Project views

1. **Plan & Spec Review**: all candidate issues needing Spec Gate, by priority/owner, including old #34/#35 reconciliation.
2. **Release Roadmap**: issues grouped by native GitHub Milestone, with Phase parent/sub-issue hierarchy.
3. **Phase Execution**: native "Show hierarchy" enabled; Parent issue + Sub-issue progress displayed, grouped by milestone/Status.
4. **Agent Ready Queue**: Spec Gate = Frozen, no blocker, acceptance criteria present; prioritize smaller scope, one Issue per PR.
5. **Verification**: PR review, remote CI/E2E and owner acceptance links; no false "Done".

## Safe migration sequence after G0

1. **Read before write**: `gh project view 17 --owner Skyline-Gazer`, `gh project item-list 17 --owner Skyline-Gazer --format json`, `gh project field-list 17 --owner Skyline-Gazer --format json`; inspect native repo milestones, Issue type and actual Issue IDs. This requires an authenticated principal with `project` read/write permission; do not assume token access.
2. Reuse existing same-named milestones or create **exactly M1/M2/M3** once. No parallel Board or 43 duplicate Issues.
3. Use native GitHub Sub-issues API/UI to attach existing #43–#76, #78 and #79 as children of #36–#42. **Plain Markdown checkboxes are not a substitute.** Preserve each Issue number, history and comments.
4. Assign the milestone corresponding to each Phase to the parent and relevant sub-issue; add the missing Issues to the *existing* Project #17 idempotently after reading the current membership.
5. Add/validate required fields and views. Configure the review gate; keep existing v0.1.x closed work as history, not a new false green milestone.
6. Add requirement IDs / validation links to each issue **only after the Spec is frozen**, splitting or closing duplicates where justified.
7. Record the actual Project Item IDs, native parent relationships and field values by reading Project back. Do not mark sync successful based on API request counts.
8. Execute P0 first; each PR links the correct Issue and must have CI acceptance. Await owner approval for PR merges and publication.

### Existing older Issues
- **#34**: legacy v0.1.3 broken base path/SEO; move evidence-based regression to #64/#73, not old-code hotfix work that will be deleted.
- **#35**: historic product acceptance mismatches; trace relevant requirements to this Spec/P0 and actual owner decisions, do not automatically claim outdated screenshot design as the new target.
- Existing closed #1–#33 and old Project #17 completion remain historical; do not reopen or erase simply to inflate the new roadmap.

## Astro-version and official-API investigation gate (before code)

Add to Phase P0/#44 and P1/#47–#49: review [05-UPSTREAM-ASTRO-AUDIT.md](05-UPSTREAM-ASTRO-AUDIT.md), then determine actual Astro 7.4.x compatibility with pinned Shirone 7.3.8 in a separate remote-first CI experiment. Use official `astro:i18n`, Content Layer `glob/file`, `paginate`, `@astrojs/sitemap`, `@astrojs/rss`, `astro:assets` and native transitions where their acceptance behavior is proven. Do NOT preapprove custom alternatives simply because other upstream blogs hand-roll them. The matrix and compatibility tests are mandatory Phase P0/P1 evidence, not automatically new milestones.

## Authorization and reporting
- This PR **does not** create milestones, attach sub-issues, alter Project #17, merge into dev/main, tag or deploy production.
- Current connected GitHub write actions support repository Issues/branches/PRs but **do not expose Projects v2 fields/membership, GitHub Milestone creation or native sub-issue attachment**. A future authorized `gh`/GraphQL pass is needed for these changes; never claim they're already done.
- Before starting Project mutation: verify the account has actual Projects read/write permission. If not, report one consolidated permission blocker and provide the exact permission/action needed. Do not ask for unnecessary tokens or request secrets in chat.
- The owner needs only to review/freeze Plan/Spec at G0 now. Optional provider or private Site credentials are not prerequisites to this planning pass.