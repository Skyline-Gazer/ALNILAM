# ALNILAM Next — Spec-to-Issue traceability

> **DRAFT**. Actual requirement coverage, Project item membership, native parent hierarchy and functional PASS statuses have **not been independently verified**. This table is a planning index, not a product pass report.

Traceability rule: requirement → selected source/implementation → atomic Issue → PR + changed files → CI/browser evidence → owner decision. Scope changes must revise Spec and keep the former decision/link.

## Proposed work-item traceability (all 35 existing atomic Issues)

| Phase | Candidate Issue | Spec requirement IDs | Planning status |
| --- | --- | --- | --- |
| P0 | #43 | PRD-01, NFR-02 | Pending Spec freeze |
| P0 | #44 | PRD-02, PRD-06, MOD-04 | Pending Spec freeze |
| P0 | #45 | NFR-03 | Pending Spec freeze |
| P0 | #46 | PRD-01, CS-01, MOD-03, NFR-07 | Pending Spec freeze |
| P1 | #47 | PRD-02, NFR-01 | Pending Spec freeze |
| P1 | #48 | PRD-01, PRD-02, PRD-04 | Pending Spec freeze |
| P1 | #49 | PRD-02, PRD-06, NFR-01 | Pending Spec freeze |
| P1 | #50 | PRD-04, PRD-05, NFR-05 | Pending Spec freeze |
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
| P6 | #76 | PRD-01, NFR-02, NFR-07 | Pending Spec freeze |

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
- P5 #67/#68/#69 historically conflict with recorded feature deferral; status remains **not approved** until product scope is explicitly reconciled.
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