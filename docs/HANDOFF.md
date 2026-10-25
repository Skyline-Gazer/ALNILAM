# ALNILAM — AI Agent Handoff

## Identity and baseline
- Core repository: https://github.com/Skyline-Gazer/ALNILAM (Apache-2.0).
- Project tracker: https://github.com/orgs/Skyline-Gazer/projects/17/
- Initial `main` SHA (before bootstrap): `282459adb69f903a0eea4ded35ebf619c7387a31`.
- Development baseline: `dev` created from initial `main`.
- Bootstrap branch: `chore/initial-platform-bootstrap` (PR into `dev`, pending review).
- ADS is a **private repository**; the public CI checkout intentionally omits recursive submodule cloning (no cross-repo credentials). Maintainers with ADS access can materialize it and verify the full rule set.\n- ADS release `v0.3` gitlink: `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`, located at `.ads`.
- Do **not** infer latest bootstrap branch HEAD, CI result or Project item status from this document. Query GitHub at start of task.

## Continuation: P0 two-version upgrade/rollback (2026-10-25)
- Verified remote state at session start: `dev` = `282459adb69f903a0eea4ded35ebf619c7387a31` (still bare "Initial commit"); all platform content on bootstrap branch `chore/initial-platform-bootstrap` @ `7cbcef0ae2b3a669fab987dd0f7cd57b7040c8bc`, PR #2 OPEN → `dev`, both checks SUCCESS (runs 40159993704, 40159989762).
- Task branch `feat/two-version-upgrade-rollback` created from bootstrap HEAD (NOT from bare `dev`; merging PR #2 first remains a maintainer review decision).
- Commit: `66019c9` — `scripts/upgrade-check.mjs` (two Core revisions vs one unchanged external Site: Site digest identical before/upgrade/rollback; output digests reported; old Core via `git worktree` only, never fetch/reset/checkout inside Site), CI step "Two-version Core upgrade / rollback against unchanged Site", 2 new contract tests (7 total).
- Local verification (macOS arm64, Node 22.23.4, pnpm 10.19.0): `pnpm install --frozen-lockfile` ✓, `pnpm test` 7/7 ✓, `pnpm check` 0 errors ✓, `pnpm build` ✓, `node scripts/upgrade-check.mjs --old ee97d1f175ac905dd3a7e2f79762415888b99b76` → `UPGRADE/ROLLBACK OK: Site unchanged, outputs byte-identical.` ✓; `--old 282459a...` → clean exit 1 (pre-platform `main` has no manifest; Site untouched, temp cleaned).
- Remote CI on PR #9: runs 40160914956 (pull_request) and 40160849539 (push) — **success**, including the new upgrade/rollback step.
- Old-Core default in CI is `ee97d1f1...` (last buildable bootstrap state), overridable via `ALNILAM_OLD_CORE_SHA` repository variable. `main` (282459a) cannot serve as "old Core" until it receives a buildable platform revision via an authorized release merge.
- Project #17 synchronized with authenticated Projects v2 (token scopes include `project`): 9 items added and read back — Issues #1 (In Progress), #3–#8 (Todo), PR #2 (Todo), PR #9 (In Progress). Board read-back confirmed 2026-10-25.
- RTK 1.0.1 and CodeGraph 1.0.1 available locally; CodeGraph index initialized task-scoped (`.codegraph/` gitignored). No indexes committed.
- Tooling note: Astro 7 requires Node ≥22.23.4; local default 22.23.2 fails `astro check` — use fnm/CI Node 24.
- Still unverified: browser E2E/visual fidelity, branch protection rulesets, ADS behavioral compliance (private repo not materialized locally), and PR #2/#9 review+merge decisions (maintainer authority).

## First remote CI acceptance (2026-10-25)
- Verified source SHA: `ee97d1f175ac905dd3a7e2f79762415888b99b76`.
- PR workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159850665 — **success**.
- Push workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159847633 — **success**.
- Actual checks: pnpm frozen dependency install, Node contract tests, Astro type/content check, demo static build, output assertions, independent external Site build, immutable source check, ADS gitlink pin.
- CI deliberately does not clone the private ADS repository. ADS behavioral compliance beyond root AGENTS.md is not evidenced by this build.
- This entry records a tested revision; review the current PR HEAD and fresh CI on every continuation.

## First task for next agent
1. Read `AGENTS.md`, `.ads/{AGENTS,STANDARD,SAFETY,QUALITY}.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`.
2. Open the current bootstrap PR and relevant P0 Issue. Confirm exact SHA and CI logs.
3. Resolve any bootstrap CI errors without modifying Site inputs or moving work to `main`.
4. **Validate the generated pnpm-lock.yaml with `pnpm install --frozen-lockfile` and CI.** Do not claim deterministic builds before this passes.
5. Validate packaged theme imports, Astro 7 integration, Svelte 5 island hydration, Tailwind 4 CSS scanning, Markdown/MDX rendering, and external Site assembly in real CI.
6. Confirm two-version Core upgrade / same-Site acceptance, reject symlinks and unsafe output paths.
7. Add browser-based smoke tests when a live build/Preview is available. Keep production deployment unmodified.
8. Reconcile GitHub Project #17 with real Issues and PRs if authorized Project v2 tooling is available. Otherwise mark board item/status unverified.

## Project constraints
- Only `dev` merges by reviewed PR (except separate authorized release PR to `main`). No direct write to `main`.
- Site is independently owned and read-only during build; `sites/demo` is a test fixture.
- Platform: Astro 7, Svelte 5, Tailwind CSS 4, Editorial theme, one Post per row (Fuwari).
- Avoid extracting separate npm-package release processes or implementing a custom deployment controller.
- ADS submodule never floats to latest without explicit review.
- CodeGraph and RTK latest tool availability should be checked, but their local indexes/configs must not be committed to production branch; no unapproved global installs.
- Default to GitHub Actions validation; don't request unneeded local system provisioning.
- All borrowed code, images, fonts or assets require license audit and THIRD_PARTY_NOTICES update.

## Validation commands
```bash
git submodule update --init --recursive  # authorized ADS access required
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out dist/external-site
```

## Expected CI output
`dist/site/index.html`, `dist/site/posts/hello-alnilam/index.html`, `dist/site/site-assets/orion.svg`.

## Explicit unverified matters
- Clean Astro check and static build passed on remote CI; interactive browser E2E, visual fidelity and performance have **not** been verified.
- Frozen dependency installation **passed** for tested SHA `ee97d1f`. Re-check current HEAD before release.
- Branch protection/ruleset enforcement is not enabled unless verifiably applied.
- Project #17 membership/status changes are not verified unless an authenticated Projects v2 read/write occurs.
- No preview or production deployment was performed during bootstrap.
- Full content migration compatibility across Core versions has not yet been exercised.
- Initialization PR must be reviewed, not auto-merged.

## Next implementation prompt
"Continue ALNILAM at the actual bootstrap PR HEAD, under the pinned ADS v0.3 rules and Project #17. First close P0 bootstrap verification gaps: immutable pnpm lock, reproducible CI, Astro/Svelte/Tailwind build, external Core/Site compose, Site non-mutation, safe path handling and two-version Core upgrade. Use an Issue-linked PR targeting dev. Do not touch main or production. Report actual SHA, CI links, verified vs unverified acceptance, and keep docs/HANDOFF.md updated."

