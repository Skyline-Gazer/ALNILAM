# CNB developer workflow acceptance

Readback date: 2026-10-28. **The CNB developer workflow is not accepted.** CNB is a verified public repository with matching imported refs, but its event CI is disabled and the single-member repository cannot meet independent approval.

## Ref parity

The GitHub (`origin`) and CNB (`cnb`) remote reads matched:

| Ref | GitHub SHA/OID | CNB SHA/OID |
| --- | --- | --- |
| `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` | `285a62cecd87f8f20276c7cc989537a391f488c8` |
| `dev` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` | `78d63d9bf9d78b1e4f64640fedfc7c079256ef4f` |
| `v0.1.0` annotated tag object | `4452ed2013237e620e2a0cff64b31e31e6292fe6` | same |
| `v0.1.0` peeled commit | `52a5d13f98c981fdf5aaed1ae217c85d65c0a345` | same |
| `v0.1.1` annotated tag object | `d7d689f70548d1c8cdc8d8a5068e7937f02559aa` | same |
| `v0.1.1` peeled commit | `0591e4b4e9680dca2e46bec4b44ca86674ee0b4e` | same |
| `v0.1.2` annotated tag object | `ed97dd7ca225fd3d442e11f60d038becec4db2bd` | same |
| `v0.1.2` peeled commit | `b6fac6ac2442f28454c2694a59f5b55533d325fc` | same |
| `v0.1.3` annotated tag object | `283230a566a7186bfde27ab6255a185baaf8a122` | same |
| `v0.1.3` peeled commit | `07fac43cba0c3d303c930c098b6e2124b2c79e4a` | same |

The existing checkout's local `main` is stale at `282459adb69f903a0eea4ded35ebf619c7387a31`; do not use it for a mirror run. The `.ads` gitlink on `dev` is the v0.4.2 peeled commit `375fc71f977c40c2053140c34431cc60a6d42883` (annotated tag object `44811ab1d7c3f9c11798b1f11efcfaac47113d52` is not the gitlink).

## CNB protection and trigger readback

CNB protection readback for both `main` and `dev` reports: PR required; one approval required; status checks required; direct push, force push and deletion disabled; no Owner bypass; no auto-merge; and approval by an author's own NPC forbidden. Rule IDs are `b28b7af69320201d1cf206ebf28373980add1451` (`main`) and `34c6fceca75e456f25e7e99531e2425c6c1de443` (`dev`). These are configuration readbacks, not negative tests of enforcement. No protected-ref push or merge attempt was made.

The repository currently has only one member (Owner). There is no independent human who can approve a test PR. The status-check flag is enabled, but no required check names or successful CNB PR check run were observed.

CNB pipeline settings read back as:

```text
auto_trigger: false
auto_trigger_by_npc: true
cron_auto_trigger: true
forked_repo_auto_trigger: false
```

Consequently, PR event jobs did not run. NPC event triggering remained enabled. The CLI token could not change these settings because it lacks `repo-manage:rw`; no trigger was enabled during this task.

## Isolated PR lifecycle

- CNB PR #1 ([link](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/1)) was created against an isolated target branch and read back as conflicted. It was closed without merge.
- CNB PR #2 ([link](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/2)) was created against the corrected isolated target, read back as mergeable at source `6287c39a78940c27a58ef55fff9427d39693d82b`, and closed without merge.
- PR details/status queries worked. PR #2 had no submitted reviews. No independent approval, required check pass, protected merge, or merge SHA was produced.
- All three temporary CNB branches and their clean local probe worktrees were removed. No production ref changed.

## Acceptance matrix

| Check | Result | Evidence boundary |
| --- | --- | --- |
| CLI authentication and HTTPS Git | **PASS** | Logged-in CLI; explicit `cnb` helper authenticated `ls-remote`, test pushes and cleanup |
| CNB/GitHub `main`, `dev`, historical tag parity | **PASS** | Exact SHA and annotated-tag OID/peeled-commit table above |
| CNB PR create/read/close | **PASS** | Isolated PRs #1/#2; neither merged |
| CNB PR event CI auto-trigger | **FAIL / NOT RUN** | `auto_trigger=false`; no PR event build could start |
| Required-check enforcement | **UNVERIFIED** | Config flag is on, but check identity/presence and denial behavior were not exercised |
| Independent human review | **BLOCKED** | One repository member; PR #2 had zero reviews |
| Protected direct-push/merge denial | **NOT TESTED** | No safe scratch protection could be created; no risky protected-ref write attempted |
| Review rejection / new-SHA invalidation | **NOT TESTED** | No native trusted Review build/status existed |
| CNB Playwright at 390px / 1440px with retained screenshots/traces | **NOT RUN** | PR-event auto-trigger was off; GitHub browser runs are separate evidence |
| CNB Lighthouse, CLS positive/negative, coverage and security/SCA | **NOT RUN** | No consumer runner reached these jobs |
| Native critical finding / malformed output / missing or timed-out Review blocks merge | **NOT TESTED** | Parser negatives are local unit tests only; no required Review status existed |
| New push creates a fresh current-SHA check | **NOT TESTED** | No PR event CI was enabled |
| No independent approval blocks merge | **BLOCKED / NOT TESTED** | Only one repository member; merge was not attempted |
| Direct push or merge without permission is rejected | **NOT TESTED** | No safe isolated protection rule was available; protected production refs were not targeted |
| Parallel-agent conflict recovery | **PARTIAL** | Separate scratch refs avoided local collisions; no concurrent CNB merge was attempted |
| Auto-merge disabled | **PASS (readback only)** | Both rules showed auto-merge disabled; no behavior test |

The event and actor trust boundary is described in [CNB-REVIEW.md](CNB-REVIEW.md). The synced-code and Project #17 state is in [CUTOVER-READINESS.md](CUTOVER-READINESS.md).
