# ALNILAM — Agent Entry Point

This file is the binding repository-level operating entrypoint. On `dev`, ADS is pinned as a Git Submodule at `.ads` to peeled commit `375fc71f977c40c2053140c34431cc60a6d42883` (release v0.4.2; annotated tag object `44811ab1d7c3f9c11798b1f11efcfaac47113d52` resolves to this **commit**, never use the tag-object SHA as a gitlink). ADS is **private**. Only authorized maintainers may materialize it via `git submodule update --init --recursive --checkout .ads`. This public repository and GitHub Actions must not require secret cross-repo tokens. If `.ads` is unavailable, this root file remains the public operational baseline and ADS details are **not independently verified**. With ADS available, read `.ads/AGENTS.md`, `.ads/STANDARD.md`, `.ads/SAFETY.md`, `.ads/QUALITY.md`, and `.ads/profiles/astro-typescript.md` before structural changes. Do not assume ADS files are automatically discovered by the host agent.

## Product invariants
- Product: ALNILAM, generic open-source blogging platform (Apache-2.0).
- **Core owns program; Site owns content, configuration and assets.** No production operation may mutate Site.
- Core is a pnpm Monorepo; `sites/demo` is a fixture, not a user's real Site.
- Astro 7 + Svelte 5 + Tailwind CSS 4; SSR/backend/database are not baseline dependencies.
- **Released v0.1.3** uses the original Editorial UI. P1 implementation/evidence baseline is `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb`; Owner accepted P1 and closed Issue #37 on 2026-10-28. P2 Issue #51 is planning-ready; P2 code has not started. The current authorized work finalizes Agent-governed CNB PRs and isolated GitHub PR Mirror acceptance. Canceled Gatekeeper, fixed Reviewer and CNB Auto Merge requirements are not phase gates. Read current docs/HANDOFF.md and actual Issue/Project state before changing development authority or starting a P2 slice. Preserve the repo/history, Core/Site boundary, CI, assets and Editorial rollback; the Fuwari-style single-row post list remains the target.
- Reference project code must not be copied without auditing source licenses, notices, and assets; record reused code in THIRD_PARTY_NOTICES.md.
- Core/Site external composition must remain functional independent of the demo profile.

## Git and delivery
- Default work target is `dev`; create `feat/*`, `fix/*`, or `chore/*` branches from `dev`.
- All work lands via Issue-linked PR; never commit direct to `main`. `main` is release only.
- Existing ALNILAM versions through v0.1.3 are released. P1 development is authorized through Issue-linked PRs into `dev`; it does not imply permission to merge to `main`, create a release tag or deploy production.
- Project tracking target: https://github.com/orgs/Skyline-Gazer/projects/17/. Verify actual Project state before claiming status updates; do not substitute Issues for board membership.
- Prefer GitHub Actions and ephemeral Preview for integration evidence; no new paid or persistent infrastructure.
- ADS v0.4.2 **consumer policy** requires CodeGraph and **official full RTK**, not `rtk-oss`. For every development session/worktree, preflight version/channel/initialization/host MCP or hook integration and actual operation; record proof separately from whether a binary is present. Use the latest published stable upstream distribution; CodeGraph immutable `SOURCE_FALLBACK` is allowed only when the official stable package/release is absent and after explicit authorization and SHA/licensing verification. Never claim a source fallback is latest stable. ALNILAM's authorized CodeGraph pin is source SHA `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata 1.1.1, MIT); the `@colbymchenry/codegraph` package is **not** the ADS official publisher.
- Development-only tool manifests, host hooks and CodeGraph/RTK configuration may live on `dev`/task branches, **never in production `main`**. Generated indexes/caches, binaries, machine-local absolute paths and secrets may not be committed anywhere. Adopt the upstream production-boundary guard + negative fixtures; generic guard may remain in production. Full RTK output compression must preserve command failures and raw diagnostic access.
- Never install developer tools, change global host settings or grant broad repository access without explicit owner approval. Public CI must not check out private ADS recursively. See [ADS v0.4.2 consumer toolchain](https://github.com/Skyline-Gazer/ADS/blob/v0.4.2/docs/consumer-dev-toolchain.md) and [ADS v0.4.2 release](https://github.com/Skyline-Gazer/ADS/releases/tag/v0.4.2).

## CNB Agent-governed PR workflow — Owner decision 2026-10-30

- The Agent creates an Issue-linked PR and actively performs a normal Merge Commit only after complete current-version CI and actual CodeBuddy code review. Do not push directly to protected branches, force-push, use a bypass, or enable Auto Merge.
- Before merging, re-fetch PR source and target SHAs. Verify required CI exists and succeeded, bind the actual tested merge/tree and retained receipts to the candidate, and verify CodeBuddy fetched the complete diff and completed review for the same source SHA. A green plugin exit or a platform Mergeable label is insufficient.
- Missing, invalid, unfinished, timed-out, failed or stale CI/review blocks Agent merge. Any source/target change invalidates the decision and requires fresh applicable checks. Resolve Critical/High findings, or record an explicit, auditable false-positive disposition before reconsideration.
- For native review use the official system CodeBuddy in read/comment mode; no independent Gatekeeper or separately provisioned approval identity is required. The pinned ADS current-SHA review validator may be reused in the trusted maintainer environment; do not modify ADS v0.4.2 or expose private ADS credentials to public jobs.
- Serialize Agent writes. Immediately before merge re-read live refs and evidence; after merge verify the target commit, source ancestry and approved Git tree. Record PR URL, source/target/tested/merged SHAs, CI runs and native review comment/run in the merge decision.
- These are Agent operating requirements, not CNB-enforced required checks. CNB can still permit zero-status PR merges and its merge API has no expected-head parameter; record that residual risk and the non-atomic recheck/merge window. Independent Gatekeeper, fixed required Reviewer, platform zero-status repair and CNB Auto Merge are canceled acceptance prerequisites.
- The private ADS gitlink remains pinned. Default recursive clones skip ADS via submodule update=none; only authorized maintainers may explicitly use the checkout command above. Production main, first production Mirror, formal tags/releases and deployments remain separately authorized operations.

## Commands
```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out /absolute/path/to/output
```
The pnpm-lock.yaml is generated by GitHub Actions and version-controlled. Enforce --frozen-lockfile in CI and local tests.

## Handoff
Read `docs/HANDOFF.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, the assigned Issue and the relevant P1 slice record. Never infer implemented features from planned roadmap entries. For each Shirone slice, produce a before/after Keep/Adapt/Wrap/Replace/Retire matrix for affected ALNILAM source, tests, CI and docs. End each task with exact commit SHA, CI run URL/results, PR, verified functionality, and unresolved blockers.

@RTK.md
