# Manual upstream watch

Issue [#137](https://github.com/Skyline-Gazer/ALNILAM/issues/137) owns the ongoing, non-blocking maintenance track. The initial implementation is **MANUAL_READY**. No GitHub Actions schedule or other recurring runner is active or authorized.

## Run

From an installed workspace checkout:

```sh
pnpm upstream:watch --report /tmp/alnilam-upstream-watch.json
```

The command reads the four public GitHub repositories in `sources.json`, the workspace manifests and `pnpm-lock.yaml`, npm registry metadata for direct locked dependencies, and `pnpm audit --json --registry=https://registry.npmjs.org`. It prints or writes a JSON evidence report and updates only the local tracker `state.json`. It does not fetch source code, change an upstream, write to a Site, create Issues/PRs, update the Roadmap, integrate code, or deploy. `GITHUB_TOKEN` or `GH_TOKEN` may be supplied for GitHub API rate capacity; credentials are never written to output or state. The explicit registry flag bypasses a mirror that does not expose the audit endpoint and changes no project configuration.

`--state <path>` selects an alternate tracker, useful for disposable/repeatability checks. `--registry <path>` selects another source registry. `--report <path>` writes an evidence report; without it the report is written to stdout. Failed upstream or npm metadata requests abort before tracker state is saved. An unavailable `pnpm audit` is reported as `unavailable`, never as a clear result or a gate failure.

## Coverage and interpretation

- Source snapshots include the default-branch head SHA, latest GitHub Release when present, the first ten tags returned by the GitHub API, and the ten most recently updated Issues (pull requests excluded). Issue coverage is deliberately bounded; it is not a complete issue history.
- Dependency candidates cover direct dependencies declared by every package manifest represented in the lockfile. `pnpm audit` covers the installed dependency graph. The lockfile SHA and each manifest-to-lock specifier mismatch are reported separately.
- `patch`, `minor`, and `major` classify the npm `latest` tag against the locked version; they are candidates, not upgrade recommendations. `staleRelease` means the latest stable version was published more than 365 days ago. It is a maintenance signal, not proof that a package is abandoned. Registry deprecation text is reported verbatim.
- A version change is not a compatibility pass. Monthly triage records exact package/source versions, compatibility and test evidence, value, and the proposed smallest PR. Security advisories are advisory risk triage, never a blanket coding gate.

`last_seen` advances only when the observed source/package fingerprint changes, so an unchanged run produces no duplicate recommendation and no tracker churn. `last_analyzed` advances only after a human records the exact reviewed range and outcome. `last_integrated` advances only after a reviewed PR is merged and its resulting ALNILAM SHA is verified. Keep rejected/skipped decisions with reasons in the corresponding `decisions` array; detection never marks work analyzed or integrated.

## Cadence plan

- **Weekly, manual:** run the inventory; review only changed fingerprints. No difference means record the report result and stop.
- **Monthly, manual:** classify only new source/package deltas as `bugfix`, `chore`, `performance`, `compatibility`, `feature`, `breaking`, or `license/asset`; record exact paths, affected ALNILAM paths, reproducible value, tests, and KEEP/ADAPT/PORT/DEFER/REJECT decision.
- **Triggered:** investigate a reproducible ALNILAM defect as a separate atomic fix and PR. Never auto-merge source. Breaking, UI, and feature changes remain Owner decisions.
- **Quarterly:** summarize drift, long-skipped fixes, and maintenance costs for the later #136 audit.

A schedule may be proposed only through separate Owner authorization for a least-privilege read-only runner. GitHub Actions `schedule` runs from default `main`; this manual foundation does not add or alter a workflow, `main`, ADS, release/tag, Site, or production configuration.
