# CNB Review and NPC acceptance

Readback date: 2026-10-28. **No trusted CNB Review gate is accepted.** AI comments, source-controlled CI, native trusted checks and independent human approval are separate signals.

## Automatic Code Review

The current `cnbcool/code-review` plugin documents support for `pull_request`, `pull_request.update`, `pull_request.approved`, `pull_request.changes_requested`, `pull_request.comment`, and `pull_request.comment@npc`. It does **not** document `pull_request.target`. The plugin can post comments or write structured JSON; its published example defaults to `latest`, which is not suitable as an unverified production pin. See the [official plugin source](https://cnb.cool/cnb/plugins/cnbcool/code-review).

CNB classifies `pull_request` and `pull_request.update` as untrusted; the pipeline configuration is read from the PR source branch. `pull_request.target` uses target-branch code/config and is a trusted event, but the Review plugin does not support that event. Current PR #96 places `alnilam-structured-review` under the source-side `dev.pull_request` event. Its candidate gate script and artifact-upload stage are therefore not a trusted required gate. **Do not run or merge that config as accepted enforcement.** The plugin digest in the candidate was not independently verified against the image registry.

The candidate parser suite was run locally: `node --test scripts/ci/cnb-review-gate.test.mjs` → **12/12 pass**. It covers schema/severity validation, critical and warning blocks, missing/stale source-target-merge SHA, malformed output, trusted-target identity checks and comment deduplication. This verifies parser behavior only; it does not prove that CNB runs the code from the target branch, provides the required evidence, or enforces the result. The candidate script has not produced a native `REVIEW_PASS`.

CNB documents automatic PR event timing and explicitly marks PR events untrusted; it also documents the per-event `CNB_TOKEN` permission split. The trusted-target/source-report bridge, artifact provenance, required status name, fail-closed behavior and old-review invalidation remain unimplemented/unverified. No custom “ALNILAM-Reviewer” NPC was registered.

## System NPC attempt

Three `pull_request.comment@npc` records were observed across the two isolated CNB PRs. The final PR #2 comment referenced source SHA `6287c39a78940c27a58ef55fff9427d39693d82b`; its build is `cnb-mp2-1k61965hn`. The build failed in CNB's automatic `prepare` checkout before the configured NPC stage: the platform attempted `git submodule update --init --recursive -f` and could not authenticate to private GitHub `.ads`. The failure repeated although the candidate set `git.submodules: false`. NPC model execution was skipped; usage readback showed zero tokens/credits. No NPC response or code Review comment was produced.

The NPC event was requested with **work mode off**. Editing the existing NPC comment did not create another event; a new comment did. Since the pipeline failed before NPC execution, this run does not prove actual no-push/no-merge permissions by attempting those operations. CNB documents non-work-mode NPC permissions as read-only for code/PR and writable for comments; see its [NPC permission documentation](https://docs.cnb.cool/en/build/npc.html) and [built-in token scopes](https://docs.cnb.cool/en/build/build-in-env.html).

## Review test matrix

| Positive/negative case | Result |
| --- | --- |
| Plugin event/schema documentation inspected | **PASS** |
| Candidate parser clean JSON / info-only finding | **PASS — unit test** |
| Candidate critical, warning, unknown severity | **PASS — unit tests block** |
| Candidate malformed/forged JSON | **PASS — unit test blocks** |
| Candidate missing/stale source, target or merge SHA | **PASS — unit tests block** |
| Candidate authenticated comment deduplication | **PASS — mocked API unit test only** |
| Automatic CNB Code Review build and output | **NOT RUN** — event auto-trigger disabled |
| Review result bound to current native source SHA | **NOT VERIFIED** — no native Review output |
| Review missing/timeout/stale result blocks a real PR | **NOT TESTED** |
| `@CodeBuddy` model response | **FAIL** — build aborted during private submodule checkout before model stage |
| NPC work mode off | **PASS (event readback)**; no actual write-denial attempt |
| Independent human approval | **BLOCKED** — no second repository member |

The trusted/untrusted event semantics and safe follow-up boundary are documented by CNB's [trigger rules](https://docs.cnb.cool/en/build/trigger-rule.html), [environment token scopes](https://docs.cnb.cool/en/build/build-in-env.html), and [plugin source](https://cnb.cool/cnb/plugins/cnbcool/code-review).
