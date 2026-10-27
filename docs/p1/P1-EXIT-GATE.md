# P1 Exit Gate — 2026-10-27

**Disposition: `P1_CONDITIONAL_WITH_BLOCKERS`**

This is an evidence ledger for the current P1 candidates, not a phase approval. PRs #97 and #98 are open against `dev`; Issue #79 is isolated on `chore/79-astro-compatibility-pilot`. No candidate is merged and no P1 PASS is claimed. The P1 parent, Issue #37, stays open.

## A. Repository state

| Ref | SHA / state |
| --- | --- |
| `dev` baseline for these candidates | `1f382aa72052eedbe8a2809011e5a36a82f697d0` |
| `main` | `07fac43cba0c3d303c930c098b6e2124b2c79e4a` |
| #49 / PR #97 | `52686281778086e2e98af245a6b48b899d8acb2c`, open to `dev` |
| #50 / PR #98 | `dc9a85ce91154c7cb33f6245ccef1c0703729c1c`, open to `dev` |
| #79 | `chore/79-astro-compatibility-pilot`, based on the same `dev`; PR is this candidate's review surface |

The `.ads` gitlink stays at `3abf6025657a5d716476029cc8cbf5239543210b`; the private submodule was not materialized. The #96 CNB pilot remains separate and open/draft. No `main` update, release, tag, or deployment occurred.

The local CLIs are present but do not satisfy the required current-channel preflight: RTK reports `1.0.1` while the installed Homebrew stable is `1.1.0`; CodeGraph reports `1.0.1`, while the required official stable distribution was not available in the previous verified lookup. The authorized immutable CodeGraph source fallback is `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata `1.1.1`, MIT); it is not described as latest stable. No global tool upgrade or installation was performed.

## B. Issue candidates

### #49 — routing and browser lifecycle

[PR #97](https://github.com/Skyline-Gazer/ALNILAM/pull/97) is open from `feat/49-unified-routing-lifecycle` to `dev`. Its two commits are based on the authorized P1 baseline. It repairs native route safety and Pagefind lifecycle while keeping the existing Astro router and Site v1 boundary. The required PR `verify` run [40508608231](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508608231) passed on head `5268628`; push `verify` [40508600972](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508600972) also passed. PR review and merge remain pending.

### #50 — external browser and performance baseline

[PR #98](https://github.com/Skyline-Gazer/ALNILAM/pull/98) is open from `feat/50-browser-baseline` to `dev`, based directly on the same `dev` SHA rather than on the unmerged #49 branch. It adds the disposable external Site baseline, the root/nested browser matrix, Bangumi success/error/timeout fixtures, Lighthouse median summarizer, and bounded evidence artifacts. Its required PR `verify` run [40520545076](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545076) passed on head `dc9a85c`. The dedicated PR browser baseline [40520545077](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545077) was still in progress at the last check; performance medians and its artifact are therefore pending.

Local evidence on `dc9a85c` with Node `22.23.4` / pnpm `10.19.0`: `pnpm test` (`19/19`), `python3 -m unittest discover -s scripts/tests -p '*_test.py'` (`20/20`), `pnpm check`, `pnpm build`, demo/nested-base compose checks, and `pnpm browser` (`2/2`) passed. The focused baseline previously passed `7/7` locally. The dedicated remote run remains the source for retained CI screenshots, traces, CLS samples, and Lighthouse results.

### #79 — Astro compatibility

The isolated branch adds `.github/workflows/p1-astro-compatibility.yml`, `tests/fixtures/astro-compatibility.mdx`, and this compatibility record. It does not change framework dependencies or product source. It compares the actual ALNILAM Astro `7.4.2` lock with pinned Shirone Astro `7.3.8`, and tests a disposable external Site at root and nested base. The corrected disposable fixture has Site digest `06acb0514cd3f56d8363ded3981d227b2e1efc4c5f140f13308a4f575c5702dd`. Local root/nested builds, MDX output, artifact checks, external browser smoke, and Site immutability passed. Focused remote CI remains required before this candidate's evidence is complete.

## C. Verification ledger

| Check | Revision / environment | Result | Evidence |
| --- | --- | --- | --- |
| PR #49 frozen CI `verify` | `5268628`, GitHub Actions Node 24 / pnpm 10.19.0 | PASS | [PR run](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508608231) |
| PR #50 frozen CI `verify` | `dc9a85c`, GitHub Actions Node 24 / pnpm 10.19.0 | PASS | [PR run](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545076) |
| PR #50 focused browser/Lighthouse run | `dc9a85c` | IN PROGRESS at last read | [Run and artifact listing](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545077) |
| #50 local Node / Python / Astro / compose / regular browser | `dc9a85c`, macOS arm64, Node 22.23.4 / pnpm 10.19.0 | PASS | Commands and scope listed above; see [PR #98](https://github.com/Skyline-Gazer/ALNILAM/pull/98) |
| #79 external MDX root/nested and browser smoke | `dev` baseline plus isolated fixture, Node 22.23.4 / pnpm 10.19.0 | PASS locally; remote pending | [#79 report](79-ASTRO-COMPATIBILITY.md) |
| Full upstream Shirone E2E/lint at Astro 7.3.8 and 7.4.2 | pinned-source harness `bf6a5871aed39d87f0232e8e360c343ff3362566` | PARTIAL: identical `415` pass / `17` fail / `48` upstream skips; lint has 5 errors | [Run 40284029959](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40284029959) |

The local #50 command results do not substitute for the independent focused CI run. See the issue reports for exact route scope and limitations.

## D. Browser and performance coverage

The #50 external Site browser matrix exercises root and `/ALNILAM/` bases at `390×844` and `1440×900`, dark and light themes, home/posts/pagination/article/localized article/archive/tag/search flows, keyboard focus, reduced motion, delayed image loading, repeated navigation/back/forward/scroll restoration, disabled Bangumi, and enabled Bangumi at both bases. The test emits route samples, screenshots, shift-source data, and console/request errors. The dedicated run has 7 Playwright tests when complete.

Lighthouse is configured for `/`, `/posts/`, `/posts/cover-story/`, and `/tags/`, at both bases, mobile and desktop, three runs per URL with medians kept separate from browser field data. Search-modal Lighthouse state and field p75 are not measured. Font loading that the local fixture cannot verify is recorded as `NOT_VERIFIED`; visual contrast remains a manual review item. Do not claim the pending run's artifact or metrics before its completion.

The #79 MDX fixture is a separate compatibility check on a disposable copy of `sites/demo`; it does not replace the #50 external fixture or the production Site contract.

## E. Astro compatibility decision

The candidate verdict is **`COMPATIBLE_AS_IS`** for ALNILAM's locked Astro `7.4.2` and current integrations. The official Content Layer `glob()`, MDX, file routes, `paginate()`, native MPA, custom RSS/sitemap endpoints, and pass-through Site images remain in place. `astro:i18n`, official RSS/sitemap integrations, and `astro:assets` are deferred until an approved contract/output comparison shows a concrete gain. `astro build --timings` is diagnostic only; experimental build flags remain disabled.

The earlier pinned-source comparison passed the tested check/build/smoke phases on Astro `7.3.8` and `7.4.2`, but the full upstream E2E and lint suite was not clean on either version. The new focused workflow must finish before the compatibility PR has remote CI evidence. See [the detailed record](79-ASTRO-COMPATIBILITY.md).

## F. Documentation and project governance

This report and the #79 compatibility report update the active handoff and roadmap. PRs #97 and #98 remain open; the #79 PR is this branch's review surface. The CNB pilot [PR #96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) stays open/draft and separate.

The last authenticated Project #17 read showed #49 and #50 as In Progress, #79 absent, no milestone, and no parent/sub-issue links for #37. A fresh read/write could not be completed during this continuation: the GitHub API connector returned transport errors and the project page loaded without board contents. No board change is claimed; current item membership/status requires an authenticated Projects v2 readback.

## G. Blockers and limits

- **CI:** #50's dedicated browser/Lighthouse run and #79's focused compatibility CI must finish; read their exact head SHAs and artifact contents afterward.
- **Toolchain:** RTK and CodeGraph installed CLI/channel state do not meet the repository's official-current preflight. The required stable CodeGraph distribution was unavailable in the prior verified lookup. Resolution requires the official stable release and approved local installation/channel state; no global changes were made.
- **Project permissions/transport:** Project #17 membership/status is not freshly verified. Restore the GitHub Projects v2/API path and add #79 only after reading back its current state.
- **Owner review:** #97, #98, and the #79 candidate are unmerged. Phase closure, `main`, release/tag, deploy, and P2 remain outside this execution.
- **Performance limits:** no field p75, separate Lighthouse search-modal state, or manual contrast sign-off is evidenced here.
- **Upstream:** full upstream Shirone E2E/lint retains the same known failures on both compared Astro versions; this is not a clean upstream suite result.

## H. Gate status

| Gate | Status | Evidence / reason |
| --- | --- | --- |
| G1 Source and architecture | PARTIAL | Existing Shirone/Core/Site baseline is retained; candidate PRs remain open for review. |
| G2 Core/Site | PARTIAL | External fixtures, digest preservation, provenance, and rollback checks passed on candidate runs; combined accepted `dev` evidence awaits merges. |
| G3 Functional | PARTIAL | Root/nested and browser cases are implemented; #50 dedicated remote matrix is still running. |
| G4 Toolchain | PARTIAL | #49/#50 `verify` runs pass; #79 remote CI is pending and official-current tool preflight is unresolved. |
| G5 Browser/performance | PARTIAL | Local matrix passed; focused remote artifact/medians pending; field p75 is not measured. |
| G6 Documentation/governance | PARTIAL | Candidate docs are updated; Project #17 readback and #79 membership are unverified. |
| G7 Delivery and isolation | PARTIAL | Issue-linked PRs target `dev`, no release/merge/deploy; #96 remains separate. |
| G8 Independent phase review | NOT VERIFIED | Independent review of the final candidate set and evidence is still required. |

**Exit result: `P1_CONDITIONAL_WITH_BLOCKERS`.** Do not report the combined P1 gate as passed while any candidate PR is unmerged or its evidence is pending.

## I. P2 handoff

Do not start P2 in this task. After P1 candidates are reviewed, merged to `dev`, and the Owner confirms the phase gate, the proposed first P2 work item is [Issue #51 — Independent Site v2 / schema migration plan](https://github.com/Skyline-Gazer/ALNILAM/issues/51). Keep the released Site v1 TOML contract, Core/Site ownership boundary, and separate CNB pilot intact while preparing that handoff.
