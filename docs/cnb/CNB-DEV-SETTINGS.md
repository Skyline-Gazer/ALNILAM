# CNB dev settings change record

Rollback baseline captured 2026-10-28; authorized Plan B and organization trigger scope were read back again on 2026-10-29. No production `main`, mirror, tag or deployment setting is in scope.

## Original values

CNB repository `KoolingMachine/ALNILAM`, `dev` rule `34c6fceca75e456f25e7e99531e2425c6c1de443`:

| Setting | Original value |
| --- | --- |
| Push through PR required | `true` |
| PR review/approval required | `true` |
| Minimum approvals | `1` |
| Approval ratio | `50%` |
| Status checks required | `true` (CNB UI says this applies when checks exist) |
| Owner approval required | `false` |
| Owner/admin review or status bypass | `false` |
| Direct push / force push / branch deletion | disabled |
| Auto-merge | disabled |
| Approve PR created by own NPC | forbidden |

## Current dev rule after Plan B

Readback from `cnb git-settings get-branch-protection` after the Owner-authorized change:

```text
required_must_push_via_pull_request=true
required_pull_request_reviews=false
required_approved_review_count=1   # retained API value; approval toggle is off
required_approved_review_ratio=50   # retained API value; approval toggle is off
required_master_approve=false
required_status_checks=true
allow_master_manual_merge=false
allow_pushes=false
allow_force_pushes=false
allow_deletions=false
required_must_auto_merge=false
forbid_approve_pull_created_by_own_npc=true
```

Rule ID remains `34c6fceca75e456f25e7e99531e2425c6c1de443`. This is a settings readback, not proof that missing or failed named checks deny a merge.

Repository pipeline settings:

```json
{"auto_trigger":true,"auto_trigger_by_npc":true,"cron_auto_trigger":true,"forked_repo_auto_trigger":false}
```

Root organization build controls, re-read from the logged-in Owner settings page after a full reload:

```json
{"event_auto_trigger":true,"cron_auto_trigger":true,"npc_auto_trigger":true,"untrusted_event_cross_repo":false,"scheduled_task_cross_repo":false}
```

The root event, cron and NPC switches are organization-wide. The 2026-10-29 refreshed Owner settings page showed all three on. Repository event/cron/NPC switches were on for `ALNILAM`, `ads-cnb-acceptance-20261027`, `AiringCal`, and `airingcal-control`; `code-import` event and cron triggers were off. The `airingcal-secrets` settings page was inaccessible and its repo-level state is unverified. The successful native ALNILAM PR build confirms event triggering behavior. The Owner selected organization-level event scope; the four configured repository event triggers were already enabled, so the Agent changed no root or repository trigger setting. Untrusted-event cross-repository access and scheduled-task cross-repository access remain off. Root event/NPC triggers do not themselves grant cross-repository token access.

## Authorized target and restoration

- Plan B: disable the `dev` rule's “needs reviewer approval” option. Keep the PR requirement, status-check requirement, push prohibition, force-push/deletion prohibition, all Owner/admin exceptions off, auto-merge off, and NPC self-approval prohibition on. The platform API only accepts an approval count from 1–5, so the UI review-required toggle is the supported way to require zero human approvals while preserving the PR rule.
- The Owner authorized organization-level trigger scope, which unlocks configured events in four repositories. Those four event triggers were already enabled; the refreshed page already showed root event/cron/NPC on, so no root setting was changed. Untrusted-event and scheduled-task cross-repository access remain off.
- Restore the original `dev` rule in `KoolingMachine/ALNILAM → Settings → Branch protection → dev → Edit`: enable reviewer approval, set count `1`, ratio `50%`, and retain the other values in the original table. Verify the rule ID and read it back with `cnb git-settings get-branch-protection --repo KoolingMachine/ALNILAM --id 34c6fceca75e456f25e7e99531e2425c6c1de443`.
- No root event-switch rollback is needed: it was already on before this task and the Agent did not change it. Preserve the captured root organization values. Do not change main's protection or any release/mirror/Pages setting.

No credential values are stored here. The CLI token lacks `repo-manage:rw`; the `dev` protection change was made through the already authenticated Owner web session and verified by readback.

## Disposable behavior probe (2026-10-29)

To test enforcement without touching `dev` or `main`, a temporary branch rule cloned the current Plan B values for `codex/cnb-protection-missing-check-20261029`. CNB PR #6 had no status entries and read back as `blocked_on=unblocked`, `mergeable_state=mergeable`; its `check-status` returned success with no entries. After an intentionally failing status (`cnb-if2-1k61pq4p0`), the PR became `blocked_on=status_check`, and a merge attempt returned HTTP 409. Direct push to the scratch protected target was rejected.

This confirms that `required_status_checks=true` means “checks must pass if present,” not “a named trusted check must exist.” Therefore `CNB_BRANCH_PROTECTION` is **FAIL / not accepted for strict required-check enforcement**, despite the setting readback and failed-check denial. The actual `dev` rule has not been behavior-tested. CNB’s [official trigger documentation](https://docs.cnb.cool/zh/build/trigger-rule.html) describes status checks as conditional on checks existing. Temporary rule `97162af2214c8d27a996700157d1a327b9d41c05` was deleted; scratch PR #6 was closed unmerged and its source/target refs were removed.
