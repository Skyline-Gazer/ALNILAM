# CNB CLI and native acceptance

Readback date: 2026-10-29. This is an evidence record, not permission to switch code authority or write GitHub release refs.

## Environment and authentication

- `@cnbcool/cnb-cli` 1.18.31 is installed and authenticated as the repository Owner. `origin` remains GitHub and `cnb` is the explicit CNB HTTPS remote. No credential is stored in a remote URL, file, or this record.
- Git HTTPS pushes used `git -c credential.username=cnb`; the default macOS credential path was not changed. Disposable ref pushes, PR creation/read/close, and ref cleanup were exercised.
- The CLI token can read repository settings but lacks `repo-manage:rw`. The Owner changed CNB `dev` approval settings in the authenticated web UI under the explicit Plan B authorization. The original and current values are in [CNB-DEV-SETTINGS.md](CNB-DEV-SETTINGS.md).
- CNB `main`/`dev` and historical annotated tags matched GitHub at the verified SHAs in [CNB-WORKFLOW.md](CNB-WORKFLOW.md). No push to `main` or `dev` was attempted.

## Native build evidence

| Run | Event and tested revision | Result |
| --- | --- | --- |
| `cnb-kcp-1k61p09tu` | Candidate PR #4 `pull_request`; source `98511ad526c0d77ede979e88ebe5b9c4f584a739`, target `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`, Review JSON merge identity `529672ba104c5307eb7c34f5c0a6b8e3b270d8e6` | **PASS** — official advisory Code Review returned `passed`, zero issues; native identity was recorded |
| `cnb-oi5-1k61oiv57` | Scratch PR #5 `pull_request.target`; source `78fd54a80be70aebdc1b9b891d68937fede76373`, target `cba3353613402646440858f9298af87b8450ba74`, exact merge/tested `434e4a66eb6566c478810851dbd83ffc982da4b5` | **PASS** — all target stages passed; 9,830,956-byte evidence archive downloaded, SHA-256 `417daf4a53e954e692975990505a1bd60ff7c2fc50e1e6037c7fd552577423c6`; 126 bounded entries, 42 Lighthouse JSON reports, and receipts bound source/target/merge/tested SHAs |
| `cnb-iin-1k61q4mp4` | Scratch PR #5 `pull_request.target`; candidate target `98511ad526c0d77ede979e88ebe5b9c4f584a739`, source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3` | **PENDING** — Prepare/install passed; exact-merge identity/test stage running |
| `cnb-pln-1k61q4mp3` | Scratch PR #5 source-side `pull_request`; source marker `54f043d806e346aca7fb42ce5e2ba3f3aff4ecc3` | **PASS** — isolated official advisory Review pipeline completed |

The passing `cnb-oi5` archive contains 9 successful deterministic build receipts, browser receipt with no lingering ports, an intentional negative browser run with a screenshot and trace, 42 Lighthouse reports, coverage at 388/491 lines (79.02%, 77% minimum), and mobile/desktop expected-red CLS receipts. Scanner stages reported zero high/critical vulnerability or license findings. The downloaded archive remains at `/tmp/alnilam-cnb-evidence-cba/cnb-evidence-cba3353.tgz` for this session.

An earlier final-head run (`cnb-65d-1k61petm9`) completed its browser/Lighthouse suite but failed at the exact-merge live-ref check because the scratch refs were deleted while it was running. The refs were restored at their original SHAs and PR #5 reopened; the rerun `cnb-iin-1k61q4mp4` is pending after Prepare/install. The completed positive run above tests the same target harness on `cba3353`; no run installs the workflow on `dev`.

## Branch-protection behavior smoke

On a disposable target branch protected with the same Plan B rule values as current `dev`, CNB PR #6 demonstrated:

- With **zero statuses**, CNB reported `blocked_on=unblocked` and `mergeable_state=mergeable`; `check-status` returned success with no status entries. The branch rule does not require a check to exist.
- With an intentionally failing status (`cnb-if2-1k61pq4p0`), the PR became `blocked_on=status_check` and a merge attempt returned HTTP 409.
- A direct push to the protected scratch target was rejected by CNB.

This is a **FAIL** for strict Required Checks acceptance: the UI/API wording is “if there are status checks,” and does not name a required check. Official [CNB trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) confirms that mergeability checks apply only when a status check exists. Actual `dev` denial behavior remains untested; no `dev` or `main` push/merge attempt was made. Scratch rule `97162af2214c8d27a996700157d1a327b9d41c05` was deleted, PR #6 was closed unmerged, and both scratch refs were removed.

## PR and permission boundary

- CNB bootstrap PR [#4](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/4) is open and unmerged to `dev` at `98511ad526c0d77ede979e88ebe5b9c4f584a739`. The target branch has no trusted `.cnb.yml` until the Owner explicitly authorizes this formal merge.
- Disposable CNB PR [#5](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/5) is open only to complete the final-head rerun and targets `codex/cnb-target-config-20261029`. Its refs were restored at the exact original SHAs after the first final-head run failed on the live-ref guard. Close it unmerged and remove both scratch refs only after the rerun completes.
- CNB `dev` Plan B readback keeps PRs and the status-check toggle enabled, disables mandatory reviewer approval, and prohibits direct/force pushes, deletion, bypass, auto-merge, and NPC self-approval. Scratch testing showed that a failing existing check and direct push are rejected, but a PR with zero checks is considered mergeable. Strict Required Checks acceptance therefore fails pending a platform-supported mitigation; actual `dev` behavior remains untested.
- Root organization event/cron/NPC switches and configured event triggers were already enabled. Owner-selected organization scope required no trigger mutation; untrusted-event and scheduled cross-repository access stay disabled. `airingcal-secrets` state remains unreadable to this token (403).
- `@CodeBuddy` stopped in Prepare while recursively checking out private `.ads`; the model did not run. The candidate trusted pipeline sets `git.submodules: false`, and its scratch Prepare and target run passed without fetching the private submodule.
- No merge command was issued. No `main` protection change, first mirror write, production publish/deploy, or formal tag occurred.

The CLI exposes read, branch-protection, PR, build, asset, and review operations; write scope is limited by the active token. The native and local evidence is recorded in [CNB-REVIEW.md](CNB-REVIEW.md), [CNB-WORKFLOW.md](CNB-WORKFLOW.md), and [CUTOVER-READINESS.md](CUTOVER-READINESS.md).
