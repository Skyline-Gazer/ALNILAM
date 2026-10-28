# CNB dev settings change record

Read back on 2026-10-28 before the authorized Plan B change. This records the rollback point; no production `main`, mirror, tag or deployment setting is in scope.

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

Repository pipeline settings:

```json
{"auto_trigger":true,"auto_trigger_by_npc":true,"cron_auto_trigger":true,"forked_repo_auto_trigger":false}
```

Root organization build controls, read from the logged-in Owner settings page:

```json
{"event_auto_trigger":false,"cron_auto_trigger":false,"npc_auto_trigger":false,"untrusted_event_cross_repo":false}
```

The root event switch is organization-wide. At readback, three other repositories also had repository-level event auto-trigger enabled. Enabling the root switch therefore permits their configured events too; it does not grant cross-repository token access. Keep cron and untrusted-event cross-repository access disabled.

## Authorized target and restoration

- Plan B: disable the `dev` rule's “needs reviewer approval” option. Keep the PR requirement, status-check requirement, push prohibition, force-push/deletion prohibition, all Owner/admin exceptions off, auto-merge off, and NPC self-approval prohibition on. The platform API only accepts an approval count from 1–5, so the UI review-required toggle is the supported way to require zero human approvals while preserving the PR rule.
- Enable the root event auto-trigger switch only as authorized on 2026-10-28; keep root NPC, cron and cross-repository untrusted-event switches off. Repository `auto_trigger` remains enabled only as already configured.
- Restore the original `dev` rule in `KoolingMachine/ALNILAM → Settings → Branch protection → dev → Edit`: enable reviewer approval, set count `1`, ratio `50%`, and retain the other values in the original table. Verify the rule ID and read it back with `cnb git-settings get-branch-protection --repo KoolingMachine/ALNILAM --id 34c6fceca75e456f25e7e99531e2425c6c1de443`.
- Restore the root event switch in `KoolingMachine → Settings → Cloud Native Build Control → Allow event auto-trigger` to off. Do not change main's protection or any release/mirror/Pages setting.

No credential values are stored here. The CLI token lacks `repo-manage:rw`; settings changes are made through the already authenticated Owner web session and verified by readback.
