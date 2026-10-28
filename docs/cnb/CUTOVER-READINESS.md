# ALNILAM CNB Primary / GitHub Mirror readiness

**Readback: 2026-10-28. `CNB_CUTOVER_READY = NO`.** GitHub remains the code authority. The Owner accepted P1 independently; CNB cutover and first mirror write remain a separate, unapproved workstream tracked by [Issue #100](https://github.com/Skyline-Gazer/ALNILAM/issues/100).

## Verified current state

- GitHub `dev` / CNB `dev`: `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`.
- GitHub `main` / CNB `main`: `285a62cecd87f8f20276c7cc989537a391f488c8`.
- Annotated tags `v0.1.0` through `v0.1.3` match between GitHub and CNB by tag-object OID and peeled commit.
- GitHub `main` has the dispatch-only Pages workflow after PR #104. No production deploy was run.
- CNB `main` and `dev` protections read back as PR-required, one approval, status checks required, no direct/force push or deletion, no Owner bypass, and no auto-merge. These are settings readbacks; enforcement has not been tested.
- CNB CLI 1.18.31 authenticated as repository Owner. Git HTTPS via `cnb git-credential`, CNB ref reads, isolated test-branch pushes/deletions, PR creation/read/close and history queries worked. See [CNB-CLI.md](CNB-CLI.md).
- Project #17 readback: #37 `Done`, #100 `In Progress`, and #51 `Todo`. Issue #100 remains open. P1 acceptance is recorded on [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37).

## Acceptance result

| Gate | State |
| --- | --- |
| `CNB_CONSUMER_ACCEPTED` | **NO** |
| `CNB_DEV_WORKFLOW_READY` | **NO** |
| `CNB_REVIEW_GATE_TRUSTED` | **NO** |
| `CNB_CUTOVER_READY` | **NO** |
| `FIRST_MIRROR_EXECUTED` | **NO** |

Reasons:

1. CNB `auto_trigger=false`, so no PR event CI ran. Settings could not be changed with the current token; the CLI lacks `repo-manage:rw`.
2. The repository has one member, leaving no independent reviewer. Isolated PR #2 was mergeable but had zero reviews and was closed without merge.
3. The current #96 source pipeline places the structured gate under an untrusted PR event and includes an attachment upload. Its candidate unit tests pass 12/12 locally but do not make it a trusted or required CNB check. The official Code Review plugin does not support `pull_request.target`; no trusted evidence bridge was tested. See [CNB-REVIEW.md](CNB-REVIEW.md).
4. Three `@CodeBuddy` NPC events were recorded, but the final build `cnb-mp2-1k61965hn` failed during CNB's automatic private `.ads` checkout before NPC execution. No Review, SCA, Playwright or Lighthouse run was produced by this consumer.
5. Branch-protection enforcement, required-check identity, real review rejection, stale-SHA invalidation, direct-push denial and merge denial were not exercised. No scope was broadened to enable unsafe tests.
6. The first-sync manifest remains unapproved. ADS's dry-run exited at its approval guard; no mirror write was made. The no-bypass GitHub-main ruleset conflicts with ADS's direct-write mode by policy readback; an actual push denial was not tested.

## Next required decisions

- Establish a second independent human reviewer and authorize a least-scope `repo-manage:rw` path (or have the Owner perform the settings write outside this token), then re-read pipeline settings and protections.
- Resolve the trusted Review design: source-side Code Review is advisory; the plugin does not support the trusted target event; the source-SHA-bound report bridge and required status behavior need a supported, tested implementation.
- Resolve the public CNB runner's private `.ads` prepare failure without adding GitHub cross-repo credentials to public CI. Do not claim NPC acceptance until a build reaches the model and its no-work-mode behavior is observed.
- Re-run the isolated PR acceptance with automatic source/target CI, browser/Lighthouse artifacts, review output, required checks and independently approved merge. Only then reassess consumer acceptance.
- Separately authorize any change to GitHub's protected-main direct-write conflict, exact manifest approvals, first mirror write, production deployment or release tag.

## Detail

- [CNB CLI/Git E2E](CNB-CLI.md)
- [Developer workflow and protection matrix](CNB-WORKFLOW.md)
- [Automatic Review and NPC evidence](CNB-REVIEW.md)
- [Mirror policy, manifest and dry-run](MIRROR.md)

The pinned ADS v0.4.2 checkout is `.ads` commit `375fc71f977c40c2053140c34431cc60a6d42883`; no ADS source was changed and generic ADS acceptance was not rerun.
