# P1 Candidate Evidence Ledger — 2026-10-27 (historical snapshot)

**Historical 2026-10-27 disposition: `P1_CONDITIONAL_WITH_BLOCKERS`.** This records the pre-integration candidate state; references below to open PRs and unmerged heads are deliberately historical. The live post-integration phase verdict must be documented at [#37](https://github.com/Skyline-Gazer/ALNILAM/issues/37) and cannot be inferred from this snapshot.

This is an evidence ledger for the current P1 candidates, not a phase approval. PRs #97, #98, and #99 are open against `dev`; #79 remains isolated on `chore/79-astro-compatibility-pilot`. No candidate is merged and no P1 PASS is claimed. The P1 parent, Issue #37, stays open.

## A. Repository state

| Ref | SHA / state |
| --- | --- |
| `dev` baseline for these candidates | `1f382aa72052eedbe8a2809011e5a36a82f697d0` |
| `main` | `07fac43cba0c3d303c930c098b6e2124b2c79e4a` |
| #49 / PR #97 | implementation `52686281778086e2e98af245a6b48b899d8acb2c`; matrix docs `bec2882bd7b30ba66036cb87f07f31cc126c0940`; evidence-table refresh `a847f9d0fb085d3609d81f3ce3873fa46a59e7ec`; open to `dev` |
| #50 / PR #98 | implementation `dc9a85ce91154c7cb33f6245ccef1c0703729c1c`; workflow path-filter follow-up `022bb22c3a89da72a5177e1eeca317cd3fcf5478`; open to `dev` |
| #79 / PR #99 | implementation `985664d76ebf4a55f7f1e65e45ebde66f5f5bfba`; independently reviewed report snapshot `0843bc32215fbb3f07021754e6677da229a8dda6`; this ledger refresh is documentation-only; open to `dev` |

The `.ads` gitlink stays at `3abf6025657a5d716476029cc8cbf5239543210b`; the private submodule was not materialized. The #96 CNB pilot remains separate and open/draft. No `main` update, release, tag, or deployment occurred.

The local CLIs are present but do not satisfy the required current-channel preflight: RTK reports `1.0.1` while the installed Homebrew stable is `1.1.0`; CodeGraph reports `1.0.1`, while the required official stable distribution was not available in the previous verified lookup. The authorized immutable CodeGraph source fallback is `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata `1.1.1`, MIT); it is not described as latest stable. No global tool upgrade or installation was performed.

## B. Issue candidates

### #49 — routing and browser lifecycle

[PR #97](https://github.com/Skyline-Gazer/ALNILAM/pull/97) is open from `feat/49-unified-routing-lifecycle` to `dev`. Its two commits are based on the authorized P1 baseline. It repairs native route safety and Pagefind lifecycle while keeping the existing Astro router and Site v1 boundary. The required PR `verify` run [40508608231](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508608231) passed on implementation head `5268628`; push `verify` [40508600972](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508600972) also passed. The cross-layer matrix follow-up passed push `verify` [40527536366](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40527536366) and PR `verify` [40527551576](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40527551576) on head `bec2882`. The subsequent evidence-table refresh head `a847f9d` passed push `verify` [40532937409](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532937409) and required PR `verify` [40532949554](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532949554), which uploaded [`browser-evidence`](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532949554/artifacts/12747168267) (4,607,816 bytes). PR review and merge remain pending.

### #50 — external browser and performance baseline

[PR #98](https://github.com/Skyline-Gazer/ALNILAM/pull/98) is open from `feat/50-browser-baseline` to `dev`, based directly on the same `dev` SHA rather than on the unmerged #49 branch. It adds the disposable external Site baseline, the root/nested browser matrix, Bangumi success/error/timeout fixtures, Lighthouse median summarizer, and bounded evidence artifacts. Its required PR `verify` run [40520545076](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545076) passed on head `dc9a85c`. Both dedicated runs passed on that exact head: push baseline [40520468874](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520468874) and PR baseline [40520545077](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545077). Each uploaded its SHA-bound browser/Lighthouse artifact. A follow-up commit `022bb22` adds the root package manifests and lockfile to the PR path filter. On that head, required PR `verify` [40526354755](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526354755), push `verify` [40526347039](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526347039), and both fresh baseline runs passed: push [40526347054](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526347054), PR [40526354802](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526354802). Each baseline run passed 7/7 tests and uploaded its SHA-bound artifact.

Local evidence on `dc9a85c` with Node `22.23.4` / pnpm `10.19.0`: `pnpm test` (`19/19`), `python3 -m unittest discover -s scripts/tests -p '*_test.py'` (`20/20`), `pnpm check`, `pnpm build`, demo/nested-base compose checks, and `pnpm browser` (`2/2`) passed. The focused baseline previously passed `7/7` locally. The dedicated remote run remains the source for retained CI screenshots, traces, CLS samples, and Lighthouse results.

### #79 — Astro compatibility

The isolated [PR #99](https://github.com/Skyline-Gazer/ALNILAM/pull/99) adds `.github/workflows/p1-astro-compatibility.yml`, `tests/fixtures/astro-compatibility.mdx`, and this compatibility record. It does not change framework dependencies or product source. It compares the actual ALNILAM Astro `7.4.2` lock with pinned Shirone Astro `7.3.8`, and tests a disposable external Site at root and nested base. The corrected disposable fixture has Site digest `06acb0514cd3f56d8363ded3981d227b2e1efc4c5f140f13308a4f575c5702dd`. Both focused push run [40522444780](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522444780) and PR run [40522572115](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572115) passed and uploaded `astro-compatibility-evidence`; the PR artifact records browser smoke `2/2`, 16 pages in 1.74 s / 734660 KiB peak RSS at root, and 16 pages in 1.51 s / 685692 KiB peak RSS at nested base. These are single-run hosted-runner diagnostics, not a controlled comparison. The required PR `verify` run [40522572426](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572426) passed on implementation head `985664d`. The independently reviewed report snapshot `0843bc3` passed push `verify` [40531514672](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514672), required PR `verify` [40531519650](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519650), and focused push/PR compatibility runs [40531514441](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514441) / [40531519875](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875). The PR focused artifact is [`astro-compatibility-evidence`](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875/artifacts/12745539049).

## C. Verification ledger

| Check | Revision / environment | Result | Evidence |
| --- | --- | --- | --- |
| PR #49 frozen CI `verify` | `5268628`, GitHub Actions Node 24 / pnpm 10.19.0 | PASS | [PR run](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40508608231) |
| PR #50 frozen CI `verify` | `dc9a85c`, GitHub Actions Node 24 / pnpm 10.19.0 | PASS | [PR run](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545076) |
| #50 push browser/Lighthouse baseline | `dc9a85c`, GitHub Actions Node 24.21.0 / pnpm 10.19.0 / Chromium 156 | PASS; 7 expected, 0 skipped, 0 unexpected; artifact uploaded | [Run and artifact listing](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520468874) |
| #50 PR browser/Lighthouse run | `dc9a85c`, GitHub Actions Node 24.21.0 / pnpm 10.19.0 / Chromium 156 | PASS; 7 expected, 0 skipped, 0 unexpected; artifact uploaded | [PR run and artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545077) |
| #50 local Node / Python / Astro / compose / regular browser | `dc9a85c`, macOS arm64, Node 22.23.4 / pnpm 10.19.0 | PASS | Commands and scope listed above; see [PR #98](https://github.com/Skyline-Gazer/ALNILAM/pull/98) |
| #79 focused push compatibility workflow | `985664d`, GitHub Actions Node 24.21.0 / pnpm 10.19.0 | PASS; external root/nested MDX, browser smoke 2/2, digest stable; artifact uploaded | [Push run](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522444780) |
| #79 PR focused compatibility workflow | `985664d`, GitHub Actions Node 24.21.0 / pnpm 10.19.0 | PASS; external root/nested MDX, browser smoke 2/2, digest stable; artifact uploaded | [PR run and artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572115) |
| #79 PR required `verify` | `985664d` | PASS | [Verify run 40522572426](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572426) |
| #49 docs-only cross-layer matrix follow-up | `bec2882`, GitHub Actions Node 24 / pnpm 10.19.0 | PASS | Push [40527536366](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40527536366) · PR [40527551576](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40527551576) |
| #49 evidence-table refresh | `a847f9d`, GitHub Actions Node 24 / pnpm 10.19.0 | Required `verify` PASS; `browser-evidence` artifact uploaded | Push [40532937409](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532937409) · PR [40532949554](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532949554) · [Artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40532949554/artifacts/12747168267) |
| #50 workflow path-filter follow-up | `022bb22`, GitHub Actions Node 24 / pnpm 10.19.0 | Required `verify` PASS; push and PR browser/Lighthouse runs PASS, 7/7 each; artifacts uploaded | [Push verify](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526347039) · [PR verify](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526354755) · [Push baseline](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526347054) · [PR baseline](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526354802) |
| #79 independently reviewed report snapshot | `0843bc3`, GitHub Actions Node 24 / pnpm 10.19.0 | Required `verify`, push CI, and focused push/PR compatibility workflows PASS; artifact uploaded | [Push verify](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514672) · [PR verify](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519650) · [Push focused](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514441) · [PR focused](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875) · [Artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875/artifacts/12745539049) |
| Full upstream Shirone E2E/lint at Astro 7.3.8 and 7.4.2 | pinned-source harness `bf6a5871aed39d87f0232e8e360c343ff3362566` | PARTIAL: identical `415` pass / `17` fail / `48` upstream skips; lint has 5 errors | [Run 40284029959](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40284029959) |

The local #50 command results do not substitute for the independent focused CI run. See the issue reports for exact route scope and limitations.

## D. Browser and performance coverage

The #50 external Site browser matrix exercises root and `/ALNILAM/` bases at `390×844` and `1440×900`, dark and light themes, home/posts/pagination/article/localized article/archive/tag/search flows, keyboard focus, reduced motion, delayed image loading, repeated navigation/back/forward/scroll restoration, disabled Bangumi, and enabled Bangumi at both bases. The PR run passed all 7 Playwright tests and uploaded route samples, screenshots, shift-source data, and console/request error evidence.

The workflow-path follow-up on `022bb22` passed both baseline reruns and uploaded the [push artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526347054/artifacts/12745407104) (`p1-browser-baseline-40526347054-1`, 37,645,763 bytes) and [PR artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40526354802/artifacts/12745950123) (`p1-browser-baseline-40526354802-1`, 37,583,307 bytes); each passed 7/7 browser tests. The LCP/CLS ranges below come from the inspected original implementation-head push artifact [40520468874](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520468874); the follow-up changed workflow triggers only. That original push run recorded 3-run lab medians for eight URLs (four routes at `/` and `/ALNILAM/`) in both mobile and desktop form factors. Mobile LCP ranged from 1.426 to 1.657 s and CLS from 0 to 0.000249; desktop LCP ranged from 1.204 to 1.658 s and CLS from 0 to 0.000564. Lighthouse performance scores were 100 mobile and 89–95 desktop; accessibility scores were 100 with no automated findings in the report. These are local-runner lab data, not field data or an SLA. INP was unavailable (`inpMs: null`). Search-modal Lighthouse state and field p75 are not measured. Font loading that the fixture cannot verify is recorded as `NOT_VERIFIED`; visual contrast remains a manual review item. The artifact and all per-URL summaries are attached to [push run 40520468874](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520468874) and the [PR run 40520545077](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40520545077).

The #79 MDX fixture is a separate compatibility check on a disposable copy of `sites/demo`; it does not replace the #50 external fixture or the production Site contract.

## E. Astro compatibility decision

The candidate verdict is **`COMPATIBLE_AS_IS`** for ALNILAM's locked Astro `7.4.2` and current integrations. The official Content Layer `glob()`, MDX, file routes, `paginate()`, native MPA, custom RSS/sitemap endpoints, and pass-through Site images remain in place. `astro:i18n`, official RSS/sitemap integrations, and `astro:assets` are deferred until an approved contract/output comparison shows a concrete gain. `astro build --timings` is diagnostic only; experimental build flags remain disabled.

The earlier pinned-source comparison passed the tested check/build/smoke phases on Astro `7.3.8` and `7.4.2`, but the full upstream E2E and lint suite was not clean on either version. The focused #79 PR workflow and required generic `verify` both passed on implementation head `985664d`. See [the detailed record](79-ASTRO-COMPATIBILITY.md).

## F. Documentation and project governance

This report and the #79 compatibility report update the active handoff and roadmap. PRs #97, #98, and #99 remain open. The CNB pilot [PR #96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) stays open/draft and separate.

Project #17 was read back after reconciliation: 28 items total; Issues #37, #49, #50, and #79 and PRs #97, #98, and #99 are all `In Progress`. Issue #79 and its PR #99 are separate board items, consistent with existing issue-plus-PR tracking. No project Parent issue or Milestone was set for #79; its issue body identifies its P1 scope. PR #96 remains open/draft and outside this candidate set.

## G. Blockers and limits

- **CI:** Required checks passed on #49 evidence head `a847f9d`, #50 workflow head `022bb22`, and independently reviewed #99 report snapshot `0843bc3`; focused #50/#79 workflows and baseline artifacts are green. This ledger refresh is documentation-only and its new PR #99 checks must pass before merge.
- **Toolchain:** RTK and CodeGraph installed CLI/channel state do not meet the repository's official-current preflight. The required stable CodeGraph distribution was unavailable in the prior verified lookup. Resolution requires the official stable release and approved local installation/channel state; no global changes were made.
- **Project hierarchy:** Issue #79 and PR #99 are on Project #17 as `In Progress`. No project Parent issue or Milestone is set for #79; no hierarchy or milestone was inferred from its issue body.
- **Review/Owner:** Independent final review completed on 2026-10-27 across PR #97 (`bec2882`), #98 (`022bb22`), and #99 (`0843bc3`): no P1 defect; the P2 evidence gaps are resolved in this refresh. No GitHub review was submitted. #97, #98, and #99 remain unmerged; Owner approval, phase closure, `main`, release/tag, deploy, and P2 remain outside this execution.
- **Performance limits:** no field p75, separate Lighthouse search-modal state, or manual contrast sign-off is evidenced here.
- **Upstream:** full upstream Shirone E2E/lint retains the same known failures on both compared Astro versions; this is not a clean upstream suite result.

## H. Gate status

| Gate | Status | Evidence / reason |
| --- | --- | --- |
| G1 Source and architecture | PARTIAL | Existing Shirone/Core/Site baseline is retained; candidate PRs remain open for review. |
| G2 Core/Site | PARTIAL | External fixtures, digest preservation, provenance, and rollback checks passed on candidate runs; combined accepted `dev` evidence awaits merges. |
| G3 Functional | PARTIAL | #50's root/nested 7-test browser matrix and #79's external MDX/browser smoke passed; candidates remain unmerged from `dev`. |
| G4 Toolchain | PARTIAL | Required checks and focused workflows pass on all three implementation heads; the official-current RTK/CodeGraph preflight remains unresolved. |
| G5 Browser/performance | PARTIAL | #50's same-head push and PR matrices and Lighthouse artifacts pass; field p75, search-state Lighthouse, and manual contrast remain unverified. |
| G6 Compatibility | PASS | #79 records `COMPATIBLE_AS_IS` for ALNILAM Astro 7.4.2 versus pinned Shirone 7.3.8; external root/nested MDX, browser smoke, and focused CI pass. No P1 release-critical compatibility risk was found. Identical upstream E2E/lint failures on both versions remain documented. |
| G7 Governance | PASS | Evidence, docs, current PR heads/checks, and Project #17 issue/PR status were reconciled; no Parent/Milestone was inferred for #79. All changes remain on issue-linked PRs to `dev`; no merge/release/deploy occurred, the ADS gitlink is unchanged, and #96 remains separate. |
| G8 Independent phase review | PASS | Independent final review of the three candidate PRs found no P1 defect. Its two P2 evidence findings (stale CI ledger and missing dependency-manifest path filters) are resolved; no GitHub review or phase approval was submitted. |

**Exit result: `P1_CONDITIONAL_WITH_BLOCKERS`.** Do not report the combined P1 gate as passed while any candidate PR is unmerged or its evidence is pending.

## I. P2 handoff

Do not start P2 in this task. After P1 candidates are reviewed, merged to `dev`, and the Owner confirms the phase gate, the proposed first P2 work item is [Issue #51 — Independent Site v2 / schema migration plan](https://github.com/Skyline-Gazer/ALNILAM/issues/51). Keep the released Site v1 TOML contract, Core/Site ownership boundary, and separate CNB pilot intact while preparing that handoff.
