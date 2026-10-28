# CNB developer workflow acceptance

Readback: 2026-10-29. **CNB is not yet the accepted development authority.** Initial refs and CLI/Git operations are verified, and Owner-approved Plan B settings are active on `dev`. The final-head trusted target pipeline passed on a disposable branch at candidate `98511ad`, and its scratch PR was merged only into that disposable target. Scratch branch-protection testing found that a PR with zero statuses is considered mergeable, so strict Required Checks acceptance fails even though a failing existing status is blocked. The candidate pipeline is not installed on actual `dev`.

## Ref parity and current boundary

Initial GitHub (`origin`) and CNB (`cnb`) readbacks matched:

| Ref | SHA/OID |
| --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0`–`v0.1.3` | Annotated tag object OIDs and peeled commits match |

CNB `main` protection and GitHub `main` protection were not changed. GitHub remains the current code authority. No production refs were written.

## Trigger and branch-protection readback

- Repository `auto_trigger=true`. Root organization event, cron, and NPC switches were already on. Event triggers were confirmed on for `ALNILAM`, `ads-cnb-acceptance-20261027`, `AiringCal`, and `airingcal-control`. `airingcal-secrets` settings API access returns 403, so that repository's trigger state is unverified. The Owner selected organization-level event scope; no root or repository trigger setting needed mutation. Untrusted-event and scheduled-task cross-repository access remain off.
- CNB `dev` rule `34c6fceca75e456f25e7e99531e2425c6c1de443` implements the Owner-approved Plan B: PR required, manual reviewer approval disabled, status checks required, direct push/force push/deletion and Owner/admin bypass disabled, auto-merge off, and NPC self-approval forbidden. The original values and rollback steps are in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md).
- The dev rule has no named-check setting; the UI says checks must pass “if there are status checks.” On a disposable branch with matching rule values, a PR with zero statuses was `unblocked`/`mergeable`, while an intentionally failing status was blocked and a merge attempt returned HTTP 409. Direct push to that scratch target was rejected. This is **not sufficient for strict Required Checks acceptance**. Actual `dev` behavior remains untested; no protected `dev` or `main` write was attempted. The official [CNB trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) describes the same conditional behavior.
- The repository has one human Owner. Formal merge of candidate CNB PR #4 into `dev` requires the Owner's explicit authorization even though mandatory independent approval is disabled.

## Native disposable acceptance

- Candidate CNB PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) is open/unmerged at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. Its official advisory Review completed on this head with Review JSON `passed` and zero issues. The final-head target rerun passed on disposable PR #5; PR #5 was merged only into scratch and its refs were deleted.
- Trusted target build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed on candidate `cba3353613402646440858f9298af87b8450ba74`, exact merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`, and source marker `78fd54a80be70aebdc1b9b891d68937fede76373`. Its 9,830,956-byte archive SHA-256 is `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`; 126 bounded entries and all source/target/merge/tested receipts were checked.
- Final candidate target build [`cnb-iin-1k61q4mp4`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-iin-1k61q4mp4) was triggered by `pull_request.target` against target head `98511ad526c0d77ede979e88ebe5b9c4f584a739`, with source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`; all 14 stages passed. It bound exact merge/tested SHA `c131e6d560db8dab395ee201e7a517d4b620e498`. The latest source-side event build `cnb-pln-1k61q4mp3` passed. The evidence archive hash matched CNB metadata; it held 127 safe entries, 36 Lighthouse JSON reports, browser screenshot/trace negative evidence, source-bound receipts, and nine successful deterministic build receipts. Node-source coverage was 79.02% (388/491 lines; 77% minimum). Vulnerability and component-license diff gates each reported zero new risk findings; source license scan was disabled because SourceSCA was not configured.
- After that successful run, disposable PR #5 merged only into its scratch target at `730b63df81ce37f0db17b20b5ec15220d4cc7420`; its source and target scratch refs were removed. An earlier run failed the live-ref guard after scratch-ref cleanup; exact original refs were restored before the successful run.
- `@CodeBuddy` failed during private `.ads` checkout in platform Prepare, before NPC/model execution. The target trusted runner sets `git.submodules: false`; the passing scratch run proves it reaches the actual deterministic gate without fetching private ADS.

## Acceptance matrix

| Check | Result | Evidence boundary |
| --- | --- | --- |
| CNB CLI authentication and HTTPS Git | **PASS** | Owner CLI; explicit helper; disposable pushes and cleanup |
| GitHub/CNB `main`, `dev`, historical tag parity | **PASS** | Exact SHA/OID readback |
| Organization/repository event triggers | **PASS (readback)** | Root controls on; four repos confirmed; secret repo inaccessible to this token |
| Plan B `dev` rule | **PASS (readback only)** | PR/status toggle retained; reviewer toggle off; write and bypass prohibitions retained |
| Official AI Review on candidate `98511ad` | **PASS (advisory)** | `cnb-kcp-1k61p09tu`, Review JSON `passed`, zero issues |
| Trusted target native E2E on `cba3353` | **PASS (scratch only)** | `cnb-oi5-1k61oiv57`, receipts and archive hash verified |
| Trusted target native E2E on final `98511ad` | **PASS (scratch only)** | `cnb-iin-1k61q4mp4`, exact merge/tested SHA `c131e6d`, archive hash and receipts verified; PR #5 merged on scratch |
| Candidate workflow installed on `dev` | **NO** | CNB PR #4 remains unmerged |
| Scratch protected target direct push | **PASS** | CNB rejected direct push; temporary rule and refs were removed |
| Scratch failing-check merge denial | **PASS** | PR blocked on status_check; merge attempt HTTP 409 |
| Scratch missing-check merge denial | **FAIL** | Zero-status PR reported unblocked/mergeable; CNB docs say checks apply if present |
| Required-check behavior on actual `dev` | **NOT TESTED** | Protected target was not attempted; strict required-check acceptance fails on scratch behavior |
| New NPC mention event | **PASS (event only)** | `@CodeBuddy` build `cnb-mp2-1k61965hn` recorded; Prepare failed before model |
| Editing an old comment does not retrigger NPC | **NOT TESTED** | No edit test was run |
| NPC model execution / write-denial behavior | **FAIL / NOT TESTED** | Platform Prepare stopped before model stage |
| Critical Review negative | **FAIL / NOT A GATE** | Model trace detected `critical`; invalid JSON prevented comment writeback; Review build still succeeded |
| Consumer acceptance / workflow readiness | **NO** | Scratch E2E passes, but missing-check behavior and actual `dev` installation/enforcement remain unresolved |
| Auto-merge disabled | **PASS (readback)** | No behavior test |

Workflow trust and review semantics are in [CNB-REVIEW.md](CNB-REVIEW.md); cutover and mirror boundaries are in [CUTOVER-READINESS.md](CUTOVER-READINESS.md).
