# CNB Review and NPC acceptance

Readback: 2026-10-29. **The latest native advisory AI Review completed on candidate `98511ad`; the final-head trusted target rerun is pending.** A previous full scratch target run passed on `cba3353` and its source-bound evidence archive was downloaded and inspected. An earlier `98511ad` run failed only because scratch refs were deleted before the gate finished; refs were restored at the original SHAs for rerun `cnb-iin-1k61q4mp4`. AI Review remains advisory, deterministic trusted checks remain separate, and formal merge still requires Owner authorization.

## Official AI Review

The source-side `pull_request` pipeline pins `cnbcool/code-review:v1.22.2` by digest. It records the Review JSON and CNB PR/source/target/merge identity. The plugin does not claim `pull_request.target` support, and a Review result never approves or blocks a formal merge.

- Build [`cnb-6ml-1k61og8mp`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-6ml-1k61og8mp) reviewed candidate head `cba3353613402646440858f9298af87b8450ba74`, returned `needs_modification`, and posted five inline comments. Four comments were false positives after checking the trusted harness, actual demo routes, listener detection, and failure-log retention. The valid finding was that the unit test reporter hid failing-test diagnostics.
- The valid finding was fixed in `98511ad526c0d77ede979e88ebe5b9c4f584a739`: Node test `spec` output is retained in `artifacts/unit-coverage.log`, while LCOV is written separately to `artifacts/coverage/lcov.info`. An intentional failing probe confirmed the named failing test and assertion remain visible while LCOV stays parseable.
- Build [`cnb-kcp-1k61p09tu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-kcp-1k61p09tu) completed on head `98511ad526c0d77ede979e88ebe5b9c4f584a739`. Its Review JSON was `passed` with zero issues; source `98511ad`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`, and recorded merge identity `529672ba104c5307eb7c34f5c0a6b8e3b270d8e6` were verified in the stage log.
- Replies documenting the four false positives and the diagnostic fix were posted to both older Review threads. The full-Diff review budget is finite at 80 turns with a 10-minute timeout after earlier 20- and 40-turn runs exhausted their limits.

## Trusted target gate

The trusted pipeline is under `pull_request.target`. It re-reads the native CNB PR and live refs, binds source/target/merge/tested SHAs, copies only the trusted harness from the target checkout, and runs candidate code without CNB or private ADS credentials. It validates build, browser, Lighthouse, coverage, and SCA evidence before a bounded archive upload and receipt check.

- Scratch build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed all stages with source `78fd54a80be70aebdc1b9b891d68937fede76373`, target candidate `cba3353613402646440858f9298af87b8450ba74`, and merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`.
- The 9,830,956-byte archive was downloaded and SHA-256 verified as `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`. Its 126 entries passed path/type/count/size checks; receipts bound the exact source, target, merge and tested SHA; all nine deterministic build steps passed; coverage was 388/491 lines (79.02%, 77% minimum); there were 42 Lighthouse JSON reports, mobile/desktop CLS expected-red receipts, and a browser negative receipt with screenshot and trace. SCA reported zero high/critical vulnerabilities or license findings.
- Final-head rerun `cnb-iin-1k61q4mp4` targets `98511ad526c0d77ede979e88ebe5b9c4f584a739` with source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`; Prepare/install passed and the exact-merge identity/test stage is running. The earlier attempt failed the live-ref guard after scratch refs were deleted during execution.

A successful scratch run does not establish that the workflow or its required check is active on CNB `dev`; PR #4 remains unmerged and `dev` does not yet contain the target-side configuration. A separate scratch protection PR demonstrated that an existing failed status blocks merge, but zero statuses do not (`blocked_on=unblocked`, `mergeable_state=mergeable`). CNB’s official [trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) says status checks gate merge only when status checks exist. Therefore the protection rule does not satisfy strict Required Checks acceptance without a platform-supported mitigation.

## System NPC

`@CodeBuddy` remains **FAIL / not executed**. The event failed in platform Prepare while recursively checking out private `.ads`; the model stage was never reached. No NPC response/comment or model permission test was produced. Work Mode was read back as off, but write-denial behavior was not attempted. The candidate sets `git.submodules: false`; the trusted scratch pipeline entered its gate and passed without fetching the private submodule. The official advisory Review pipeline is functioning as the separate source-side review path, but it does not replace NPC permission testing or become a trusted merge gate.

## Evidence matrix

| Case | Result |
| --- | --- |
| Latest official advisory Review on candidate head `98511ad` | **PASS** — Review JSON `passed`, zero issues, native identity recorded |
| Trusted target pipeline on scratch candidate `cba3353` | **PASS** — complete source-bound run and downloaded archive verified |
| Trusted target pipeline on final head `98511ad` | **PENDING** — rerun `cnb-iin-1k61q4mp4`; first attempt failed at the live-ref guard after cleanup |
| Trusted gate installed on CNB `dev` | **NO** — PR #4 remains open/unmerged |
| Scratch missing check blocks merge | **FAIL** — zero statuses were treated as unblocked/mergeable |
| Scratch failing check blocks merge | **PASS** — blocked on status_check; merge attempt returned HTTP 409 |
| Missing/failing trusted required check blocks merge on actual `dev` | **NOT TESTED** |
| Direct push denial on protected scratch branch | **PASS** — direct push rejected; temporary rule deleted |
| Direct push/force-push/deletion denial on actual `dev` | **NOT TESTED** |
| `@CodeBuddy` reaches model and posts a response | **FAIL** — stopped in Prepare before model execution |
| NPC non-Work-Mode write denial | **NOT TESTED** |
| AI Review blocks Critical findings or approves merge | **NO** — advisory only |
