# ALNILAM CNB Primary / GitHub Mirror readiness

**Readback: 2026-10-29. `CNB_CUTOVER_READY = NO`.** GitHub remains the code authority. CNB `main`/`dev` and historical tags match GitHub. Owner-approved Plan B is active on CNB `dev`: PR and the status-check toggle remain enabled, mandatory independent human approval is disabled, and direct/force push, deletion, bypass, and auto-merge remain prohibited. Scratch testing found a critical limitation: CNB considers a PR with zero check statuses mergeable, so strict Required Checks acceptance fails. The candidate workflow has not been installed on `dev`; formal merge of CNB PR #4 still requires explicit Owner authorization.

## Verified configuration and refs

| Ref | GitHub | CNB |
| --- | --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0`–`v0.1.3` | Annotated tag object IDs and peeled commits match | Annotated tag object IDs and peeled commits match |

CNB `dev` protection rule `34c6fceca75e456f25e7e99531e2425c6c1de443` was read back after Plan B. Original values and rollback are recorded in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md). The UI states checks must pass “if there are status checks.” A disposable rule with identical Plan B values confirmed zero-status PRs are unblocked/mergeable, a failing status blocks merge (HTTP 409), and direct push is rejected. This is not accepted as a strict required-check gate. Actual `dev` write/merge behavior remains untested. See [CNB’s trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html).

Organization event/cron/NPC controls were already enabled. The Owner selected organization event scope, which covers the four configured repositories whose repository triggers were on. No trigger setting changed. Untrusted-event and scheduled cross-repository access remain disabled. `airingcal-secrets` repo trigger state is unverified because its settings API returns 403.

## Candidate and native evidence

- CNB bootstrap PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) is open/unmerged to `dev` at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. GitHub PR [#96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) is Draft at the same head. No formal merge was attempted.
- Official advisory AI Review build [`cnb-kcp-1k61p09tu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-kcp-1k61p09tu) completed on `98511ad`; Review JSON returned `passed` with zero issues and native source/target/merge identity was recorded. AI Review remains advisory and cannot authorize or block a formal merge.
- Full trusted target build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed all stages on candidate `cba3353613402646440858f9298af87b8450ba74`, with source marker `78fd54a80be70aebdc1b9b891d68937fede76373` and exact merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`. Its 9,830,956-byte evidence archive was downloaded and SHA-256 verified as `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`. The bounded archive held 126 entries, 42 Lighthouse JSON reports, all exact SHA receipts, 9 passing build steps, 79.02% Node-source coverage, browser positive/expected-negative evidence, and successful SCA gates.
- The first final-head target run `cnb-65d-1k61petm9` failed at the live-ref check because scratch refs were removed before completion. The refs were restored at their exact SHAs; rerun `cnb-iin-1k61q4mp4` targets candidate `98511ad526c0d77ede979e88ebe5b9c4f584a739` with source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3` and is pending after Prepare/install. The latest source-side event build `cnb-pln-1k61q4mp3` passed.
- The separate missing-check test used disposable PR #6 and build `cnb-if2-1k61pq4p0`: zero-status PR readback was `blocked_on=unblocked` / `mergeable_state=mergeable`; after an intentional failing status, PR was `blocked_on=status_check` and the merge attempt returned HTTP 409. The same scratch protection rule rejected direct push. The temporary rule, PR and refs were removed after capture.
- `@CodeBuddy` is **FAIL / not executed**. CNB Prepare recursively checked out private `.ads` and failed before the model stage, despite a source-level `git.submodules: false`. The current trusted target pipeline also sets `git.submodules: false`; its successful Prepare and target run did not fetch private ADS. No private token was exposed.
- Issues #94 and #100 remain open; Project #17 last readback kept both In Progress and #51 Todo. No board change was made. P2 code was not started.

## Acceptance result

| Gate | Result |
| --- | --- |
| `CNB_BOOTSTRAP` | **FAIL** — candidate `.cnb.yml` is not installed on actual `dev` |
| `CNB_NATIVE_CI` | **PENDING** — candidate `cba3353` target run passed; final-head rerun `cnb-iin-1k61q4mp4` is pending |
| `CNB_NPC_REVIEW` | **FAIL** — built-in NPC stopped before model execution |
| `CNB_TRUSTED_GATE` | **PASS on scratch target (`cba3353`)** — final-head rerun pending; actual `dev` installation untested |
| `CNB_BRANCH_PROTECTION` | **FAIL / NOT ACCEPTED** — scratch rule allows merge with zero statuses; existing failure and direct push are blocked |
| `CNB_REVIEW_GATE_TRUSTED` | **NO** — AI Review is advisory and separate from deterministic trusted CI |
| `CNB_CONSUMER_ACCEPTED` | **NO** |
| `CNB_DEV_WORKFLOW_READY` | **NO** |
| `CNB_CUTOVER_READY` | **NO** |
| `FIRST_MIRROR_EXECUTED` | **NO** |

## Owner action and boundaries

Do not request final cutover or formal merge authorization while the strict Required Checks gap remains. The next technical decision is whether CNB can provide an enforceable “check must exist” rule, or whether a documented one-time bootstrap exception is acceptable under Plan B. CNB PR #4 remains open/unmerged; Owner authorization for the formal merge is still required if and when the technical gate is resolved. No actual `dev` or `main` merge/push attempt was made.

No CNB Primary declaration, first CNB-to-GitHub mirror write, GitHub `main` protection change, production release/deploy, or formal tag was performed or authorized here. GitHub `main` still has its no-bypass ruleset; that remains incompatible with ADS Mode A direct mirror writes if the branches diverge. The first-sync manifest remains unapproved.

## Detail

- [CNB CLI and native E2E](CNB-CLI.md)
- [Developer workflow and protection matrix](CNB-WORKFLOW.md)
- [Automatic Review and NPC evidence](CNB-REVIEW.md)
- [Mirror policy, manifest and dry-run](MIRROR.md)

ADS v0.4.2 remains pinned at `.ads` commit `375fc71f977c40c2053140c34431cc60a6d42883`. The private ADS instructions were not materialized; ADS source was not modified and generic ADS acceptance was not rerun.
