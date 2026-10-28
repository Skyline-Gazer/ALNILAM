# CNB to GitHub mirror runbook

Readback date: 2026-10-29. This retains ADS v0.4.2 Mode A; it does not add a synchronizer or authorize a write.

## Current direction and state

- Intended direction remains one-way **CNB → GitHub** for approved `main` and exact release tags. GitHub Issues and Project #17 remain the task tracker. No CNB feature or `dev` branch is mirrored by policy.
- Current GitHub and CNB `main` already match at `285a62cecd87f8f20276c7cc989537a391f488c8`; `dev` matches at `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f`. Tags `v0.1.0`–`v0.1.3` have matching annotated-tag object IDs and peeled commits; details are in [CNB-WORKFLOW.md](CNB-WORKFLOW.md).
- The Pages Guard is effective on GitHub `main`: PR #104 merged at `285a62…`, and `.github/workflows/deploy.yml` is `workflow_dispatch` only. No Pages deployment or dispatch was run.
- The GitHub `main` ruleset requires PR review and strict checks and has no bypass actor. ADS Mode A's synchronizer pushes directly to `refs/heads/main` when that ref changes; **inference from the ruleset readback:** a divergent direct mirror push conflicts with this policy. No such push was attempted. Do not add a bypass or change the ruleset here.
- Repository/environment secret readbacks did not reveal a mirror credential; organization-secret inventory was denied without broader organization scope. CNB-side credentials and external App keys remain unknown. No token scope was broadened.

## First-sync manifest and dry-run result

[`first-sync-manifest.json`](first-sync-manifest.json) is deliberately unapproved. It records exact current `main` and the existing `v0.1.3` peeled target while keeping both approval booleans false. The `main_sha` is `285a62cecd87f8f20276c7cc989537a391f488c8`; the v0.1.3 tag target is `07fac43cba0c3d303c930c098b6e2124b2c79e4a`.

The pinned synchronizer was invoked in its default no-`--execute` mode:

```sh
python3 .ads/scripts/sync_cnb_release.py \
  --manifest docs/cnb/first-sync-manifest.json \
  --source-remote cnb \
  --github-remote origin
```

Result: `SYNC_BLOCKED: missing explicit release and GitHub push-effect approvals` (exit 1). The same command was re-run on 2026-10-29 with the current pinned script and manifest and returned the same result. This is the intended fail-closed result; it is **not** a `DRY_RUN_PASS`. The script stopped at manifest validation before ref analysis or fetch. Remote SHA/OID parity was separately read back without writes. The current checkout has stale local `refs/heads/main` at `282459adb69f903a0eea4ded35ebf619c7387a31` while `origin/main` and `cnb/main` are `285a62cecd87f8f20276c7cc989537a391f488c8`, so it is not a valid place to run the synchronizer against the manifest.

## GitHub App feasibility (read-only)

GitHub documents a viable least-scope mechanism for HTTP Git authentication: a GitHub App installation token can authenticate Git access when the App has repository `Contents` permission. The installation can be restricted to only `Skyline-Gazer/ALNILAM`, and the one-hour installation token can be narrowed to that repository and permission. GitHub repository rulesets also support a GitHub App as a bypass actor. A direct ADS Mode A push would require that actor's `Always allow` bypass; `For pull requests only` would not permit the direct ref update. See [GitHub's installation authentication guide](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [App permission guidance](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), and [repository ruleset bypass instructions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

This establishes **documented platform feasibility only**, not ALNILAM/ADS compatibility. The current ruleset readback shows `bypass_actors: null` for both `main` and `dev`. No App was created or installed; no bypass actor, credential, `main` protection, or repository ref was changed. `.ads` is materialized at the pinned v0.4.2 commit `375fc71f977c40c2053140c34431cc60a6d42883`, and the pinned synchronizer source is available for inspection; no GitHub App installation-token handoff or protected write was attempted. A dedicated App's private key would be a long-lived credential and must stay in a protected trusted release environment; do not expose it to PR/NPC builds.

Minimum remaining verification before any first mirror authorization: Owner creates or selects a private App with only repository `Contents: write`, installs it only on ALNILAM, and explicitly adds only that App as an `Always allow` actor to a disposable test ruleset. Run isolated allow/deny Git ref-update probes on a scratch branch, then remove the rule and refs and verify the `main` ruleset remains unchanged. Verify ADS Mode A can obtain/use a short-lived installation token before considering the real main ruleset. The first actual mirror write still requires separate explicit Owner authorization.

## Future authorization and exact blockers

Before any first mirror write, an Owner must separately authorize the exact release/main SHA, tag object and peeled target, GitHub push effects, mirror credential scope and handling of the protected-main rule. A technical read-only dry-run must pass in a clean checkout whose local `main` is exact. A later `--execute` must be separately authorized and run only from the trusted ADS v0.4.2 script. Do not use `--execute`, alter historical tags, trigger production Pages, or treat an equal-ref no-op as proof that future protected writes can succeed.

The immutable ADS pin is `.ads` peeled commit `375fc71f977c40c2053140c34431cc60a6d42883`; tag-object `44811ab1d7c3f9c11798b1f11efcfaac47113d52` is not a gitlink. Preserve the release-candidate production-boundary audit and rollback snapshot required by ADS.
