# CNB CLI and Git acceptance

Readback date: 2026-10-28. These commands were exercised against the public `KoolingMachine/ALNILAM` repository. This is an acceptance record, not permission to switch code authority or write GitHub release refs.

## Environment and authentication

- `@cnbcool/cnb-cli` **1.18.31** is installed. `cnb --version`, `cnb --help`, `cnb status`, and `cnb -s` were run. `cnb status` reported a logged-in session; `cnb -s` reported no Issue/PR event context in this local shell.
- The authenticated account is the repository Owner. The repository currently has one member, so it cannot supply an independent human reviewer.
- `origin` remains GitHub (`https://github.com/Skyline-Gazer/ALNILAM`); `cnb` is the explicit CNB HTTPS remote (`https://cnb.cool/KoolingMachine/ALNILAM`). No token is stored in a remote URL, file, or this record.
- Git HTTPS authentication used the CLI credential helper, with inherited helpers disabled:

  ```sh
  git -c credential.helper= \
      -c credential.helper='!cnb git-credential' \
      -c credential.interactive=never \
      ls-remote --heads cnb main dev
  ```

  This returned both refs. The same helper authenticated pushes of isolated test refs and their later deletion. No push to `main` or `dev` was attempted.

CNB documents `cnb login` / `cnb status` for local OAuth authentication and recommends least-scope tokens for API use. Pipeline `CNB_TOKEN` is platform-injected and has event-dependent permissions; it was not available for a successful PR build in this acceptance run. See the [CLI guide](https://docs.cnb.cool/en/develops/cnb-cli.html) and [access-token guidance](https://docs.cnb.cool/en/guide/access-token.html).

## Commands exercised

| Purpose | Command/result |
| --- | --- |
| Version and login | `cnb --version` → `1.18.31`; `cnb status` → logged in |
| Ref readback | The `git ls-remote` command above succeeded; full SHA/OID parity is in [CNB-WORKFLOW.md](CNB-WORKFLOW.md) |
| PR creation | `cnb pulls post-pull` created isolated CNB PRs #1 and #2 successfully |
| PR status/details | `cnb pulls get-pull --repo KoolingMachine/ALNILAM --number 2` returned base/head refs, SHAs, mergeable state, and statuses |
| Review readback | `cnb pulls list-pull-reviews --repo KoolingMachine/ALNILAM --number 2` returned zero reviews |
| PR close/cleanup | `cnb pulls patch-pull --repo KoolingMachine/ALNILAM --number 1 --state closed` and the same for #2 succeeded; neither PR was merged |
| NPC event history | `cnb npc-observability npc-observability-actions --repo KoolingMachine/ALNILAM --start-time 2026-10-27T00:00:00Z --page-size 100` returned three event records |
| Build history | `cnb build get-build-logs --repo KoolingMachine/ALNILAM --sn cnb-mp2-1k61965hn` returned the failed `pull_request.comment@npc` build record |
| Prepare-stage log | `cnb build get-build-stage --repo KoolingMachine/ALNILAM --sn cnb-mp2-1k61965hn --pipelineId cnb-mp2-1k61965hn-001 --stageId prepare` showed private `.ads` clone failures before any configured stage |

The CLI exposes PR operations as `cnb pulls post-pull`, `post-pull-comment`, `get-pull`, `list-pull-reviews`, `patch-pull`, and `merge-pull`. Help/schema was checked for create, comment, review, merge, build and settings commands. A merge command was **not** issued because no independent reviewer or accepted checks existed. Review submission and merge behavior therefore remain unaccepted.

## Permission boundary

CNB readback shows Owner access to the repository, but the current CLI token lacks `repo-manage:rw`. Creating a scratch branch-protection rule failed with HTTP 403 for that scope; changing pipeline auto-trigger settings requires the same missing scope. No scope was broadened and no settings were changed. The read-only protection/settings evidence and remaining enforcement tests are in [CNB-WORKFLOW.md](CNB-WORKFLOW.md).
