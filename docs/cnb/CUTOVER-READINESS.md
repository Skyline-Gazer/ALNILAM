# ALNILAM CNB Primary / GitHub Mirror readiness

**Final acceptance: `BLOCKED_WITH_EVIDENCE` (2026-10-29). `CNB_CUTOVER_READY = NO`; `FIRST_MIRROR_EXECUTED = NO`.** GitHub remains the code authority. Exact current GitHub PR #96 head `7f080e02cc56f49d066cc4036a6d4c914f4b367a` passed native positive CNB `pull_request.target` E2E, and a no-op-script adversarial PR failed closed. However, CNB permits merging a PR with zero check statuses, exposes no named required-check setting, and the candidate workflow remains outside actual `dev` while PR #4 is open. Consumer acceptance and Cutover therefore fail. No protected refs, production settings, release, or mirror were changed.

2026-10-29 follow-up: trusted harness issues found during native runs were fixed on GitHub PR #96 by commits `d0f3b2b92f88b7f4d48b95c6a5bd2a677f5ed840`, `7fe4a92bae40d4c7d20b2b930c935fb8f735e107`, and `7f080e02cc56f49d066cc4036a6d4c914f4b367a`. The final candidate SHA is `7f080e02cc56f49d066cc4036a6d4c914f4b367a`; all six current GitHub checks passed, confirmed with `gh pr checks 96`. Earlier P1/Lighthouse evidence was not rerun for this acceptance pass.

Credential preflight used the existing macOS `osxkeychain` entry for `cnb.cool/KoolingMachine/ALNILAM`, username `cnb`; the secret was never displayed or exported. `git ls-remote`, scratch-ref pushes, native PRs, and artifact download succeeded with `https://cnb.cool/KoolingMachine/ALNILAM` (no `.git`). No helper or global setting changed.

Positive native build [cnb-jhf-1k6423aiu](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-jhf-1k6423aiu) ran on scratch PR #11 `pull_request.target`: source `5f3f03b09453c5a892ffc27f99c4b70d7c8444d3`, target `7f080e02cc56f49d066cc4036a6d4c914f4b367a`, merge/tested `f39faf197ccbd9078a60192c0de11bc9cfdc3b37`. All 14 stages passed. Its 29,184,087-byte [evidence attachment](https://cnb.cool/KoolingMachine/ALNILAM/-/commit/7f080e02cc56f49d066cc4036a6d4c914f4b367a?tab=attachments) downloaded and matched CNB metadata at SHA-256 `e8d29826daca486bd1809f7d96cc463527d1959956c6196dfbd9ed7599072b9a`; 187 archive entries passed safe-path/type inspection. Receipts bind all four identities; nine deterministic build steps passed, before/after external Site digests match, Node source coverage is 79.23% (393/496; minimum 77%), browser tests are 18 passed/one intentional skip, and browser/Lighthouse negative cases are expected-red.

Adversarial build [cnb-phj-1k642341e](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-phj-1k642341e) ran on scratch PR #12 `pull_request.target` with candidate no-op scripts and an intentionally invalid Astro page. The target-owned gate failed in the exact-merge test stage, and later coverage/security/upload stages were skipped. This is the expected fail-closed result. Vulnerability and component-license gates passed on the positive run. SourceSCA is not configured. The source-side fixture separately failed during Prepare while fetching private `.ads`; no private repository content/token was exposed, and target-side CI did not recursively fetch ADS.

Cleanup: scratch PRs #8–#12 were closed without merge, and all seven isolated test refs were deleted. The existing CNB bootstrap ref for PR #4 was retained; `dev` and `main` were untouched.

## Verified configuration and refs

| Ref | GitHub | CNB |
| --- | --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0`–`v0.1.3` | Annotated tag object IDs and peeled commits match | Annotated tag object IDs and peeled commits match |

CNB `dev` protection rule `34c6fceca75e456f25e7e99531e2425c6c1de443` was read back after Plan B. Original values and rollback are recorded in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md). The UI states checks must pass “if there are status checks.” A disposable rule with identical Plan B values confirmed zero-status PRs are unblocked/mergeable, a failing status blocks merge (HTTP 409), and direct push is rejected. This is not accepted as a strict required-check gate. Actual `dev` write/merge behavior remains untested. See [CNB’s trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html).

The 2026-10-29 signed-in UI readback confirmed root organization event/cron/NPC controls are enabled. Repository event, cron, and NPC switches are enabled for `ALNILAM`, `ads-cnb-acceptance-20261027`, `AiringCal`, and `airingcal-control`; `code-import` event and cron switches are off. The Owner selected organization event scope, which therefore unlocks those four repository event triggers. No trigger setting changed. Untrusted-event and scheduled cross-repository access remain disabled. The `airingcal-secrets` settings page was inaccessible and its switches remain unverified.

## Candidate and native evidence

- CNB bootstrap PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) remains open/unmerged to `dev` at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. GitHub PR [#96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) is Draft at `7f080e02cc56f49d066cc4036a6d4c914f4b367a`; all six GitHub checks pass. The current CNB `dev` branch was not advanced. No formal merge was attempted.
- Official advisory AI Review build [`cnb-kcp-1k61p09tu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-kcp-1k61p09tu) completed on `98511ad`; Review JSON returned `passed` with zero issues and native source/target/merge identity was recorded. AI Review remains advisory and cannot authorize or block a formal merge.
- Full trusted target build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed all stages on candidate `cba3353613402646440858f9298af87b8450ba74`, with source marker `78fd54a80be70aebdc1b9b891d68937fede76373` and exact merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`. Its 9,830,956-byte evidence archive was downloaded and SHA-256 verified as `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`. The bounded archive held 126 entries, 42 Lighthouse JSON reports, all exact SHA receipts, 9 passing build steps, 79.02% Node-source coverage, browser positive/expected-negative evidence, and successful SCA gates.
- Historical target run [`cnb-iin-1k61q4mp4`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-iin-1k61q4mp4) passed all stages on candidate `98511ad526c0d77ede979e88ebe5b9c4f584a739`, source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`, and exact merge/tested SHA `c131e6d560db8dab395ee201e7a517d4b620e498`. It predates the `4e37bdc`/`00651cc` trusted-tool/test hardening and is not current-head acceptance. Its 10,050,080-byte archive matched the CNB asset SHA-256 `c4ad40391cac5b795681b49fa51e1f28b1f0a9ca8a3fdff8b4ceecde90156e21`; 127 safe entries contained nine successful deterministic receipts, 79.02% coverage, 36 Lighthouse JSON reports, browser negative screenshot/trace, and mobile/desktop CLS expected-red receipts. Vulnerability and component-license diff gates reported zero new risk findings; source license scanning was unavailable because SourceSCA was not configured. The latest source-side event build `cnb-pln-1k61q4mp3` passed on the earlier candidate. Disposable PR #5 was merged only to its scratch target at `730b63df81ce37f0db17b20b5ec15220d4cc7420`, then both scratch refs were deleted.
- On current GitHub head `7f080e0`, the trusted gate, harness, candidate checkout isolation, and metrics dependency were exercised by the native positive and adversarial runs above. The positive archive and exact SHA receipts were downloaded and verified. The earlier statement that current-head native tests remained outstanding is superseded by this evidence.
- The separate missing-check test used disposable PR #6 and build `cnb-if2-1k61pq4p0`: zero-status PR readback was `blocked_on=unblocked` / `mergeable_state=mergeable`; after an intentional failing status, PR was `blocked_on=status_check` and the merge attempt returned HTTP 409. The same scratch protection rule rejected direct push. The temporary rule, PR and refs were removed after capture.
- `@CodeBuddy` is **FAIL / not executed**. CNB Prepare recursively checked out private `.ads` and failed before the model stage, despite a source-level `git.submodules: false`. The current trusted target pipeline also sets `git.submodules: false`; its successful Prepare and target run did not fetch private ADS. No private token was exposed.
- The isolated Critical fixture review (source `077fcfa40f1768c31345c4e76383dd0221d25e1e`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`) produced model output classified `critical`, but the response was invalid JSON, no PR comment was posted, and the Review stage/build still succeeded. AI Review therefore remains advisory and is not a Critical Required Check.
- Issues #94 and #100 remain open. Current Project #17 readback: #94 and #100 In Progress, #51 Todo. The board readback found #100 missing; it was added to Project #17 and set to In Progress on 2026-10-29. P2 code was not started.

## Acceptance result

| Gate | Result |
| --- | --- |
| `CNB_BOOTSTRAP` | **FAIL** — candidate `.cnb.yml` is not installed on actual `dev` |
| `CNB_NATIVE_CI` | **PASS on isolated current candidate** — positive `pull_request.target` build passed all stages; native no-op-script adversarial build failed closed |
| `CNB_NPC_REVIEW` | **FAIL** — built-in NPC stopped before model execution |
| `CNB_TRUSTED_GATE` | **PASS for execution; not enforceable when missing** — native positive and negative runs prove target-owned execution and fail-closed behavior |
| `CNB_BRANCH_PROTECTION` | **FAIL / NOT ACCEPTED** — scratch protected PR with zero statuses was mergeable; a failed status and direct push were blocked; pending behavior is unverified |
| `CNB_REVIEW_GATE_TRUSTED` | **NO** — AI Review is advisory and separate from deterministic trusted CI |
| `CNB_CONSUMER_ACCEPTED` | **NO** — strict check-must-exist behavior fails and actual `dev` does not yet contain the workflow |
| `CNB_DEV_WORKFLOW_READY` | **NO** |
| `CNB_CUTOVER_READY` | **NO** |
| `FIRST_MIRROR_EXECUTED` | **NO** |

## Owner action and boundaries

The only blocking technical control is strict required-check existence: CNB branch-protection reads expose a boolean `required_status_checks`, with no named required-check context. A disposable PR on a matching protected rule was actually tested: zero statuses gave `blocked_on=unblocked`/`mergeable_state=mergeable`; a failing status blocked merge with HTTP 409; direct push was rejected. A pending status was not separately tested. CNB's [trigger documentation](https://docs.cnb.cool/en/build/trigger-rule.html) likewise describes checks as conditional on statuses being present. Do not report this as PASS or alter the Owner-approved Plan B. A minimum Owner decision is whether to keep CNB non-primary until CNB provides a native check-must-exist control, or separately authorize testing a compensating control such as mandatory Reviewer Approval. No compensation was configured here.

CNB PR #4 should **not** be merged while strict protection fails. Suggested eventual sequence after an acceptable gate and explicit Owner authority: GitHub PR #96 (candidate implementation), PR #111 (this evidence update), then refresh/review CNB PR #4 against the then-current `dev` and merge only by separate Owner approval. PR #96 remains Draft, PR #111 remains open, and PR #4 remains open. No merge occurred. Issue #100 remains Open and In Progress in Project #17; #94 remains In Progress and P2 #51 remains Todo.

GitHub `main` Ruleset `alnilam-main` (ID `25809753`) is active, requires a PR plus `verify` status (integration `15368`), and has no bypass actor. It blocks a direct first mirror write. The Owner must decide whether the first mirror should be submitted through a PR or whether a narrowly scoped Ruleset change is authorized. No Ruleset, mirror ref, first sync, production release/deploy, or formal tag was changed or created. `FIRST_MIRROR_EXECUTED=NO`.

## Detail

- [CNB CLI and native E2E](CNB-CLI.md)
- [Developer workflow and protection matrix](CNB-WORKFLOW.md)
- [Automatic Review and NPC evidence](CNB-REVIEW.md)
- [Mirror policy, manifest and dry-run](MIRROR.md)

ADS v0.4.2 remains pinned and materialized at `.ads` commit `375fc71f977c40c2053140c34431cc60a6d42883`; the five required ADS guidance files were read before changes. ADS source was not modified and generic ADS acceptance was not rerun.
