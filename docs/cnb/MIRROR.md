# CNB to GitHub PR mirror

Status: **design only; not implemented or executed** (2026-10-30). GitHub remains primary. The Owner selected CNB Primary + an independent Gatekeeper + a GitHub PR release mirror, but CNB acceptance and a later release authorization remain prerequisites. GitHub Issues and Project #17 remain the task tracker.

## Minimal release path

For a separately approved production-clean CNB `main` SHA, the intended path is `CNB main → sync/cnb-main → GitHub PR → verify → Merge Commit`. The operator uses the existing repository, `gh` authentication, Actions `verify`, the existing `alnilam-main` ruleset, and native Auto-merge. No GitHub review agent, separate audit service, additional CI framework, or default GitHub App is part of this design.

Each release must start from the latest GitHub `main`, merge the approved CNB source history without rewriting its commits, and verify that the candidate Git tree exactly matches the approved CNB production tree. A conflict, unapproved GitHub-only difference, moved source/base, or tree mismatch stops the operation. The resulting PR must retain the CNB source commit as an ancestor and use a Merge Commit. GitHub's own merge commit means GitHub and CNB head SHAs need not match; tree equivalence and ancestry are distinct from an exact-SHA mirror.

The fixed sync branch is updated only by fast-forward. Serialize releases; do not replace an unmerged sync candidate or force-push to recover. A repeated, already merged source/tree is a no-op. A failed PR creation, missing/pending/failed check, concurrent `main` change, or failed Auto-merge leaves the PR/ref for investigation and a safe retry. Never relax the `main` ruleset to make a sync pass.

The existing ruleset requires a PR and strict `verify` from GitHub Actions (integration 15368) and has no bypass actor. Repository Auto-merge was **disabled** at readback; enabling it is a separate repository configuration decision before unattended use. [PR #112](https://github.com/Skyline-Gazer/ALNILAM/pull/112) proposes a production-clean ADS pin check while retaining the production-boundary checks. A green development PR alone is not a real mirror or proof of release acceptance.

Record the CNB source SHA, GitHub base and sync SHAs, final GitHub merge SHA, exact tree ID, CI run, and PR URL for each approved release. The evidence record is not itself approval. GitHub documentation warns that PRs created with a workflow's `GITHUB_TOKEN` require workflow approval; use existing `gh` authentication for operator-driven tests, and decide the minimum credential only when unattended operation is actually needed. Never expose mirror credentials to untrusted PR code.

## ADS and tags

The pinned ADS v0.4.2 synchronizer (`.ads/scripts/sync_cnb_release.py`) verifies source refs, approval manifest, tag identity and destination readback, but assumes GitHub `main` is an ancestor of the exact CNB `main` and pushes directly to `main`. It cannot implement this PR protocol unchanged. It must not be run with `--execute` for the proposed mirror or modified in the released ADS pin. Any thin adapter must reuse applicable ADS validation without copying its complete synchronization engine.

The existing [first-sync manifest](first-sync-manifest.json) is deliberately unapproved; its dry-run stops at approval validation, not at a successful ref check. Tags are separate from GitHub Releases and require separate authorization. After a verified PR merge, only an approved tag whose original peeled commit is an ancestor of GitHub `main` may be copied; preserve its original annotated tag object and peeled commit, reject collisions, and never overwrite a tag. This tag protocol is not yet implemented or verified.

## Remaining acceptance

An isolated multi-round test must establish first and incremental sync, repeated no-op, GitHub merge-commit ancestry, strict CI and Auto-merge, concurrent updates, conflicts, mismatched trees/tags, failed PR/merge operations, and recovery. Record which cases actually ran. No test may mutate real `main`, create a production tag, trigger Pages, or perform the first real mirror.
