# ALNILAM CNB Primary / GitHub Mirror readiness

**Readback: 2026-10-29. `CNB_CUTOVER_READY = NO`.** GitHub remains the code authority. CNB `main`/`dev` and historical tags match GitHub. Owner-approved Plan B is active on CNB `dev`: PR and the status-check toggle remain enabled, mandatory independent human approval is disabled, and direct/force push, deletion, bypass, and auto-merge remain prohibited. Scratch testing found a critical limitation: CNB considers a PR with zero check statuses mergeable, so strict Required Checks acceptance fails. The candidate workflow has not been installed on `dev`; formal merge of CNB PR #4 still requires explicit Owner authorization.

2026-10-29 follow-up: GitHub PR #96 now points to `00651cc2996bdbab176c0f2c162e7173d480b0f8`. The verifier found the copied target harness omitted `cnb-trusted-gate.mjs`, which the copied consumer runner imports. This commit adds the module to the copy list and a regression test for local import closure. Exact-head local checks: 43/43 tests; `pnpm check` passed on 17 Astro files with zero diagnostics; `pnpm build` passed, produced 13 pages, and preserved external Site digest `7e7500946378db5173f52294bf9662744ce40086a526d7cb40c0a3bf4f8a9db5`. Six current-head GitHub checks now pass: [PR CI](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755341036), [push CI](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755334657), [Astro compatibility](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755340955), [P1 browser/Lighthouse](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755340938), [PR ADS](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755340954), and [push ADS](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755334670). The P1 run finished in 13m21s and uploaded [artifact 12846391315](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40755340938/artifacts/12846391315), 37,529,243 bytes, SHA-256 `6a812586bf641d6552db1cac3443d019ccfaf214e035fdd2cea62e685d172d30`; it contains 24 Lighthouse reports per form factor and browser evidence bound to the current SHA. The 18-browser-pass/one-skip local evidence and one-off no-op probe remain on prior head `4e37bdc`; that probe receipt is local/ignored, not a committed test or uploaded artifact. A push of exact current `00651cc` to CNB ref `codex/cnb-acceptance-target-20261029` was rejected with `Repository Not Found`; no CNB native run or native adversarial no-op PR is claimed.

## Verified configuration and refs

| Ref | GitHub | CNB |
| --- | --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0`–`v0.1.3` | Annotated tag object IDs and peeled commits match | Annotated tag object IDs and peeled commits match |

CNB `dev` protection rule `34c6fceca75e456f25e7e99531e2425c6c1de443` was read back after Plan B. Original values and rollback are recorded in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md). The UI states checks must pass “if there are status checks.” A disposable rule with identical Plan B values confirmed zero-status PRs are unblocked/mergeable, a failing status blocks merge (HTTP 409), and direct push is rejected. This is not accepted as a strict required-check gate. Actual `dev` write/merge behavior remains untested. See [CNB’s trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html).

The 2026-10-29 signed-in UI readback confirmed root organization event/cron/NPC controls are enabled. Repository event, cron, and NPC switches are enabled for `ALNILAM`, `ads-cnb-acceptance-20261027`, `AiringCal`, and `airingcal-control`; `code-import` event and cron switches are off. The Owner selected organization event scope, which therefore unlocks those four repository event triggers. No trigger setting changed. Untrusted-event and scheduled cross-repository access remain disabled. The `airingcal-secrets` settings page was inaccessible and its switches remain unverified.

## Candidate and native evidence

- CNB bootstrap PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) is open/unmerged to `dev` at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. GitHub PR [#96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) is Draft at `00651cc2996bdbab176c0f2c162e7173d480b0f8`; all six GitHub checks now pass on this head. The current CNB branch was not advanced. No formal merge was attempted.
- Official advisory AI Review build [`cnb-kcp-1k61p09tu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-kcp-1k61p09tu) completed on `98511ad`; Review JSON returned `passed` with zero issues and native source/target/merge identity was recorded. AI Review remains advisory and cannot authorize or block a formal merge.
- Full trusted target build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed all stages on candidate `cba3353613402646440858f9298af87b8450ba74`, with source marker `78fd54a80be70aebdc1b9b891d68937fede76373` and exact merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`. Its 9,830,956-byte evidence archive was downloaded and SHA-256 verified as `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`. The bounded archive held 126 entries, 42 Lighthouse JSON reports, all exact SHA receipts, 9 passing build steps, 79.02% Node-source coverage, browser positive/expected-negative evidence, and successful SCA gates.
- Historical target run [`cnb-iin-1k61q4mp4`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-iin-1k61q4mp4) passed all stages on candidate `98511ad526c0d77ede979e88ebe5b9c4f584a739`, source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`, and exact merge/tested SHA `c131e6d560db8dab395ee201e7a517d4b620e498`. It predates the `4e37bdc`/`00651cc` trusted-tool/test hardening and is not current-head acceptance. Its 10,050,080-byte archive matched the CNB asset SHA-256 `c4ad40391cac5b795681b49fa51e1f28b1f0a9ca8a3fdff8b4ceecde90156e21`; 127 safe entries contained nine successful deterministic receipts, 79.02% coverage, 36 Lighthouse JSON reports, browser negative screenshot/trace, and mobile/desktop CLS expected-red receipts. Vulnerability and component-license diff gates reported zero new risk findings; source license scanning was unavailable because SourceSCA was not configured. The latest source-side event build `cnb-pln-1k61q4mp3` passed on the earlier candidate. Disposable PR #5 was merged only to its scratch target at `730b63df81ce37f0db17b20b5ec15220d4cc7420`, then both scratch refs were deleted.
- On current GitHub head `00651cc`, trusted tests, browser configuration, preview server, check/build tools, and the self-contained gate module are copied into the harness; candidate package lifecycle hooks are disabled. Exact-head local evidence is 43/43 tests, `pnpm check` with zero diagnostics, and a 13-page build with unchanged Site digest. Current-head GitHub browser/Lighthouse passed and uploaded artifact 12846391315. The 18-browser-pass/one-skip and one-off local no-op evidence were on prior head `4e37bdc`; the no-op receipt is local-only. A fresh current-head CNB native positive run and native no-op-script adversarial PR remain outstanding because CNB rejected the current SHA push.
- The separate missing-check test used disposable PR #6 and build `cnb-if2-1k61pq4p0`: zero-status PR readback was `blocked_on=unblocked` / `mergeable_state=mergeable`; after an intentional failing status, PR was `blocked_on=status_check` and the merge attempt returned HTTP 409. The same scratch protection rule rejected direct push. The temporary rule, PR and refs were removed after capture.
- `@CodeBuddy` is **FAIL / not executed**. CNB Prepare recursively checked out private `.ads` and failed before the model stage, despite a source-level `git.submodules: false`. The current trusted target pipeline also sets `git.submodules: false`; its successful Prepare and target run did not fetch private ADS. No private token was exposed.
- The isolated Critical fixture review (source `077fcfa40f1768c31345c4e76383dd0221d25e1e`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`) produced model output classified `critical`, but the response was invalid JSON, no PR comment was posted, and the Review stage/build still succeeded. AI Review therefore remains advisory and is not a Critical Required Check.
- Issues #94 and #100 remain open. Current Project #17 readback: #94 and #100 In Progress, #51 Todo. The board readback found #100 missing; it was added to Project #17 and set to In Progress on 2026-10-29. P2 code was not started.

## Acceptance result

| Gate | Result |
| --- | --- |
| `CNB_BOOTSTRAP` | **FAIL** — candidate `.cnb.yml` is not installed on actual `dev` |
| `CNB_NATIVE_CI` | **FAIL / NOT VERIFIED at current head** — the previous native run passed on `98511ad`, before hardening; no native run for `00651cc` |
| `CNB_NPC_REVIEW` | **FAIL** — built-in NPC stopped before model execution |
| `CNB_TRUSTED_GATE` | **FAIL / NOT VERIFIED natively at current head** — local harness, import-closure test and local checks pass; no native `00651cc` run |
| `CNB_BRANCH_PROTECTION` | **FAIL / NOT ACCEPTED** — scratch rule allows merge with zero statuses; existing failure and direct push are blocked |
| `CNB_REVIEW_GATE_TRUSTED` | **NO** — AI Review is advisory and separate from deterministic trusted CI |
| `CNB_CONSUMER_ACCEPTED` | **NO** — strict check-must-exist behavior and actual `dev` installation are not proven |
| `CNB_DEV_WORKFLOW_READY` | **NO** |
| `CNB_CUTOVER_READY` | **NO** |
| `FIRST_MIRROR_EXECUTED` | **NO** |

## Owner action and boundaries

The technical blockers remain the missing-check gap, the absence of a candidate workflow on actual `dev`, and native verification of the hardened head. The Agent tried pushing exact current head `00651cc2996bdbab176c0f2c162e7173d480b0f8` to `codex/cnb-acceptance-target-20261029`; CNB returned `Repository Not Found`, so no ref or build was created. The error does not distinguish token scope from the Owner's repository write role. To resume, the Owner can use CNB `Personal Settings → Access Token → Add Access Token`, scope a short-lived token to `KoolingMachine/ALNILAM` with only `repo-code:rw`, and confirm the user's repository role permits Git writes. Once the local HTTPS credential is updated with username `cnb`, the Agent can retry the exact isolated-ref push, then run a fresh positive `pull_request.target` PR and a no-op-script adversarial PR against that scratch target. Separately determine whether CNB can require a named check to exist; without that behavior, strict Required Checks acceptance remains failed. CNB PR #4 remains open/unmerged, and a separate explicit Owner authorization is required before merging it into `dev`. No actual `dev` or `main` merge/push attempt was made.

No CNB Primary declaration, first CNB-to-GitHub mirror write, GitHub `main` protection change, production release/deploy, or formal tag was performed or authorized here. GitHub `main` still has its no-bypass ruleset; that remains incompatible with ADS Mode A direct mirror writes if the branches diverge. The first-sync manifest remains unapproved.

## Detail

- [CNB CLI and native E2E](CNB-CLI.md)
- [Developer workflow and protection matrix](CNB-WORKFLOW.md)
- [Automatic Review and NPC evidence](CNB-REVIEW.md)
- [Mirror policy, manifest and dry-run](MIRROR.md)

ADS v0.4.2 remains pinned and materialized at `.ads` commit `375fc71f977c40c2053140c34431cc60a6d42883`; the five required ADS guidance files were read before changes. ADS source was not modified and generic ADS acceptance was not rerun.
