# CNB CLI and native acceptance

Readback date: 2026-10-29. This is an evidence record, not permission to switch code authority or write GitHub release refs.

## Environment and authentication

- `@cnbcool/cnb-cli` 1.18.31 is installed and authenticated as the repository Owner. `origin` remains GitHub and `cnb` is the explicit CNB HTTPS remote. No credential is stored in a remote URL, file, or this record.
- Git HTTPS pushes used `git -c credential.username=cnb`; the default macOS credential path was not changed. Disposable ref pushes and PR creation/read/merge were exercised. A post-test `git push cnb --delete` returned CNB `Repository Not Found`; the same scratch refs were successfully removed through authenticated `cnb git delete-branch` (`repo-code:rw`). No protected ref was involved.
- The CLI token can read repository settings but lacks `repo-manage:rw`. The Owner changed CNB `dev` approval settings in the authenticated web UI under the explicit Plan B authorization. The original and current values are in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md).
- On 2026-10-29, the signed-in UI readback showed organization event/cron/NPC controls on, with event triggers on for four configured repositories; ALNILAM's own event trigger is on. No setting changed. The same CLI credential read refs but rejected pushing current candidate `4e37bdc` to the non-production bootstrap branch with `Repository Not Found`. A scoped CNB repository-write credential or Owner-pushed branch is required before the current head can be exercised natively.
- CNB `main`/`dev` and historical annotated tags matched GitHub at the verified SHAs in [CNB-WORKFLOW.md](CNB-WORKFLOW.md). No push to `main` or `dev` was attempted.

## Native build evidence

| Run | Event and tested revision | Result |
| --- | --- | --- |
| `cnb-kcp-1k61p09tu` | Candidate PR #4 `pull_request`; source `98511ad526c0d77ede979e88ebe5b9c4f584a739`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`, Review JSON merge identity `529672ba104c5307eb7c34f5c0a6b8e3b270d8e6` | **PASS** — official advisory Code Review returned `passed`, zero issues; native identity was recorded |
| `cnb-oi5-1k61oiv57` | Scratch PR #5 `pull_request.target`; source `78fd54a80be70aebdc1b9b891d68937fede76373`, target `cba3353613402646440858f9298af87b8450ba74`, exact merge/tested `434e4a66eb6566c478810851dbd83ffc982da4b5` | **PASS** — all target stages passed; 9,830,956-byte evidence archive downloaded, SHA-256 `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`; 126 bounded entries, 42 Lighthouse JSON reports, and receipts bound source/target/merge/tested SHAs |
| `cnb-iin-1k61q4mp4` | Scratch PR #5 `pull_request.target`; source `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3`, target `98511ad526c0d77ede979e88ebe5b9c4f584a739`, exact merge/tested `c131e6d560db8dab395ee201e7a517d4b620e498` | **PASS** — all 14 stages; archive SHA-256 `c4ad40391cac5b795681b49fa51e1f28b1f0a9ca8a3fdff8b4ceecde90156e21`; 127 bounded entries; PR #5 merged only to disposable target at `730b63df81ce37f0db17b20b5ec15220d4cc7420` |
| Current GitHub PR #96 head `4e37bdc` | Target-controlled harness hardening | **GitHub CI/local PASS; NOT RUN natively** — six GitHub checks passed; 42/42 tests, nine consumer steps, 18 browser passes/1 intentional skip, expected-red screenshot/trace, and one-off local no-op fixture failed closed; receipt is ignored/local only; CNB push rejected by the active CLI credential |
| `cnb-pln-1k61q4mp3` | Scratch PR #5 source-side `pull_request`; source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3` | **PASS** — isolated official advisory Review pipeline completed |
| `cnb-uo9-1k61qmo2c` | Disposable Critical-review PR #7; source `077fcfa40f1768c31345c4e76383dd0221d25e1e`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` | **DETECTED, NOT GATED** — model log returned `critical`, but invalid JSON prevented comment writeback; Review stage exited 0 and pipeline succeeded |

The earlier passing `cba3353` archive contains 9 successful deterministic build receipts, browser receipt with no lingering ports, an intentional negative browser run with screenshot and trace, 42 Lighthouse reports, coverage at 388/491 lines (79.02%, 77% minimum), and mobile/desktop expected-red CLS receipts. The final-head `98511ad` archive is 10,050,080 bytes with SHA-256 `c4ad40391cac5b795681b49fa51e1f28b1f0a9ca8a3fdff8b4ceecde90156e21`; its 127 entries have 40,632,701 expanded bytes, include 36 Lighthouse JSON reports, and bind source `54f043d`, target `98511ad`, and tested merge `c131e6d`. Final coverage is 388/491 lines (79.02%, 77% minimum). The browser negative, mobile/desktop CLS expected-red receipts, and all nine deterministic build receipts are present. Vulnerability and component-license diff gates reported zero new risk findings. Source license scanning was disabled because the SourceSCA endpoint was not configured; do not treat that as a completed source-license scan.

An earlier final-head run (`cnb-65d-1k61petm9`) completed its browser/Lighthouse suite but failed at the exact-merge live-ref check because scratch refs were deleted while it was running. The refs were restored at their original SHAs; final-head rerun `cnb-iin-1k61q4mp4` then passed, its evidence archive was downloaded and verified, and disposable PR #5 was merged at `730b63df81ce37f0db17b20b5ec15220d4cc7420`. The source and target scratch refs have been deleted. No run installs the workflow on actual `dev`.

## Branch-protection behavior smoke

On a disposable target branch protected with the same Plan B rule values as current `dev`, CNB PR #6 demonstrated:

- With **zero statuses**, CNB reported `blocked_on=unblocked` and `mergeable_state=mergeable`; `check-status` returned success with no status entries. The branch rule does not require a check to exist.
- With an intentionally failing status (`cnb-if2-1k61pq4p0`), the PR became `blocked_on=status_check` and a merge attempt returned HTTP 409.
- A direct push to the protected scratch target was rejected by CNB.

This is a **FAIL** for strict Required Checks acceptance: the UI/API wording is “if there are status checks,” and does not name a required check. Official [CNB trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) confirms that mergeability checks apply only when a status check exists. Actual `dev` denial behavior remains untested; no `dev` or `main` push/merge attempt was made. Scratch rule `97162af2214c8d27a996700157d1a327b9d41c05` was deleted, PR #6 was closed unmerged, and both scratch refs were removed.

## PR and permission boundary

- CNB bootstrap PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) is open and unmerged to `dev` at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. The target branch has no trusted `.cnb.yml` until the Owner explicitly authorizes this formal merge. GitHub PR #96 is at `4e37bdc9a5e9957991b9c445e3cabffaa839a1f9`, but that new head is not yet present on the CNB branch.
- Disposable CNB PR [#5](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/5) was merged only into its scratch target after the final-head run passed; scratch merge SHA is `730b63df81ce37f0db17b20b5ec15220d4cc7420`, and both scratch refs have been deleted. This does not authorize the formal candidate PR #4 merge into actual `dev`.
- CNB `dev` Plan B readback keeps PRs and the status-check toggle enabled, disables mandatory reviewer approval, and prohibits direct/force pushes, deletion, bypass, auto-merge, and NPC self-approval. Scratch testing showed that a failing existing check and direct push are rejected, but a PR with zero checks is considered mergeable. Strict Required Checks acceptance therefore fails pending a platform-supported mitigation; actual `dev` behavior remains untested.
- Root organization event/cron/NPC switches and configured event triggers were already enabled. Owner-selected organization scope required no trigger mutation; untrusted-event and scheduled cross-repository access stay disabled. `airingcal-secrets` state remains unreadable to this token (403).
- `@CodeBuddy` build `cnb-mp2-1k61965hn` was triggered by a new `pull_request.comment@npc` mention with Work Mode off, but stopped in Prepare while recursively checking out private `.ads`; the model did not run and no reply was posted. Editing an existing comment to add the mention was not tested. The candidate trusted pipeline sets `git.submodules: false`, and its final scratch target run passed Prepare without fetching the private submodule. Critical probe build `cnb-uo9-1k61qmo2c` shows AI Review is advisory: the model identified a Critical fixture, but emitted invalid JSON; writeback failed while the Review stage and build exited successfully.
- Only disposable PR #5 was merged to a scratch target. No formal `dev`/`main` merge, `main` protection change, first mirror write, production publish/deploy, or formal tag occurred.

The CLI exposes read, branch-protection, PR, build, asset, and review operations; write scope is limited by the active token. The native and local evidence is recorded in [CNB-REVIEW.md](CNB-REVIEW.md), [CNB-WORKFLOW.md](CNB-WORKFLOW.md), and [CUTOVER-READINESS.md](CUTOVER-READINESS.md).

### Owner action needed to resume native acceptance

Provide the CNB CLI repository-scoped Git write permission for `KoolingMachine/ALNILAM`, or push commit `4e37bdc9a5e9957991b9c445e3cabffaa839a1f9` to the non-production ref `codex/cnb-bootstrap-94-20261029`. Then rerun the target-side positive pipeline and a separate no-op-script adversarial PR. This does not authorize merging CNB PR #4 into `dev`.
