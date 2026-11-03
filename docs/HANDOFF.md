# ALNILAM — AI Agent Handoff

## Owner correction — actual Shirone frontend Base (2026-11-03)

Owner confirmed that pages/layout/main components must use the real pinned Shirone
implementation. Earlier M3E-inspired local UI and its passing checks do not prove
that migration. PR #47 is WIP/unmerged; old snapshots are deviation evidence, not
an approved target. Reuse this chain for the correction; no new approval ritual.

- Pinned source `LyraVoid/Shirone@55a84b2322bdfb634a59ca6383bb242e5ce646bf`
  is retained under `themes/shirone/upstream` with MIT license and per-file hashes.
  Pure source commit `59097e72bdc3947de3ddfae5718d3c0690cd911d` is separate
  from consumer adapters. Upstream assets/content/fonts/scripts/workflows excluded.
- Working homepage directly renders original MainGridLayout/PostPage, top bar,
  sidebar, native cards, HCT/settings/drawer. Old ALNILAM hero is absent.
  Existing Core composer/YAML-only Site loader/Pagefind/provenance retained;
  field mapping is in memory and user-config browser module contains only resolved
  public values, never Node filesystem imports. No content:sync invocation.
- Local raw compose succeeds at root and /ALNILAM/ (13 pages each), unchanged Site
  digest `5fe6379c403641e98934ab41a8a4700b8e477cf4b336a2c7c4eaf6875e0294be`.
  Native-home browser cases 4/4 PASS at 1440/390 root/subpath, canonical, drawer,
  no overflow/page errors. App Astro check: 18 files, zero diagnostics; upstream
  tooling still warns TypeScript5.9 vs6 metadata. This is not full upstream typecheck.
- Canonical/skip-link and pass-through cover/banner dimensions adapted in source,
  changes explicitly listed in SOURCE.json. Existing artifact budget still FAILS:
  homepage9 islands vs2, HTML91.7KiB vs64. No checks weakened or disabled.
- Remaining: migrate the other routes off the old UI, preserve SEO/i18n/optional
  behavior, fix/measure native runtime budgets against actual upstream baseline,
  adapt stale old-UI browser expectations with real behavior evidence, then native
  CI/CodeBuddy and reviewable integration. DO NOT claim migration/P3 accepted.
- Effective ADS pin and main/mirror/tag/deploy boundaries remain unchanged.


## Autonomous continuation — #58–#60 merged / #61 in progress (2026-11-03)

Current checkpoint — 2026-11-03:
#60 [PR #46](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/46) merged normally into
CNB dev at `046f251d0092adee8d7d7e091df6bce82dd3ac16`; source
`aaf48cac56585fcfe812c0a0c2393d32990404e9`, tested candidate
`8956ddf069d13e746f133fb12b0210e787481f15`. Source ancestry and identical tree verified.
[Functional CI](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-3qn-1k6duhckl)
SUCCESS, 14m0s. CodeBuddy structured status passed with two warning / one info;
comments disposed in `2117210143129825280`, info ID `2117209735409926144`.
No separate reviewer approval claimed. #60 Closed / Project Done.
[Actual browser/CLS evidence](https://cnb.cool/-/files/qFV4QWmSEWRUfrFEOd8XHA/64f1e6d3-b3e7-4c51-aae3-da9c31b6497e/alnilam-60-lifecycle-aaf48ca.zip)
retains final 6/6, enabled Comments.svelte with mock response and provenance.

#61 starts from that dev: reuse Playwright and current artifact retention; fixed
home/list/article/search/tags/tag/archive screenshots at 1440/390, dark/light,
root/subpath, loaded images, JSON manifest and human-readable HTML gallery.
Independent `/categories/` is not implemented (planned #62); record P2 functional gap
and keep #61/Phase P3 open until category evidence and native CI archives exist.
New browser cases are local until the target-owned harness lands; do not claim the
current PR's trusted target runs candidate-only tests. No new CI framework.
Goal runner still reports `usageLimited`; current session tools work, no background
agent execution is claimed. Ordinary development continues within existing scope.

- #58 / CNB PR #44 merged normally into dev at `c3f554144d0baed8a2d0a0d110b7567b1fdffdb7`.
  Source `c503cb1a5bbd3d680fadc5dca31fa408c1ed90f6`; tested candidate
  `d939b8801c7b38713bab5f9c91ed4fd02a6d5ce7`; source ancestry and identical tree verified.
  [Native CI](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-k6t-1k6dncf4e)
  SUCCESS, 15m38s. CodeBuddy advisory completed, two comments dismissed with actual
  short-table alignment/mutation probe and navigation evidence in PR comment
  `2117186781536022528`. Serial local 8 browser cases + review probe PASS (9 total).
  Earlier environment/concurrent diagnostic failures are disclosed, not product PASS.
  Issue #58 Closed / Project Done. No separate post-merge push CI is configured.
- #59 / [CNB PR #45](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/45) merged normally
  at `d4df50e97b7c55f0eb814fa08e5a2f68ab9a720b`, source
  `9fbe273b5e93e6048b3100ad4c006f8979a62bed`, tested candidate
  `d23bcf27b7feb6424af308bb749383412926618c`; source ancestry and tree equality verified.
  [Native functional CI](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-1p9-1k6dpqa24)
  SUCCESS, 14m24s. Mobile disclosure, 44px controls, Escape focus, resize reset and
  pre-paint theme/control synchronization delivered. Original local browser 10/10,
  final affected settings 2/2, Node 5/5, type/build/budget checks PASS.
  CodeBuddy visible state/resize advice adopted; false-positive focus/state claims
  disposed in PR comments `2117188579567038464` / `2117189598321541120`.
  Advisory returned prose, not structured approval; no approval claimed.
  #59 Closed / Project Done. No separate post-merge push CI configured.
- #60 is local implementation from dev, incorporating #59 without publishing a
  second unmerged feature PR: native MPA retained, SSR headings-based sticky TOC,
  search focus/Escape/timer/request cleanup, popup anchored to header, mobile
  navigation overlay without article displacement, and initial comments space reserved. No second router, settings store or SDK.
  Browser probe caught search left edge at -31px on 390px (scrollWidth alone missed
  it); fixed with header anchoring and explicit left/right checks incl. 320px.
  Four root/subpath 390/1440 lifecycle cases passed before final integration;
  combined run passed 13/14; one immediate-resize measurement read an unsettled frame.
  Strict left/right checks now retry until layout settles; final affected lifecycle
  and settings scenarios pass 6/6. Original reading/search cases passed in that
  integration run. Type check, root/subpath builds/budgets and Node 5/5 PASS.
  Existing shared CLS observer/budget reused. Below 360px show the accessible brand
  icon rather than stacking the site title vertically.
  An enabled temporary Site exercised actual Comments.svelte with a labelled mock
  Giscus response: delayed 260px iframe initially gave CLS 0.10118367 on mobile;
  reserved initial area fixed it. Final integration: CLS 390=0.00982235,
  1440=0.00307803, zero initial provider requests and exactly one after scroll.
  No live-provider claim. Final native CI and merge are recorded above.
  Root/subpath and enabled-Site builds preserve input digest. A /tmp output probe
  hit Astro EXDEV moving assets across filesystems; workspace output worked. This
  output-path limitation is not a #55 real-Site CI result or a blocker to this UI.
- #55 remains NOT_VERIFIED; PR #43 ADS proposal stays unmerged; effective pin b8d9cfc.
  Main/mirror/tags/deployments and ADS upstream are untouched.


## P3 #57 delivered / #58 resumed — 2026-11-02

- CNB PR #42 merged normally at `1353df3e39a5f521c88cfb79b00ff3ef6c103f0f`,
  source `7b0e160931e513421dca6729cefa2fa715acdbf0`, tested merge
  `b6dae35a9b5c44250f40ec42e751c326ef8219c7`; ancestry and tree equality verified.
  Native [functional CI](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-t0g-1k6dlpg7s)
  success (16m56s), including 19 browser passes / one intentional skip.
  [Advisory](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-tsp-1k6dlpg7r)
  completed; Bangumi's old token was fixed, legacy Editorial fallback and test-scope
  advisories have native dispositions. No structured reviewer approval is claimed.
  #57 Closed / Project Done. One M3E token source, data-theme API and shared Search
  semantic colors are delivered. ADS pin remains b8d9cfc.
- PR #41's final [native run](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-9um-1k6dla1v5)
  is ERROR, not PASS: functional checks/19 browser tests completed, then the final
  live-ref check rejected the already-merged target. No product regression was
  established and no adoption rerun was needed. Preserve that result.
- #58 starts independently from the verified #57 dev: retain one-post-per-row and
  28% desktop cover geometry; contain long titles, code/tables and rich media,
  preserve card/tag click targets, and capture 1440/390 root/subpath evidence.
  Local type/build/budget and five affected token/browser-harness checks pass;
  existing plus new browser cases pass 8/8; the final four edge cases also pass
  with actual pre/code markup, page-error capture and labelled report steps.
  Screenshots are attached in PR #44; current source/CI is recorded there.
  New edge-case tests use clearly labelled synthetic DOM content; they do not
  establish #55 real external-Site CI acceptance or P3 phase completion.
- Proposed ADS cnb/dev `9e36584516205bc11e7b7f1fd7ea0529901d855a` was compared
  read-only: exactly six CNB adapter files, no Core delta. Any proposed pin update
  is proposed in [CNB maintenance PR #43](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/43)
  (source `58f67b3ddbf68d542a49c40a4c5e1d72a9d2865b`, #120); only gitlink,
  ads-pin.txt and AGENTS change. Fourteen existing Python tests and proposed pin
  check pass. PR remains unmerged; dev pin is unchanged and it does not block #58.
  Production preflight limits and #55 NOT_VERIFIED / T04 history below remain.

## ADS adoption reconciliation — Owner correction 2026-11-02

Current project-local policy is [AGENTS.md](../AGENTS.md). It supersedes older
mandatory per-change CodeBuddy/complete-CI/protection wording below, without
rewriting its historical outcomes. Baseline CNB dev is
`bb7e6afacba2f005cbc887dd063573cb711bc679`; `.ads` remains pinned to
`b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`. No bootstrap or pin upgrade.

- Native settings readback: only `main` has a protection rule; dev has none.
  Ordinary PR or authorized non-force integration is permitted. CodeBuddy is
  already advisory in `.cnb.yml`; functional tests and coverage remain useful
  feedback, with actual failures reported. No new CI framework or security audit.
- P2 #51–#54/#56 are complete; reuse their evidence. #55 stays
  **NOT_VERIFIED** for a real external Site CI; Demo fixtures do not satisfy it.
  T04 A03 history is unchanged. Next independent feature: P3 #57 under #39;
  P1 is accepted and P2 configuration/resource contracts are stable, so this
  token/component work does not depend on #55 or claim the P2 Gate passed.

### Production promotion preflight — read-only

Both CNB/GitHub main remain `285a62cecd87f8f20276c7cc989537a391f488c8`.
CNB main rule `b28b7af69320201d1cf206ebf28373980add1451` requires PR,
review (count 1, ratio 50), status checks, and has no master manual-merge/push
exception. Its single-maintainer merge path is **not verified/ready**; do not
attempt a merge or silently weaken that rule. GitHub main ruleset requires PR,
resolved threads and current `verify` (zero fixed approvals); it is a separate
production constraint, not proof CNB main can merge.

GitHub main's `.github/workflows/ci.yml` still hardcodes ADS
`1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`. Current dev uses
`ads-pin.txt` plus `scripts/check-ads-pin.sh`, allowing the exact approved pin or
an omitted production gitlink. A future release/mirror PR must test its actual
candidate workflow/tree; do not assume old-main verify accepts a new/omitted pin.
No production workflow or branch was changed for this preflight.

Existing mirror preparation is local-only `scripts/cnb-mirror-candidate.py`;
it does not push refs. Production synchronization remains an explicitly
approved sync-branch/PR flow, not a new automatic mirror. CNB `.cnb.yml` has PR
feedback only, no publish/mirror/deploy stages. Actual GitHub main Deploy is
`workflow_dispatch` only and Pages uses workflow builds. Its environment has
branch restrictions, **no required-reviewer approval rule**; manual dispatch is
not itself proof of Owner approval. Do not dispatch. Public checkout skips ADS.

The mistakenly sent ADS release instruction was revoked after remote side
effects had already occurred. No further ADS writes are authorized here; do
not delete tags, roll back ADS main or rewrite its history. ALNILAM consumes
only its retained approved pin, irrespective of later ADS branch/release state.

## P2 Owner Final GO — 2026-11-02

This checkpoint supersedes the prior dev-protection rescue instructions. Owner
removed CNB dev protection; ordinary PR merges or non-force Git integration are
allowed. Main, production mirrors, tags and deployments remain separately
protected/authorized. ADS stays pinned to `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`.

- PR #40 source `6c19d930eeff17f0f627ec5b2f327205d831dc3e` was delivered by
  non-force Git merge `fb49e8c08e237f6b8993cd41428b43fd77a459cc` into CNB dev.
  Normal Merge API returned HTTP 409 / 2009014 (`status_check`); PR #40 was
  explicitly commented and closed, **not** represented as a platform PR merge.
  Source ancestry and identical merged/source trees were verified. Existing
  3/3 harness and 15/15 affected-test evidence was reused.
- T06 PR #39 final candidate is `83b1bfdc829c90ed7fc91547bfb6d10796360de7`.
  Existing `p2-t06-review-fixes` was merged without rewriting history. Shared
  YAML aliases pass; actual cycles fail with a contract error. Workflow tests
  read the trusted tree; the target-owned workflow copy comes from PR #40.
  Merge-key assertions and environment/provenance documentation now describe
  their exact tested scope. The onboarding example no longer creates a broken
  Markdown link in the existing docs check.
- Local validation: full Node suite 117/117 on the same final product code;
  subsequent affected alias assertions 2/2, marker/provenance tests 3/3,
  Astro check 0 errors/warnings/hints, static build/artifact budgets PASS,
  Python suite 14/14. Synthetic marker checks do not prove arbitrary trusted
  MDX cannot publish environment values.
- Current-head CodeBuddy review `2117134518142595072` concerns supplemental
  static-test placement/completeness and repeated assertions, accepted as
  nonblocking advisories with native replies. Earlier material findings were
  fixed. The cycle-removal suggestion was disproved: the installed YAML
  library returns an actual self-referential object from `toJS`; the active
  recursion-stack guard is necessary.
- Current candidate native trusted run:
  https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-rl5-1k6dddi7n
  Review run:
  https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-d2e-1k6dddi7m
  Read live results; do not substitute local PASS for native CI PASS.
- PR #39 merged normally via the CNB API as
  `d717c0b657a99f312cc0523e90737ac399e75110`; source ancestry and merged tree
  were verified against source and tested merge
  `3844d8e3ce465181fccdd11045cb139e1e43ed88`. Native trusted consumer passed
  in 13m53s (including 19 browser passes and one intentional skip); advisory
  review pipeline passed in 49.9s. Review findings are not an approval claim.
  The Gate bootstrap failure is resolved; earlier failing/stale runs retain
  their historical results. #56 is complete; #38 remains Open for #55.
  Project #17: #51–#54 and #56 Done, #38/#55 In Progress.
  P2 Phase Gate remains **NOT_MET / NOT_VERIFIED**, solely for the real
  external Site CI acceptance gap. CNB's merge API still has no expected-head
  parameter; immediate ref readback mitigates but does not eliminate that race.
- #55 remains Open / external Site CI **NOT_VERIFIED**: existing authorized
  repository metadata and Issue records provide no dedicated real Site or
  scoped checkout credential. Demo/temporary fixtures are not acceptance.
  No new environment/service or production action was created for acceptance.
- #51–#54 are already Closed / Project Done. The T04 historical review
  discipline deviation remains recorded on parent #38 comment 6569958426;
  no historical rescore or audit was performed.


## P2/T01 current state — 2026-10-31

Read live refs before acting. This section supersedes the 2026-10-30 preservation
snapshot below; that snapshot is retained only for traceability.

### Refs and tracker at this readback

- CNB [PR #23](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/23) targets `dev` from
  `feat/51-site-v2-yaml-contract`. Read the live head, checks and review before any
  merge decision.
- CNB [PR #25](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/25) restored the
  target-owned trusted harness and merged into `dev` at
  `d8ee0b9efb87c7d39629da2dc62ccf44ab9ef169` (parents `9ac9db41c897ada12431faad39ac5939139229a6`
  and `f507146ad5bd43648d52cb287974867c31d1173d`).
- GitHub Issue [#51](https://github.com/Skyline-Gazer/ALNILAM/issues/51) remains Open and
  Project #17 still shows `Todo` until PR #23 lands and the acceptance evidence is recorded.

### State of the T01 implementation

- YAML-only Site v2 is implemented on the branch: strict `schemaVersion: 2`,
  closed-world unknown-field rejection, locale/routing/taxonomy validation,
  plain-data-only YAML parsing (duplicate keys, unresolved tags and `!!binary`
  values fail closed) and an actionable rejection for TOML-only Sites.
- The branch carries a v2-only contract suite. The migration-window suite merged on
  `dev` by PR #25 is what the trusted gate uses to review this PR; it selects the
  contract declared by the candidate demo and is replaced by the v2-only suite after
  this migration lands.
- CodeBuddy findings from the 2026-10-30/31 rounds are either fixed or carry a recorded
  disposition; false positives are evidenced by the green trusted run and local runs.

### Evidence

- Local checks on each pushed head: `pnpm install --frozen-lockfile`, `pnpm test` 56/56,
  `pnpm check` 0 errors, `pnpm build` OK, `python3 -m unittest discover -s scripts/tests
  -p '*_test.py'` 31 OK, and `upgrade-check --old 07fac43` exits 0 after printing the
  released Core's contract rejection.
- The PR #23 merge decision records the exact final-head trusted-gate run, the tested
  merge SHA and the current-head CodeBuddy review. Results bound to earlier heads are
  stale and are not acceptance evidence.

### ADS pin update — 2026-10-31

- The ADS gitlink advanced to the `cnb/dev` development line (authoritative pin and
  history: "Identity and baseline" below plus `ads-pin.txt`); this update is part of
  the Lite adoption recorded in `AGENTS.md` and `README.md`.
- The v0.4.1-era developer-tool sections below and in `docs/p0/P0-ACCEPTANCE.md`
  are historical and superseded by this update.

## P2/T03 current state — 2026-11-01

### Refs

- CNB [PR #35](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/35) targets `dev` from
  `p2-t03-resource-cache`; source head `569c2c55232d1839457d3cc98328e642e9791280`
  (docs-only handoff commit appended on top). Read live refs before any merge decision.
- GitHub Issue [#53](https://github.com/Skyline-Gazer/ALNILAM/issues/53) — P2/T03.

### State of the T03 implementation

- Managed build cache (`<repo>/.cache/alnilam`, `ALNILAM_CACHE_DIR` override): the
  verified Site snapshot (deterministic, digest-keyed) and Astro's content/image store
  are keyed by Core revision and Site digest; Vite's dependency cache by Core revision.
  All derived resources are generated only in the build space; removals inside the
  cache refuse symbolic links; containment checks reject cache roots overlapping the
  Site or the output (kept as the `--clean-cache` recursive-delete guard — recorded
  disposition).
- `--clean-cache` removes the managed cache and the legacy `apps/web/.astro` /
  `apps/web/node_modules/.astro` locations unconditionally.
- Same-(revision, digest) builds serialize on an exclusive lock; stealing requires
  the holder process to be gone or the lock to exceed six hours, with rename-aside +
  inode + moved-lock identity checks so exactly one builder wins.
- Post-relative `![]()` images resolve in the build space via Astro's image pipeline
  (`/_astro/...`, base-prefixed, SVG-verified under `/ALNILAM/`); absolute
  `/site-assets/...` and remote `http(s)` URLs are unchanged. Inline HTML `<img>` is
  not rewritten.
- Fixed root cause of the historical intermittent `ImageNotFound`: Astro's persistent
  content store bound image importer paths to per-build random temp snapshot paths;
  the deterministic snapshot removes the mismatch.

### Verification

- `pnpm test` 94/94, `pnpm check` clean, `pnpm build` + artifact-check budgets OK.
- Trusted consumer CI green on merge of `569c2c5`:
  [cnb-9ms-1k6bu0sjs](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-9ms-1k6bu0sjs#001)
  (15m1s: unit, coverage, astro check, three deterministic composes, browser 19/19,
  Lighthouse, SCA). Earlier green runs of the same code family: cnb-9nh-1k6bee21p,
  cnb-33l-1k6bqhoor, cnb-fe3-1k6bsfcjq.
- Byte-equivalence proven: `dist/` trees for root and `/ALNILAM/` bases are identical
  to dev `5636e5e` (excluding provenance timestamps).

### Open items

- Browser-audit flake on loaded CNB runners (one random Playwright test hangs 90s or
  the `/ALNILAM/` 390 scroll-restoration check reports a fixed 396px delta) — same
  class PR #28 hardened; retries pass; content is byte-identical to dev.
- CodeBuddy containment-check reduction request (cache-contains-site/output) not
  adopted; rationale recorded in the PR thread (recursive-delete guard).

## Legacy environment work still not recovered (#94/#100)

- Issue #94 (`chore/94-cnb-browser-ci-pilot`): uncommitted worktree changes in the old
  environment were never recovered into this clone; do not treat them as present.
- Issue #100: the unpushed commits `4e481ff` and `a715fe2` exist only in the old
  environment. Do not blind-redevelop them, do not mix them into PR #23 or the ADS PR,
  and do not overwrite or delete that worktree — it remains the only copy.

## Current development authority — 2026-10-30

CNB `KoolingMachine/ALNILAM` is now the development code authority. Verified refs at cutover acceptance:

- CNB `dev`: `e602e29a1fc9cff20e438b29251fec4482eba64b`
- GitHub `dev`: `0d11757e111a4a5169d3a473b736ed2918bd3d2e`
- Shared Git tree: `5530addc6e4d719229641e9e2cd0828d78256e78`

New feature branches start from CNB `dev`. The 2026-11-02 Owner correction above supersedes the earlier per-change CI/CodeBuddy approval requirement. GitHub Issues and Project #17 remain the task-management authority; GitHub code is a mirror target only and does not accept new feature PRs. GitHub `dev` history is not rewritten and the two remotes do not require identical commit SHAs.

Accepted residual risk remains: CNB can still expose zero-status mergeability and the recheck/merge window is not atomic. Independent Gatekeeper, fixed Reviewer, Auto Merge, force push and bypass are not part of the accepted workflow.

## Current P2/T01 checkpoint — Issue #51

Implementation branch: `feat/51-site-v2-yaml-contract` from CNB `dev`.

Scope in this slice:

- Site v2 is YAML-only via `alnilam.config.yaml`.
- No TOML/TS/JS/JSON config fallback and no v1 auto-migration engine.
- Schema v2 fails closed on unknown fields and validates locale, routing and taxonomy metadata.
- Demo Site, onboarding docs and contract tests move to v2 while historical v1 fixtures remain under `tests/fixtures/site-v1-legacy` for negative compatibility evidence.

## Current workflow decision — 2026-10-30

The Owner selected Agent-governed PRs: current CI plus actual CodeBuddy review, followed by an Agent-initiated normal merge. Independent Gatekeeper, fixed Reviewer and CNB Auto Merge prerequisites are canceled; zero-status platform risk remains disclosed. PR #96 merged at 400290acadca8a0417d41792f17fedb842993d1f. See [current decision and native evidence](cnb/CUTOVER-READINESS.md). The checkpoints below retain their historical SHA scope.

## Current P1 integration checkpoint — 2026-10-30

Current native repair evidence: [CNB PR #17](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/17) trusted target pipeline **PASS**, target `911fe4327ecb81179df2ee5bccabd47f2cb5b48e`, source `e5ab2e50ee6494f8d493836c33f55872e896d4fe`, merge/tested `e2ed40ba6a61b4f63d88f6ebaa2e5460b4c3457f`. Nine build steps, Astro checks, 18 browser tests (one intentional skip), mobile/desktop Lighthouse normal and negative probes, coverage, vulnerability/license gates, SBOM and upload receipt passed. Downloaded evidence is 29,350,458 bytes, SHA-256 `aed34057e6f0bbae50d96b589ef442b7669580667f38f3f24f2629460a4d6f86`, matching CNB metadata; 187 archive entries passed path/type inspection and build/browser receipts bind these SHAs with unchanged Site digest. Source-side empty-diff advisory failed to emit JSON; this is a successful trusted target run, not a green combined PR or Gatekeeper acceptance. PR #17 was closed unmerged and both scratch refs deleted. GitHub PR #96 checks passed 6/6 on the target SHA.

Pre-#111/#4 integration readback (2026-10-30): GitHub `dev` is `400290acadca8a0417d41792f17fedb842993d1f` after #96; CNB `dev` is still `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`; GitHub and CNB `main` are `285a62cecd87f8f20276c7cc989537a391f488c8`. The four historical annotated tags also match on both remotes. Current P1 disposition is recorded on [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37).

P1 implementation is integrated and **`P1_ACCEPTED`**; Owner acceptance closed #37 and Project #17 shows it `Done`. The implementation/evidence baseline remains `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb`; the accepted decision and limitations are on [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37). PRs #95/#97/#98/#99/#101/#102/#103 and documentation refreshes #105–#110 are integrated. Prior exact-SHA CI and browser evidence is retained below as evidence for those commits, not a claim that it ran on the current `dev` ref.

Documentation-only status refresh PR #106 merged at `d1d39a889531a1642ce5b8360464eca3269aaca9`; same-SHA verify [40645947387](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947387) and ADS latest-release check [40645947485](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645947485) passed. Later docs-only PR #107 merged at `9f477396470718579802095f316173cf3cacb900`; post-merge CI [40648304578](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40648304578) and ADS check [40648304569](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40648304569) passed. These status-only commits did not change the P1 implementation/evidence baseline above; read the live `dev` ref before acting.

P1 browser/Lighthouse evidence: the PR #103 baseline run [40641080507](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40641080507) passed and uploaded [artifact 12796147801](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40641080507/artifacts/12796147801). Its representative root/nested desktop light/dark and mobile screenshots were visually inspected. The post-merge browser artifact [12795883670](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212450/artifacts/12795883670) records 3/3 Playwright tests on the merged CI run; the mobile light capture is stable after screenshot animations were disabled. Lighthouse remains lab-only. Field p75 is **DEFERRED** under #74; physical touch hardware, formal contrast measurement and late-font behavior remain **NOT VERIFIED**.

Developer-tool preflight used the primary checkout. Explicit official full RTK `1.1.0` passed 151/151 `verify` checks, but reported **SKIP — host hook not installed**; the earlier default PATH resolved RTK `1.0.1`. An explicit `rtk run` operation preserved stderr and exit code `7`, which verifies the CLI wrapper, not host-hook integration. CodeGraph uses the authorized immutable MIT source fallback `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata 1.1.1; not a published stable release); its existing index is current and a host MCP query succeeded under already-installed Node `22.23.4`. The default Node `26.12.0` is incompatible with that CLI, and the managed task worktree has no CodeGraph index. No tool, PATH, hook or global host setting was changed; RTK host integration is **NOT VERIFIED**.

Project #17 readback: #37 `Done`, #100 `In Progress`, and #51 `Todo`; #47/#48/#49/#50/#79 are `Done`. Issue #100 is an independent CNB cutover gate, not a P1 prerequisite. P2/T01 schema v2 implementation is in progress on CNB dev pending the project's phase/development authority gates; its planning handoff is [Issue #51 comment 6463406977](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6463406977).

CNB Agent-governed lifecycle acceptance has now completed on real isolated PR #18: current native CI and CodeBuddy review passed; Critical and stale evidence were blocked before the repair; the Agent merged normally to the disposable target as `d89d9ba34d6edfc5c1462afe09fff5af5c46473d`. The source is an ancestor and merged tree matches tested merge `5640a56884388fe63f27ed8b48c6d4736bab4963`, recorded by the [retained CNB trusted consumer run](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-9q2-1k65dadhi) and [CNB target-commit evidence attachments](https://cnb.cool/KoolingMachine/ALNILAM/-/commit/b240a7ce465956da5b2727d49578f34182d804e3?tab=attachments). This tested SHA belongs to CNB, not GitHub; the main Agent downloaded and verified its SHA-bound build/browser receipts before merge. Actual CNB dev workflow is installed on CNB dev at e602e29a1fc9cff20e438b29251fec4482eba64b; isolated GitHub Mirror acceptance passed two rounds plus a repeat NOOP, and failed/missing-check PRs #116/#117 remain unmerged. Independent Gatekeeper, fixed Reviewer and CNB Auto Merge are canceled prerequisites. GitHub PR #96 is merged; the previous failed NPC and zero-status tests remain historical evidence and residual platform risk.

The Owner selected a history-preserving GitHub PR mirror through `sync/cnb-main`, subject to separate production authorization. The local preparer from [PR #113](https://github.com/Skyline-Gazer/ALNILAM/pull/113) and production-clean pin repair from [PR #112](https://github.com/Skyline-Gazer/ALNILAM/pull/112) are integrated into #111 for review. Actual isolated PRs #114/#115 passed existing verify and ordinary Merge Commits; #116 failed verify and #117 has zero checks, so the Agent issued no merge request for either. See [mirror evidence](cnb/MIRROR.md). GitHub main Ruleset is unchanged; the first production mirror, tags/releases and deployments remain unexecuted. Read live refs before the next action; these are explicitly pre-integration snapshots.

CNB CLI/E2E details, including the CLI's read-only settings scope, Owner UI Plan B readback, native PR/Review runs and NPC private-submodule Prepare failure, are in [CNB-CLI.md](cnb/CNB-CLI.md), [CNB-REVIEW.md](cnb/CNB-REVIEW.md), and [CNB-WORKFLOW.md](cnb/CNB-WORKFLOW.md). The refreshed P2/T01 handoff is [#51 comment 6463406977](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6463406977).

## Current P0 evidence checkpoint — 2026-10-26

See [P0 Acceptance & Decision Report](p0/P0-ACCEPTANCE.md), merged [PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85) (`b36b61fff8377694f209fcc7488f7457251a2ce9`) and merged ADS v0.4.1 adoption [PR #84](https://github.com/Skyline-Gazer/ALNILAM/pull/84) (`2555c4658599598bfed604fbf0d9b525d24c3ded`; post-merge dev CI [40321449502](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40321449502) PASS). The report supersedes historical status claims below; all earlier entries remain traceability records. Existing platform source is preserved. Draft #77 remains unmerged. Stop at Owner P0 acceptance, G0-F freeze and explicit P1 scope authorization.

### ADS v0.4.1 consumer adoption — 2026-10-26

> Superseded 2026-10-31: the devtool workflows/scripts, `.ads-devtools.json`,
> `.codex/hooks.json` and `RTK.md` were removed by the ADS `cnb/dev` Lite
> adoption, including the copied production-boundary guard. The text below records
> the v0.4.1-era state only; it is not the current toolchain or pin.

- `.ads` was pinned to release commit `3abf6025657a5d716476029cc8cbf5239543210b` (v0.4.1); annotated tag object is `e38d01ff176448a13180afe2419c1c9c94a6ab43` and must not be used as the gitlink. The private submodule was omitted from public CI checkout.
- CodeGraph used the owner-approved official source fallback `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata 1.1.1, MIT) because official npm `latest` returned 404 and GitHub Releases was empty. It was **not** a published stable release. The previous unrelated `@colbymchenry/codegraph` installation was not accepted as official provenance.
- Full RTK was official v1.1.0, with Apache-2.0 CLI and BUSL-1.1 engine licenses. The previous v1.0.1 was recoverable outside the repository. Native Codex hook interception, output compression, failure exit code and diagnostic preservation were exercised.
- The former development-only integration consisted of `.ads-devtools.json`, `.codex/hooks.json`, `RTK.md`, the ADS devtool policy helpers, the latest-release workflow and an optional project-local CodeGraph index. Generated indexes/caches stayed untracked; `.git/info/exclude` supplied local exclusions rather than tracked production ignore rules.
- The former generic production-boundary guard rejected the manifest, host integration, generated SQLite sidecars, `.codegraph-*` directories, tool-specific workflows/helpers, escaping symlinks and contaminated build outputs.
- Local preflight was `CLI_PASS_HOST_UNVERIFIED` (exit 3); native Host MCP query and RTK interception were verified separately. See [P0 report section E](p0/P0-ACCEPTANCE.md#e-ads-governance) for evidence boundaries and unresolved product risks.

## Identity and baseline
- Core repository: https://github.com/Skyline-Gazer/ALNILAM (Apache-2.0).
- Project tracker: https://github.com/orgs/Skyline-Gazer/projects/17/
- Initial `main` SHA (before bootstrap): `282459adb69f903a0eea4ded35ebf619c7387a31`.
- Development baseline: `dev` created from initial `main`.
- Bootstrap branch: `chore/initial-platform-bootstrap` (PR into `dev`, pending review).
- ADS is a **private repository**; the public CI checkout intentionally omits recursive submodule cloning (no cross-repo credentials). Maintainers with ADS access can materialize it and verify the full rule set.
- Current ADS gitlink: `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` (ADS `cnb/dev`, not a release tag), located at `.ads` and enforced by `ads-pin.txt`. Historical pins: pre-T04 `cnb/dev` `6e5a7dfd1b717a03ed5b33c66707f47aab7f76b9`, `v0.4.2` `375fc71f977c40c2053140c34431cc60a6d42883`, `v0.3` `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`.
- Do **not** infer latest bootstrap branch HEAD, CI result or Project item status from this document. Query GitHub at start of task.

## Continuation 7: deployment live + P3 modules shipped (2026-10-25) — Issues #6 closed
- **Owner-approved scope**: production deployment + P3 comments & Bangumi only (gallery/moments/music declined, recorded in ROADMAP).
- **PR #24/#27** (comments + Bangumi + deploy enablement, merged): `[comments]` giscus module (fail-closed validation, client:visible island — iframe mounts, verified in Chromium) and `[bangumi]` module (build-time api.bgm.tv fetch → static output; covers hotlinked no-referrer). **Module route gating**: opt pages live in `src/pages/opt/`, injected via Astro integration only when enabled — disabled modules ship no page/stub/JS (verified: demo output has zero giscus/bgm.tv references). Base-path aware builds: `ALNILAM_SITE_URL` override → Astro `base`; `withBase` helper prefixes internal links/assets/pagefind/covers (external URLs untouched; root-hosted regression-verified). 13 contract tests.
- **Deployment**: GitHub Pages `build_type=workflow`; `deploy.yml` runs contract tests → compose → deploy-pages. **Live: https://skyline-gazer.github.io/ALNILAM/** (home/posts/assets 200). Deploy trigger = push to `main` (tag refs rejected by the Pages environment policy at job startup even with matching policy entry — PR #30); manual dispatch retained.
- **Release chain**: PR #25/#28/#31 changelog prep; release PRs #26 (v0.1.1, tag `0591e4b`), #29 (v0.1.2, tag `b6fac6a`), #32 (v0.1.3, tag `07fac43`). `ALNILAM_OLD_CORE_SHA` tracks the latest release tag each time. GitHub Releases published for all three.
- **Issue #6 closed** (delivered scope + documented declines). Board: **17 items, 17 Done**. Zero open issues/PRs.
- Repo state: `main` = `07fac43` (v0.1.3, deployed), `dev` = merge of #32. Workflow runs: CI on dev/main + Deploy on main.
- Ops notes: the github-pages environment policy now includes `gh-pages`, `main`, `v*`; tag-ref deploys remain unreliable (main-push is the supported path).

## Continuation 6: v0.1.0 released (2026-10-25) — Issues #7, #8 closed
- **PR #19** (merged to `dev`, head `2fccecb`, CI 40181608439/40181511458 success): secret-pattern sweep clean; `pnpm audit` clean; unused `@pagefind/default-ui` removed; npm dependency license table in THIRD_PARTY_NOTICES; legacy-Site fixture `sites/legacy-demo` (no schemaVersion/no i18n) verified building against current + P0 (7cbcef0) + P1 (cbf16ab) cores with Site digest preserved; a11y floor + 64KiB page-weight budgets added to artifact-check (negative-tested); README quickstart rewrite; `docs/MAINTAINERS.md` (release procedure, tagging rules, CI inventory); `CHANGELOG.md`.
- **Release PR #20** (`dev` → `main`, owner-authorized): merged `52a5d13`. Ruleset `alnilam-main` enforced (PR-only + `verify` strict — PR checks SUCCESS). Dispatch-run CI on main: run 40182055037 **success**.
- **Tag `v0.1.0`** annotated on the main merge commit; GitHub Release published; `ALNILAM_OLD_CORE_SHA` repo variable set to `52a5d13f…` per docs/MAINTAINERS.md — CI upgrade/rollback now targets the real previous release going forward.
- **Issues #7 and #8 closed** (with evidence comments). Board read-back: all items **Done** except #6 (P3 optional modules, Todo).
- **CI hardening follow-up (PR #22, merged `73e88ef`, head `ef91aba`)**: `ALNILAM_OLD_CORE_SHA` may point at a main-only commit that upload-pack rejects from PR checkouts ("not our ref"); fetch chain now variable SHA → `v0.1.0` tag → last buildable bootstrap state.
- No production deployment was performed (static hosting cutover remains owner-run). No new recurring infrastructure.
- Repo state: `main` = `52a5d13` (v0.1.0), `dev` ≥ `73e88ef`; both protected.

## Continuation 5: Issue #5 closed — search, i18n, pagination, image policy (2026-10-25)
- **PR #17** (merged `b5e5a2c`, head `0b605b2`, CI runs 40179002245/40178997441 + dev run 40179126452 success). Owner approved all four items.
- **Pagefind local search** (npm dep 1.5.2, no global install): compose indexes the staged output; index failure fails the build. `pagefind-entry.json` language keys sorted post-index — found via repeat-build digest diff (nondeterministic worker completion order). Search island uses the vanilla `search()` API + ~40-line custom UI; `@pagefind/default-ui` was replaced (webpack-era bundle breaks under rolldown). Index loads lazily from `/pagefind/` only on interaction — no posts content in page bundles.
- **Browser-verified bug chain** (each caught by real-browser evidence, not tests): ① event handler case mismatch `{oninput}` vs `function onInput` compiles to an undefined identifier (silent no-op); ② Pagefind `r.data()` is a method — awaiting it as a property yields functions; ③ `each_key_duplicate` crash when sub-results share URLs; ④ Pagefind module namespace must never be wrapped in a Svelte `$state` proxy (breaks internals — kept as plain ref, documented); ⑤ a stale `.astro`/vite cache silently served an old broken island compile across multiple "successful" rebuilds — `rm -rf apps/web/.astro` cleared it. **Lesson: when a fix doesn't change behavior, clear build caches before re-theorizing.**
- **i18n**: frontmatter `lang` (BCP-47) + `translationKey`; default locale keeps `/posts/<slug>/`, translations live at `/posts/<lang>/<slug>/` via the `content/posts/<lang>/` directory convention (glob-loader ids slugify dots — filename-suffix encoding like `post.en.md` does NOT survive; directory encoding does, verified via a debug route). hreflang + x-default on pages, `xhtml:link` in sitemap, per-post `<html lang>`, RSS per-item `<language>`. Standard fixtures: zh-CN + en + ja translations of two articles.
- **Pagination**: `/posts/[...page]`, pageSize 5, prev/next, per-page canonicals; fixture-tested with 7 posts → `/posts/2/`.
- **Image pipeline**: decision = none. Site-owned images served as-is (deterministic offline builds, no sharp); CLS-safe dimensions enforced by artifact-check. Documented in SITE_ONBOARDING.md.
- Determinism re-proven after Pagefind: repeat builds byte-identical with pinned epoch; same-revision upgrade-check byte-identical.
- Board read-back: #5 **Done** (all acceptance items shipped). Remaining open: #6 (P3 optional), #7 (P4 release), #8 (In Progress).
- `dev` HEAD: merge of PR #17. `main` still `282459a` — release PR requires owner authorization.

## Continuation 4: P2 slice 1 — feeds, SEO, archives, tags (2026-10-25)
- **PR #15** (merged as `defad23`, head `6f9da26`, CI runs 40174387510/40174190477 + dev run 40174473626 success): zero new dependencies.
  - Routes: `/rss.xml` (RSS 2.0, escaping, atom:self), `/sitemap.xml` (static routes + posts with lastmod), `/robots.txt`, `/archives/` (year-grouped), `/tags/` + `/tags/[tag]/` (PostCard one-per-row).
  - SEO in BaseLayout: OpenGraph (+ article:published_time/article:tag on posts), Twitter card, RSS/sitemap discovery links, JSON-LD WebSite/BlogPosting — validated parseable from real output.
  - Learnings recorded: Astro `.xml.js` routes are plain JS (frontmatter fence breaks astro check); dynamic segment values come from `Astro.params` not props (caught via browser evidence: `#undefined` tag title).
- Verification: 7 pages built, artifact budgets OK, real-Chromium screenshots (archives/tags index/tag detail), `pnpm test` 10/10, `astro check` clean, same-revision upgrade-check byte-identical.
- Board read-back: #1/#2/#3/#4/#9/#10/#12/#13/#15 Done; #5 **In Progress** (feeds/SEO/archives/tags shipped); #8 In Progress; #6/#7 Todo.
- **Issue #5 remaining** (owner decisions needed): Pagefind local search (runtime binary dependency — needs approval per "no unapproved installs"); pagination on `/posts/` (deferred until post count warrants); i18n/hreflang (requires content schema decision); image pipeline.
- `dev` HEAD: merge of PR #15. `main` still `282459a`; release PR requires separate authorization.

## Continuation 3: Issue #3 closed + artifact budgets (2026-10-25)
- **PR #12** (merged `564d3f1`, head `5c6587b`, CI runs 40172044941/40171978532 success): Site **schema v1 frozen** — `schemaVersion` validated against `[1]`, absent = 1, `null`/`2`/`"1"` fail closed (10 contract tests incl. version matrix); **deterministic provenance** — output gains `alnilam-provenance.json` binding Core revision + Site SHA-256 digest, `SOURCE_DATE_EPOCH`-pinnable, digest mismatch refuses to publish; `docs/SITE_ONBOARDING.md` (schema contract, slug-as-path stability, private-Site two-checkout CI strategy with provenance gating). Reproducibility proven: repo-vs-worktree same-revision builds byte-identical (caught & removed an absolute-path leak from provenance).
- **PR #13** (merged `5b75aea`, head `a6387eb`, CI runs 40172457608/40172439110 + dev run 40172587261 success): `scripts/artifact-check.mjs` wired into `pnpm build` — posts pages zero runtime scripts, ≤1 island/page, all `<img>` with explicit dimensions (CLS), provenance integrity. **Immediately caught two regressions**: P1 rewrite had silently dropped the Status island (restored, PRODUCT.md v0.1 requires the hydration demo) and the article cover `<img>` lacked dimensions (fixed). Negative-tested (injected script → build fails).
- Issue #3: **all acceptance items now evidenced** (schema freeze + provenance this PR; git-Site immutability, symlink/path rejection, no-mutation across upgrade/rollback from PR #9 chain). Board: #1/#2/#3/#4/#9/#10/#12/#13 Done, #8 In Progress, #5/#6/#7 Todo.
- `dev` HEAD `5b75aea`; `main` still `282459a` (release PR needs owner authorization; first tag then enables real `ALNILAM_OLD_CORE_SHA`).
- Remaining: automated visual regression baselines (manual screenshots currently), #5/#6/#7 features, #8 closure.

## Owner authorization executed: PR merge chain (2026-10-25)
- Owner approved the review findings; merge chain executed in dependency order: PR #2 (`7cbcef0`) → `dev` as `d2f973c`; PR #9 (`7174eaa`) → `dev` as `4fd99ec`; PR #10 (`6611cb4`) → `dev` as `9a31573`. All GitHub-verified MERGED.
- `dev` HEAD `9a31573` push CI: runs 40170907120 + 40170864650 — **success**, all 11 steps including two-version upgrade/rollback. Rulesets enforced throughout (PR-only merges, required `verify`).
- Project #17 read back: #1/#2/#4/#9/#10 = **Done**, #8 In Progress (branch governance: rulesets verified active, closure deferred), #3/#5/#6/#7 Todo. 0 open PRs, 5 open issues.
- `dev` now contains the full platform baseline + upgrade/rollback acceptance + P1 Editorial UI. `main` remains `282459a`; a release PR `dev` → `main` requires separate owner authorization.

## Continuation 2: P0 hardening + P1 Editorial UI (2026-10-25)
- State verified at session start: `dev`/`main` still `282459a`; PR #2 (`7cbcef0`) and PR #9 (`ffed1ae`→`7174eaa`) open with green CI; Rulesets `alnilam-dev` (25809723) and `alnilam-main` (25809753) **active**: deletion + non_fast_forward + pull_request + required `verify` check (strict) on both branches.
- **PR review (Phase 1A)**: PR #9's merge-base with `dev` is `282459a`, so GitHub shows 43 files, but the actual delta **over PR #2 is 4 files / +167 lines**. Merging #2 then #9 yields exactly the intended change; no double-merge risk. Order #2 → #9 confirmed.
- **Upgrade-check hardening (commit `7174eaa`, on PR #9 branch)**: `resolveRevision()` verifies the old SHA locally, falls back to one shallow fetch, and only then creates a worktree; exit/SIGINT/SIGTERM handlers guarantee temp-worktree cleanup (verified zero residue on success, unresolvable-SHA and unbuildable-SHA paths); `resolveRevision` unit test (8 tests total). Rendering-change scenario proven end-to-end locally: theme CSS change in an old-Core worktree → outputs differ, external Site byte-identical across all builds.
- **P1 Editorial UI (commit `cbf16ab`, branch `feat/editorial-ui-v1`, PR #10 → `dev`)**: token-based theme with real dark+light palettes; Fuwari one-post-per-row card (text left / cover right 28%, cover-top on mobile); cinematic hero with original inline-SVG constellation; semantic prose styles; a11y (skip link, focus-visible, reduced-motion, tabindex discipline, img dimensions for CLS); zero new client JS.
- **Bug found & fixed during browser verification**: theme `.astro` files were outside Tailwind v4's scan — the `@source` directives covered only `apps/web/src` and `packages/ui/src`, so sticky/header/card utilities were silently missing from the CSS bundle (pages rendered unstyled in a real browser while `pnpm check`/`pnpm build` passed). Fixed with `@source "../src"`. **Lesson: `astro check`/static builds do not prove CSS correctness; a real browser pass is required.**
- CI on PR #10 HEAD `cbf16ab`: runs 40166025295 (pull_request) + 40166014173 (push) — **success**, all 11 steps including two-version upgrade/rollback.
- Project #17 read back after edits: #1 In Progress, #4 In Progress, #8 In Progress, #9 In Progress, #10 In Progress, #2/#3/#5/#6/#7 Todo (10 items). Issue #8 commented with full ruleset verification evidence.
- Browser evidence: dark/light × desktop/mobile screenshots from real Chromium (task space `alnilam-p1-visual`); keyboard Tab order verified: skip-link → brand → 首页 → 文章.
- Still unverified: visual regression baselines are manual (no automated pixel-diff yet), PR #2/#9/#10 review+merge decisions (maintainer authority), ADS behavioral compliance, branch-protection bypass settings.

## Continuation: P0 two-version upgrade/rollback (2026-10-25)
- Verified remote state at session start: `dev` = `282459adb69f903a0eea4ded35ebf619c7387a31` (still bare "Initial commit"); all platform content on bootstrap branch `chore/initial-platform-bootstrap` @ `7cbcef0ae2b3a669fab987dd0f7cd57b7040c8bc`, PR #2 OPEN → `dev`, both checks SUCCESS (runs 40159993704, 40159989762).
- Task branch `feat/two-version-upgrade-rollback` created from bootstrap HEAD (NOT from bare `dev`; merging PR #2 first remains a maintainer review decision).
- Commit: `66019c9` — `scripts/upgrade-check.mjs` (two Core revisions vs one unchanged external Site: Site digest identical before/upgrade/rollback; output digests reported; old Core via `git worktree` only, never fetch/reset/checkout inside Site), CI step "Two-version Core upgrade / rollback against unchanged Site", 2 new contract tests (7 total).
- Local verification (macOS arm64, Node 22.23.4, pnpm 10.19.0): `pnpm install --frozen-lockfile` ✓, `pnpm test` 7/7 ✓, `pnpm check` 0 errors ✓, `pnpm build` ✓, `node scripts/upgrade-check.mjs --old ee97d1f175ac905dd3a7e2f79762415888b99b76` → `UPGRADE/ROLLBACK OK: Site unchanged, outputs byte-identical.` ✓; `--old 282459a...` → clean exit 1 (pre-platform `main` has no manifest; Site untouched, temp cleaned).
- Remote CI on PR #9: runs 40160914956 (pull_request) and 40160849539 (push) — **success**, including the new upgrade/rollback step.
- Old-Core default in CI is `ee97d1f1...` (last buildable bootstrap state), overridable via `ALNILAM_OLD_CORE_SHA` repository variable. `main` (282459a) cannot serve as "old Core" until it receives a buildable platform revision via an authorized release merge.
- Project #17 synchronized with authenticated Projects v2 (token scopes include `project`): 9 items added and read back — Issues #1 (In Progress), #3–#8 (Todo), PR #2 (Todo), PR #9 (In Progress). Board read-back confirmed 2026-10-25.
- RTK 1.0.1 and CodeGraph 1.0.1 available locally; CodeGraph index initialized task-scoped (`.codegraph/` gitignored). No indexes committed.
- Tooling note: Astro 7 requires Node ≥22.23.4; local default 22.23.2 fails `astro check` — use fnm/CI Node 24.
- Still unverified: browser E2E/visual fidelity, branch protection rulesets, ADS behavioral compliance (private repo not materialized locally), and PR #2/#9 review+merge decisions (maintainer authority).

## First remote CI acceptance (2026-10-25)
- Verified source SHA: `ee97d1f175ac905dd3a7e2f79762415888b99b76`.
- PR workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159850665 — **success**.
- Push workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159847633 — **success**.
- Actual checks: pnpm frozen dependency install, Node contract tests, Astro type/content check, demo static build, output assertions, independent external Site build, immutable source check, ADS gitlink pin.
- CI deliberately does not clone the private ADS repository. ADS behavioral compliance beyond root AGENTS.md is not evidenced by this build.
- This entry records a tested revision; review the current PR HEAD and fresh CI on every continuation.

## First task for next agent
1. Read `AGENTS.md`, the pinned `.ads` policies when available, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, the #49–#50/#79 records and the exact PR heads.
2. Verify PR #97's current head and `verify` result; preserve its branch history and do not treat it as merged.
3. Continue #50 from its own branch/worktree and record root/nested, 1440/390, light/dark, external-Site, optional-module, motion, navigation and performance evidence.
4. Continue #79 in a separate worktree, comparing pinned Shirone Astro 7.3.8 with the actual ALNILAM 7.4.2 lock resolution; do not change product versions incidentally.
5. Run frozen install, Node/Python tests, Astro check, builds, artifact and production-boundary checks sequentially; retain exact CI/artifact links.
6. Verify Project #17 through native API readback if available; otherwise keep `PROJECT_UNVERIFIED` and make no status claims.
7. Keep PRs reviewable and issue-linked. Do not merge, tag, deploy, change ADS or start P2 without separate authorization.

## Project constraints
- Only `dev` merges by reviewed PR (except separate authorized release PR to `main`). No direct write to `main`.
- Site is independently owned and read-only during build; `sites/demo` is a test fixture.
- Platform: Astro 7, Svelte 5, Tailwind CSS 4, Editorial theme, one Post per row (Fuwari).
- Avoid extracting separate npm-package release processes or implementing a custom deployment controller.
- ADS submodule never floats to latest without explicit review.
- CodeGraph and RTK latest tool availability should be checked, but their local indexes/configs must not be committed to production branch; no unapproved global installs.
- Default to GitHub Actions validation; don't request unneeded local system provisioning.
- All borrowed code, images, fonts or assets require license audit and THIRD_PARTY_NOTICES update.

## Validation commands
```bash
git submodule update --init --recursive --checkout .ads  # authorized ADS access required
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out dist/external-site
```

## Expected CI output
`dist/site/index.html`, `dist/site/posts/hello-alnilam/index.html`, `dist/site/site-assets/orion.svg`.

## Explicit unverified matters
- Clean Astro check and static build passed on remote CI; interactive browser E2E, visual fidelity and performance have **not** been verified.
- Frozen dependency installation **passed** for tested SHA `ee97d1f`. Re-check current HEAD before release.
- Branch protection/ruleset enforcement is not enabled unless verifiably applied.
- Project #17 membership/status changes are not verified unless an authenticated Projects v2 read/write occurs.
- No preview or production deployment was performed during bootstrap.
- Full content migration compatibility across Core versions has not yet been exercised.
- Initialization PR must be reviewed, not auto-merged.

## Next implementation prompt
"Continue ALNILAM at the actual bootstrap PR HEAD, under the pinned ADS v0.3 rules and Project #17. First close P0 bootstrap verification gaps: immutable pnpm lock, reproducible CI, Astro/Svelte/Tailwind build, external Core/Site compose, Site non-mutation, safe path handling and two-version Core upgrade. Use an Issue-linked PR targeting dev. Do not touch main or production. Report actual SHA, CI links, verified vs unverified acceptance, and keep docs/HANDOFF.md updated."
