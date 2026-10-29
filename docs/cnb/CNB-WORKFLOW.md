# CNB developer workflow acceptance

Readback: 2026-10-29. **CNB is not yet the accepted development authority.** GitHub PR #96 now points to `7f080e02cc56f49d066cc4036a6d4c914f4b367a`; its current GitHub checks pass 6/6, and its exact candidate SHA has now passed native positive `pull_request.target` E2E on scratch. The negative no-op-script test failed closed as designed. CNB's zero-status rule still permits merge, so strict Required Checks fails and the workflow is not installed on actual `dev` because PR #4 remains unmerged.

## Latest final acceptance evidence

- Credential preflight: macOS `osxkeychain` supplied the existing `cnb` HTTPS credential for `cnb.cool/KoolingMachine/ALNILAM`; a sanitized read confirmed presence without printing it. `git ls-remote` and isolated pushes succeeded using `https://cnb.cool/KoolingMachine/ALNILAM` without `.git`. No global helper, host setting, protected ref, or token file changed.
- Positive [native build `cnb-jhf-1k6423aiu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-jhf-1k6423aiu) on PR #11 `pull_request.target`: source `5f3f03b09453c5a892ffc27f99c4b70d7c8444d3`; target `7f080e02cc56f49d066cc4036a6d4c914f4b367a`; merge/tested `f39faf197ccbd9078a60192c0de11bc9cfdc3b37`. The target-owned pipeline ran, all 14 stages passed, and its downloaded [evidence archive](https://cnb.cool/KoolingMachine/ALNILAM/-/commit/7f080e02cc56f49d066cc4036a6d4c914f4b367a?tab=attachments) matched CNB SHA-256 metadata: `e8d29826daca486bd1809f7d96cc463527d1959956c6196dfbd9ed7599072b9a` (29,184,087 bytes; 187 safe entries).
- Negative [native build `cnb-phj-1k642341e`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-phj-1k642341e) on PR #12 `pull_request.target`: candidate `.cnb.yml` attempted no-op scripts and the branch added a deliberately invalid Astro page. The target-owned exact-merge gate failed in `stage-1`; subsequent coverage/security/archive stages were skipped. This is the expected fail-closed result. The source-side test fixture separately stopped in Prepare while fetching private `.ads`; that does not negate the target event result and no private content/token was sent to CNB.
- Archive receipts bind source/target/merge/tested SHAs; nine deterministic commands passed and before/after external Site digests match. Coverage is 393/496 Node lines (79.23%, 77% minimum). Browser execution is 18 passed/one intentional skip; browser negative and Lighthouse mobile/desktop regressions have expected-red receipts. Vulnerability and component-license gates passed. SourceSCA is not configured.
- Strict branch protection is **FAIL**: CNB has a required-status toggle but no named-check requirement; actual scratch behavior permits a PR with zero statuses. Existing failed status and direct push were blocked. Pending-status behavior is unverified. Therefore `CNB_CONSUMER_ACCEPTED=NO` and `CNB_CUTOVER_READY=NO` even though the deterministic gate itself passes native E2E.
- PR #4 remains open/unmerged; PR #96 and this docs PR #111 remain unmerged. No Cutover, first Mirror, production action, or protected-ref mutation occurred.
- Toolchain preflight: RTK 1.1.0; `rtk init --show --codex` confirms local/global Codex hook configuration; local and global hook configs contain `PreToolUse`; `rtk proxy git status --short --branch` completed successfully. CodeGraph pin `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` is verified `SOURCE_FALLBACK` 1.1.1 because official npm/release sources are absent, not a stable release; the initialized index has 128 files and no pending changes, and an actual explore operation was exercised. Do not characterize the fallback as latest stable.

## Ref parity and current boundary

Initial GitHub (`origin`) and CNB (`cnb`) readbacks matched:

| Ref | SHA/OID |
| --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0`–`v0.1.3` | Annotated tag object OIDs and peeled commits match |

CNB `main` protection and GitHub `main` protection were not changed. GitHub remains the current code authority. No production refs were written.

## Trigger and branch-protection readback

- On 2026-10-29, the signed-in UI confirmed root organization event/cron/NPC switches on. Repository event triggers are on for `ALNILAM`, `ads-cnb-acceptance-20261027`, `AiringCal`, and `airingcal-control`; `code-import` event and cron triggers are off. The Owner selected organization-level event scope, so the four configured repositories are unlocked. No root or repository trigger setting needed mutation. Untrusted-event and scheduled cross-repository access remain off. The `airingcal-secrets` settings page was inaccessible; its trigger state is unverified.
- CNB `dev` rule `34c6fceca75e456f25e7e99531e2425c6c1de443` implements the Owner-approved Plan B: PR required, manual reviewer approval disabled, status checks required, direct push/force push/deletion and Owner/admin bypass disabled, auto-merge off, and NPC self-approval forbidden. The original values and rollback steps are in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md).
- The dev rule has no named-check setting; the UI says checks must pass “if there are status checks.” On a disposable branch with matching rule values, a PR with zero statuses was `unblocked`/`mergeable`, while an intentionally failing status was blocked and a merge attempt returned HTTP 409. Direct push to that scratch target was rejected. This is **not sufficient for strict Required Checks acceptance**. Actual `dev` behavior remains untested; no protected `dev` or `main` write was attempted. The official [CNB trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) describes the same conditional behavior.
- The repository has one human Owner. Formal merge of candidate CNB PR #4 into `dev` requires the Owner's explicit authorization even though mandatory independent approval is disabled.

## Native disposable acceptance

- Candidate CNB PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) remains open/unmerged at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. GitHub PR [#96](https://github.com/Skyline-Gazer/ALNILAM/pull/96) is Draft at `7f080e02cc56f49d066cc4036a6d4c914f4b367a`. Historical advisory Review and target runs on `98511ad` remain historical; current-head native evidence is documented above.
- Positive target run [`cnb-jhf-1k6423aiu`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-jhf-1k6423aiu) proves `pull_request.target` actually fired and ran the target-owned trusted gate. Source/target/merge/tested SHAs are `5f3f03b09453c5a892ffc27f99c4b70d7c8444d3` / `7f080e02cc56f49d066cc4036a6d4c914f4b367a` / `f39faf197ccbd9078a60192c0de11bc9cfdc3b37` / `f39faf197ccbd9078a60192c0de11bc9cfdc3b37`. All 14 stages passed. Attachment size/hash and path inspection are recorded in [CNB-CLI.md](CNB-CLI.md).
- Adversarial target run [`cnb-phj-1k642341e`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-phj-1k642341e) failed closed after the no-op-script candidate also introduced an invalid Astro page; later security and archive stages did not run. Both scratch target events used target-owned `.cnb.yml` and did not require private `.ads` content.
- Trusted target build [`cnb-oi5-1k61oiv57`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-oi5-1k61oiv57) passed on candidate `cba3353613402646440858f9298af87b8450ba74`, exact merge/tested SHA `434e4a66eb6566c478810851dbd83ffc982da4b5`, and source marker `78fd54a80be70aebdc1b9b891d68937fede76373`. Its 9,830,956-byte archive SHA-256 is `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`; 126 bounded entries and all source/target/merge/tested receipts were checked.
- Historical target build [`cnb-iin-1k61q4mp4`](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-iin-1k61q4mp4) was triggered by `pull_request.target` against `98511ad`, with source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`; all 14 stages passed and it bound exact merge/tested SHA `c131e6d560db8dab395ee201e7a517d4b620e498`. This run predates the current trusted-harness hardening. Its archive hash matched CNB metadata; it held 127 safe entries, 36 Lighthouse JSON reports, browser screenshot/trace negative evidence, source-bound receipts, and nine successful deterministic build receipts. Node-source coverage was 79.02% (388/491 lines; 77% minimum). Vulnerability and component-license diff gates each reported zero new risk findings; source license scan was disabled because SourceSCA was not configured.
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
| Prior GitHub PR #96 head `4e37bdc` checks | **PASS (prior head)** | Six statuses passed on the previous candidate |
| Trusted target native E2E on `cba3353` | **PASS (scratch only)** | `cnb-oi5-1k61oiv57`, receipts and archive hash verified |
| Trusted target native E2E on final `98511ad` | **PASS (scratch only)** | `cnb-iin-1k61q4mp4`, exact merge/tested SHA `c131e6d`, archive hash and receipts verified; PR #5 merged on scratch |
| Earlier `00651cc` local checks | **PASS (historical)** | 43/43 tests, Astro check, build, and unchanged Site digest on that prior head |
| Latest GitHub PR #96 checks on `7f080e0` | **PASS (6/6)** | Read back with `gh pr checks 96`; the trusted-gate fixes are on the current head |
| Trusted target native E2E on current `7f080e0` | **PASS (scratch only)** | `cnb-jhf-1k6423aiu`; exact source/target/merge/tested receipts and downloaded archive hash verified |
| No-op-script native adversarial test | **EXPECTED FAIL-CLOSED** | `cnb-phj-1k642341e`; target gate failed on injected invalid Astro; security and archive stages skipped |
| Source-side fixture `pull_request` setup | **FAIL IN PREPARE** | Private `.ads` checkout attempted without GitHub credentials; target-side trusted run did not fetch the private submodule |
| Candidate workflow installed on `dev` | **NO** | CNB PR #4 remains unmerged |
| Scratch protected target direct push | **PASS** | CNB rejected direct push; temporary rule and refs were removed |
| Scratch failing-check merge denial | **PASS** | PR blocked on status_check; merge attempt HTTP 409 |
| Scratch missing-check merge denial | **FAIL** | Zero-status PR reported unblocked/mergeable; CNB docs say checks apply if present |
| Scratch pending-check merge denial | **NOT VERIFIED** | A still-running status was not separately tested; the zero-status case already fails strict acceptance |
| Required-check behavior on actual `dev` | **NOT TESTED** | Protected target was not attempted; strict required-check acceptance fails on scratch behavior |
| New NPC mention event | **PASS (event only)** | `@CodeBuddy` build `cnb-mp2-1k61965hn` recorded; Prepare failed before model |
| Editing an old comment does not retrigger NPC | **NOT TESTED** | No edit test was run |
| NPC model execution / write-denial behavior | **FAIL / NOT TESTED** | Platform Prepare stopped before model stage |
| Critical Review negative | **FAIL / NOT A GATE** | Model trace detected `critical`; invalid JSON prevented comment writeback; Review build still succeeded |
| Consumer acceptance / workflow readiness | **NO** | Current native workflow succeeds/fails closed, but a missing status still permits merge and candidate `.cnb.yml` is not installed on `dev` |
| Auto-merge disabled | **PASS (readback)** | No behavior test |

Workflow trust and review semantics are in [CNB-REVIEW.md](CNB-REVIEW.md); cutover and mirror boundaries are in [CUTOVER-READINESS.md](CUTOVER-READINESS.md).
