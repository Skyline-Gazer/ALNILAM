# ALNILAM Next — Spec-to-Issue traceability

> **G0-F OWNER APPROVED FOR P1** ([decision](08-G0-F-DECISION.md)). Requirement-to-Issue mapping is authoritative planning guidance, not evidence that native Project membership, child hierarchy or products PASS. Deferred modules remain OUT OF SCOPE.

Traceability rule: requirement → selected source/implementation → atomic Issue → PR + changed files → CI/browser evidence → owner decision. Scope changes must revise Spec and keep the former decision/link.

## Proposed work-item traceability (all 39 active candidate atomic Issues)

| Phase | Candidate Issue | Spec requirement IDs | Planning status |
| --- | --- | --- | --- |
| P0 | #43 | PRD-01, NFR-02 | Pending Spec freeze |
| P0 | #44 | PRD-02, PRD-06, MOD-04 | Pending Spec freeze |
| P0 | #45 | NFR-03 | Pending Spec freeze |
| P0 | #46 | PRD-01, CS-01, MOD-03, NFR-07 | Pending Spec freeze |
| P0 | **#80** | **MIG-01, MIG-02; baseline KEEP/ADAPT/WRAP/REPLACE/RETIRE** | Pending Spec freeze |
| P0 | **#82** | **NFR-09; ADS v0.4.1 full RTK/CodeGraph dev-only boundary** | Consumer adoption PASS; P0 Spec freeze pending |
| P1 | #47 | PRD-02, NFR-01 | Pending Spec freeze |
| P1 | #48 | PRD-01, PRD-02, PRD-04 | Pending Spec freeze |
| P1 | #49 | PRD-02, PRD-06, NFR-01 | Pending Spec freeze |
| P1 | #50 | PRD-04, PRD-05, NFR-05 | Pending Spec freeze |
| P1 | **#79** | PRD-02, NFR-01, NFR-05; Astro 7.4 official-native feasibility | Pending Spec freeze |
| P2 | #51 | CS-04, BLOG-01 | Pending Spec freeze |
| P2 | #52 | CS-01, CS-02 | Pending Spec freeze |
| P2 | #53 | CS-02, BLOG-05 | Pending Spec freeze |
| P2 | #54 | CS-03, CS-04 | Pending Spec freeze |
| P2 | #55 | CS-05, NFR-01 | Pending Spec freeze |
| P2 | #56 | CS-06, NFR-04 | Pending Spec freeze |
| P3 | #57 | PRD-05, PRD-06 | Pending Spec freeze |
| P3 | #58 | PRD-03 | Pending Spec freeze |
| P3 | #59 | PRD-05, PRD-06 | Pending Spec freeze |
| P3 | #60 | NFR-05, MOD-01 | Pending Spec freeze |
| P3 | #61 | PRD-03, PRD-04, NFR-05 | Pending Spec freeze |
| P4 | #62 | BLOG-01, BLOG-02; TAX-01–06; ROUTE-04 | Pending Spec freeze |
| P4 | #63 | BLOG-02, BLOG-03; SEARCH-01–03 | Pending Spec freeze |
| P4 | #64 | BLOG-04; ROUTE-02–07; SEO-01–09 | Pending Spec freeze |
| P4 | #65 | BLOG-06; ROUTE-01–06; SEO-02, SEO-06 | Pending Spec freeze |
| P4 | #66 | BLOG-05, NFR-05 | Pending Spec freeze |
| P4 | **#78** | **BLOG-07; LLM-01–08** | Pending Spec freeze |
| P5 | #67 | MOD-03, MOD-04 | Pending product scope decision |
| P5 | #68 | MOD-03, MOD-04 | Pending product scope decision |
| P5 | #69 | MOD-03, MOD-04 | Pending product scope decision |
| P5 | #70 | MOD-02, MOD-04 | Pending product scope decision |
| P5 | #71 | MOD-02, MOD-04 | Pending product scope decision |
| P6 | #72 | MOD-01, NFR-04 | Pending Spec freeze |
| P6 | #73 | BLOG-04, BLOG-06, BLOG-07, NFR-05; ROUTE/TAX/SEARCH/SEO/LLM E2E | Pending Spec freeze |
| P6 | #74 | NFR-05, NFR-06 | Pending Spec freeze |
| P6 | #75 | NFR-03, NFR-04 | Pending Spec freeze |
| P6 | #76 | PRD-01, NFR-02, NFR-07, NFR-08, NFR-09 | Pending Spec freeze |
| P6 | **#81** | **NFR-08; current-doc/spec/ADR/README/Site/manual CI governance** | Pending Spec freeze |

## Future Backlog — not counted as an active Phase task

- **#83** `NFR-10`: after Astro incremental builds and parallel prerendering become officially stable, assess and measure. It is NOT part of M1–M3, active Phase Gates or a default production flag. Add native parent/milestone only when stable and the scope is approved.

## Reuse + docs audit

[06-REUSE-DOC-GOVERNANCE.md](06-REUSE-DOC-GOVERNANCE.md) binds all 39 active candidate tasks. Preserve ALNILAM's real source and working tests first, keep Shirone as one frontend base, and require RDR and docs-as-code for destructive changes. ADS v0.4.1 adoption PR #84 is merged and distinct from planning PR #77.

## Official Astro API / upstream source decision

See [05-UPSTREAM-ASTRO-AUDIT.md](05-UPSTREAM-ASTRO-AUDIT.md). All P1/P2/P3/P4 tasks must attach a **native Astro API vs upstream code vs ALNILAM gap** decision. No single external project covers all exact acceptance contracts; static blog features are mostly present, but quality/security/dual-revision Site/governance and source-backed LLM v2 discovery require integration and proof.

## Issue authoring rules after Spec freeze
An execution-ready Issue must include:
1. **Requirement IDs and corresponding acceptance scenario** (S1–S6 where applicable).
2. **Upstream source SHA and exact selected implementation** or a reason to implement new code.
3. **Current behavior** supported by source or browser observations and **expected behavior** as measurable outcomes.
4. **Smallest implementable change boundary**, preconditions, dependent Issues and exclusions.
5. **Failing-before test**, passing-after test, screenshot/URL/network expectations, and any privacy/licensing conditions.
6. **CI command / remote run**, preview requirements and expected rollback effect.
7. **Owner inputs needed**, fully enumerated before Agent starts. For private provider live demo, permit deterministic fixture to proceed when credentials are absent.
8. **Exit evidence**: PR URL, commit SHA, test run IDs, output/artifact links, screenshots and verification verdict.

## Change management
- Requirement changes first open a Spec review; changes are NOT silently applied to executable Issues.
- P5 #67/#68/#69 historically conflict with recorded feature deferral; status is **DEFERRED by G0-F**; not approved for P1/current release until a new scoped decision.
- #34 and #35 remain provenance/regression references. They are not discarded but should not require patching UI slated for replacement.
- G0 review approval precedes native Project hierarchy creation/field editing; GitHub Project membership remains **not verified** in this proposal.
- Phase success is determined by the acceptance evidence of the *actual selected scope*, not number of closed Issues.

## Gate checklist
- [ ] Every MUST in 01-SPEC.md has at least one executable requirement owner or a documented external-dependency gate.
- [ ] Every implemented Task has a Requirement ID (above is provisional).
- [ ] Priority and native milestones assigned *after* scope freeze.
- [ ] No duplicate features or conflicting sources remain in the execution-ready tasks.
- [ ] Owner approves the visual contract and scope of optional features.
- [ ] Project #17 parent/subissue graph and items are read back and audited.
- [ ] All open risks are either resolved or explicitly accepted with owner decision link.
