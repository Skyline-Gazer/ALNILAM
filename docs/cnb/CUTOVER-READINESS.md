# ALNILAM CNB Primary / GitHub Release Mirror — Consumer Preflight

**Status: PREPARED / NOT CUT OVER — 2026-10-28.** GitHub remains the current code authority. This is an isolated dev PR supporting [Issue #100](https://github.com/Skyline-Gazer/ALNILAM/issues/100), not a production authorization. Source of implementation: [ADS v0.4.2](https://github.com/Skyline-Gazer/ADS/releases/tag/v0.4.2) Mode A, [ADS #63](https://github.com/Skyline-Gazer/ADS/issues/63); no new adapter or synchronization code.

## Immutable consumer adoption

- `.ads` submodule gitlink: ADS **v0.4.2 peeled COMMIT** `375fc71f977c40c2053140c34431cc60a6d42883`; annotated tag object is `44811ab1d7c3f9c11798b1f11efcfaac47113d52`. The tag object is not a gitlink target.
- Keep `.ads`, CodeGraph/RTK configuration/index/logs, private tokens, and local tool automation out of production `main`, unless explicitly allowed by the actual production boundary policy. Dev-only paths must be removed from the *release candidate tree* before the CNB dev→main release PR.
- The **reference-only** [Schema v1 config](ads-project.schema-v1.example.json) mirrors ADS's published example. It is not activated or provisioned. On actual cutover, materialize a reviewed `.ads-project.json` only in an approved development/trusted environment, and enforce production-boundary cleanup.

## Protected authority and evidence

CNB target repository URL, membership, actual protected dev/main, native CI source/merge status, Review-Fix-Recheck, branch permission and consumer artifact download: **UNVERIFIED for the actual ALNILAM CNB repository.** The prior [#96 draft Pilot](https://github.com/Skyline-Gazer/ALNILAM/pull/96), [#94](https://github.com/Skyline-Gazer/ALNILAM/issues/94), and isolated ADS Mode A fixture are reusable evidence but are not actual ALNILAM repository acceptance. Do not invent a CNB repo path from the fixture.

GitHub current-authority checkpoint before work: `dev` `1f382aa72052eedbe8a2809011e5a36a82f697d0`, `main` `07fac43cba0c3d303c930c098b6e2124b2c79e4a`; #97 merged into dev `95baf6bc04393f02bf89e2ea08e017c41da1fde3`. **Not migration freeze SHAs**; reread actual refs and tags immediately before authorized cutover.

## GitHub Workflow trigger side effects

| Workflow | Present trigger(s) before this PR | Mirror `main` push risk |
| --- | --- | --- |
| `.github/workflows/deploy.yml` | `push: main` plus `workflow_dispatch` | **PRODUCTION DEPLOY**; this PR removes the push trigger in the *dev candidate only* |
| `ads-devtools-boundary.yml` | `pull_request: main`, `push: main`, `workflow_dispatch` | Read-only production-boundary verification; continues to run |
| `ci.yml` | `push: dev/feat/fix/chore`, PR into dev/main, dispatch | No matching main push on current source |
| `ads-devtools-latest.yml` | `push: dev/feat/fix/chore`, PR dev, dispatch | No matching main push |
| `p0-evidence.yml` | PR dev and specific chore branch | No matching main push |

Also enumerate any newly added workflows/triggers before first mirror write. A **reviewed dev PR is not sufficient proof that the GitHub main production workflow is guarded**. Confirm `deploy.yml` is dispatch-only on **GitHub main** and verify that changes in the mirror source cannot reintroduce push-to-deploy; if the old GitHub main still contains the push trigger, do not write main without a separate safe approved mechanism.

## Precutover runbook (dry preparation only)

1. Finish P1 #97/#98/#99 and record final dev SHA, P1 gate evidence, independent required checks, exact ADS pin.
2. Identify and authenticate the **actual** CNB ALNILAM repository. Check repo owner/permissions, existing refs/PRs, branch rules, native runner/Review/bot identities, secrets scopes and quota; do not confuse the fixture repo with ALNILAM.
3. Audit GitHub authoritative `dev`, `main`, all tags, PRs and release history. Freeze only after explicit Owner authorization; capture SHA/OID snapshots and protections.
4. After explicit authorization, import full Git history to CNB, verify exact dev/main SHA and approved tags, protect dev/main, enable native Issue-URL-linked PR+CI+review. GitHub Issues and Project #17 remain the sole work tracker.
5. Prepare a **production-clean** CNB release candidate; remove dev-only paths and ensure release output/External Site digest immutable, rollback snapshot ready, and CNB source/merge/check evidence attached.
6. Before first real GitHub mirror write, verify GitHub main already has a dispatch-only Pages workflow (or another independently proven block). Verify mirror token allows only intended repo/ref writes and is absent from PR/NPC jobs.
7. Owner separately approves the exact CNB dev→main PR, tag object and peeled commit, release manifest with explicit nondefault approval flags, production deploy policy and mirror write.
8. Use ADS `scripts/sync_cnb_release.py` in trusted CNB release checkout, per [ADS docs](https://github.com/Skyline-Gazer/ADS/blob/v0.4.2/docs/cnb-sync.md); run **dry-run first**, then **--execute only after distinct approval**. Preserve source and destination main SHA, tag object OID and peeled commit readbacks. Sync *only* main and specifically approved v* tags, never dev/features or blanket tags.
9. Handle partial main/tag pushes by fail-closed + reread/retry as in ADS Mode A, without force push. Document any separate GitHub Release or Pages deployment authorization. Sync final evidence back to GitHub Issue/Project #17.
10. Rollback requires a new Owner decision: preserve GitHub original refs snapshot, quarantine or suspend mirror credentials, stop new CNB release writes, and restore only through an approved non-destructive plan. Never silently force-reset a protected remote.

## Current cutover blocker list

- Actual CNB ALNILAM repo URL/access/protections and consumer native CI/Review: not verified.
- P1 final baseline and dev SHA: pending P1 completion.
- GitHub main dispatch-only guard: **not yet in effect**; this PR only prepares the change for later release.
- CNB mirror token and source/target scope: not provisioned or verified.
- Release manifest, Owner release authorization, production deploy authorization: absent by design.
- #96 pilot required consumer gates: not automatically satisfied by ADS #63 generic acceptance.
- Project #17 field writes: require actual Projects v2 API/permissions readback; never claim board sync from Issue comments.

**No CNB repo migration, authority flip, GitHub main/tag writes, provider sync, production deployment or destructive rollback performed here.**
