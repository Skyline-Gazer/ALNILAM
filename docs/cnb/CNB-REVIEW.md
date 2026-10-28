# CNB Review and NPC acceptance

Readback: 2026-10-29. **The final-head native trusted target rerun passed on scratch at `98511ad`; the candidate pipeline is still not installed on actual `dev`.** A full final-head archive was downloaded, hash-checked against CNB asset metadata, and inspected. An earlier `98511ad` run failed because scratch refs were deleted before the gate finished; refs were restored at their original SHAs before the successful rerun. AI Review remains advisory, deterministic trusted checks remain separate, and formal merge to `dev` still requires explicit Owner authorization.

## Official AI Review

The source-side `pull_request` pipeline pins `cnbcool/code-review:v1.22.2` by digest. It records the Review JSON and CNB PR/source/target/merge identity. The plugin does not claim `pull_request.target` support, and a Review result never approves or blocks a formal merge.

- Build [`cnb-6ml-1k61og8mp`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-6ml-1k61og8mp) reviewed candidate head `cba3353613402646440858f9298af87b8450ba74`, returned `needs_modification`, and posted five inline comments. Four comments were false positives after checking the trusted harness, actual demo routes, listener detection, and failure-log retention. The valid finding was that the unit test reporter hid failing-test diagnostics.
- The valid finding was fixed in `98511ad526c0d77ede979e88ebe5b9c4f584a739`: Node test `spec` output is retained in `artifacts/unit-coverage.log`, while LCOV is written separately to `artifacts/coverage/lcov.info`. An intentional failing probe confirmed the named failing test and assertion remain visible while LCOV stays parseable.
- Build [`cnb-kcp-1k61p09tu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-kcp-1k61p09tu) completed on head `98511ad526c0d77ede979e88ebe5b9c4f584a739`. Its Review JSON was `passed` with zero issues; source `98511ad`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`, and recorded merge identity `529672ba104c5307eb7c34f5c0a6b8e3b270d8e6` were verified in the stage log.
- Disposable critical probe PR #7 ran the pinned Review on source `077fcfa40f1768c31345c4e76383dd0221d25e1e` against target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` in build [`cnb-uo9-1k61qmo2c`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-uo9-1k61qmo2c). The model explicitly returned `critical` for an unreferenced `eval(untrustedInput)` fixture. The response was not valid JSON, so the plugin could not post a PR comment; native PR comments remained empty. The Review stage nevertheless exited 0 and the pipeline was `success`. This proves detection in the model trace only, not a functioning critical gate or successful result writeback. PR #7 was closed unmerged and its disposable source ref deleted.
- Replies documenting the four false positives and the diagnostic fix were posted to both older Review threads. The full-Diff review budget is finite at 80 turns with a 10-minute timeout after earlier 20- and 40-turn runs exhausted their limits.

## Trusted target gate

The trusted pipeline is under `pull_request.target`. It re-reads the native CNB PR and live refs, binds source/target/merge/tested SHAs, copies only the trusted harness from the target checkout, and runs candidate code without CNB or private ADS credentials. It validates build, browser, Lighthouse, coverage, and SCA evidence before a bounded archive upload and receipt check.

- Scratch build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed all stages with source `78fd54a80be70aebdc1b9b891d68937fede76373`, target candidate `cba3353613402646440858f9298af87b8450ba74`, and merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`.
- The 9,830,956-byte archive was downloaded and SHA-256 verified as `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`. Its 126 entries passed path/type/count/size checks; receipts bound the exact source, target, merge and tested SHA; all nine deterministic build steps passed; coverage was 388/491 lines (79.02%, 77% minimum); there were 42 Lighthouse JSON reports, mobile/desktop CLS expected-red receipts, and a browser negative receipt with screenshot and trace. Vulnerability and component-license diff gates reported zero new risk findings; source-license scanning was disabled because the SourceSCA endpoint was not configured.
- Final-head build [`cnb-iin-1k61q4mp4`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-iin-1k61q4mp4) passed `pull_request.target` on scratch with source `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`, target `98511ad526c0d77ede979e88ebe5b9c4f584a739`, and exact merge/tested SHA `c131e6d560db8dab395ee201e7a517d4b620e498`. All 14 pipeline stages succeeded. Its 10,050,080-byte evidence archive SHA-256 is `c4ad40391cac5b795681b49fa51e1f28b1f0a9ca8a3fdff8b4ceecde90156e21`; 127 entries (40,632,701 expanded bytes) passed safe path/type/bounds inspection. Receipts bind source/target/merge/tested SHAs, nine deterministic build steps passed, coverage was 388/491 lines (79.02%, 77% minimum), and 36 Lighthouse JSON reports were retained. Browser negative and mobile/desktop CLS regression cases were correctly recorded as expected-red. Vulnerability and component-license diff gates passed with zero new risk findings; source-license scanning was disabled because the SourceSCA endpoint was not configured.
- After the successful final run, disposable CNB PR #5 was merged only into its scratch target at merge SHA `730b63df81ce37f0db17b20b5ec15220d4cc7420`; both scratch refs were then deleted. No actual `dev` or `main` ref changed.

A successful scratch run does not establish that the workflow or its required check is active on CNB `dev`; PR #4 remains unmerged and `dev` does not yet contain the target-side configuration. A separate scratch protection PR demonstrated that an existing failed status blocks merge, but zero statuses do not (`blocked_on=unblocked`, `mergeable_state=mergeable`). CNB’s official [trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) says status checks gate merge only when status checks exist. Therefore the protection rule does not satisfy strict Required Checks acceptance without a platform-supported mitigation.

## System NPC

`@CodeBuddy` build `cnb-mp2-1k61965hn` remains **FAIL / not executed**. The new mention produced an `pull_request.comment@npc` event record with Work Mode off (`work_mode=0`), but platform Prepare failed while recursively checking out private `.ads`; the model stage was never reached and no response/comment was written. Editing an old comment to add the mention was **not tested**. NPC write/merge denial was not tested. The trusted target pipeline sets `git.submodules: false` and passed on scratch without fetching private ADS. The separate official advisory Review pipeline works, but is not NPC and cannot be represented as a trusted merge gate.

## Evidence matrix

| Case | Result |
| --- | --- |
| Latest official advisory Review on candidate head `98511ad` | **PASS** — Review JSON `passed`, zero issues, native identity recorded |
| Trusted target pipeline on scratch candidate `cba3353` | **PASS** — complete source-bound run and downloaded archive verified |
| Trusted target pipeline on final head `98511ad` | **PASS (scratch)** — build `cnb-iin-1k61q4mp4`; source/target/merge/tested identity and archive verified; PR #5 merged only to a disposable target |
| Trusted gate installed on CNB `dev` | **NO** — PR #4 remains open/unmerged |
| Scratch missing check blocks merge | **FAIL** — zero statuses were treated as unblocked/mergeable |
| Scratch failing check blocks merge | **PASS** — blocked on status_check; merge attempt returned HTTP 409 |
| Missing/failing trusted required check blocks merge on actual `dev` | **NOT TESTED** |
| Direct push denial on protected scratch branch | **PASS** — direct push rejected; temporary rule deleted |
| Direct push/force-push/deletion denial on actual `dev` | **NOT TESTED** |
| `@CodeBuddy` reaches model and posts a response | **FAIL** — stopped in Prepare before model execution |
| New `@CodeBuddy` mention creates an event | **PASS (event only)** — event record exists; Prepare failed before model |
| Editing an old comment does not trigger NPC | **NOT TESTED** |
| NPC non-Work-Mode write denial | **NOT TESTED** |
| Critical fixture is recognized by the model | **DETECTED, NOT GATED** — build `cnb-uo9-1k61qmo2c` stage log says `critical`; returned JSON is invalid, comment writeback fails, and the pipeline exits 0 |
| Final-head target gate on actual CNB `dev` | **NOT TESTED / NOT INSTALLED** — successful run used a disposable target; bootstrap PR #4 remains open |
| AI Review blocks Critical findings or approves merge | **NO** — advisory only; not a trusted Required Check |
