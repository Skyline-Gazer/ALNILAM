# ALNILAM — AI Agent Handoff

## Identity and baseline
- Core repository: https://github.com/Skyline-Gazer/ALNILAM (Apache-2.0).
- Project tracker: https://github.com/orgs/Skyline-Gazer/projects/17/
- Initial `main` SHA (before bootstrap): `282459adb69f903a0eea4ded35ebf619c7387a31`.
- Development baseline: `dev` created from initial `main`.
- Bootstrap branch: `chore/initial-platform-bootstrap` (PR into `dev`, pending review).
- ADS release `v0.3` gitlink: `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`, located at `.ads`.
- Do **not** infer latest bootstrap branch HEAD, CI result or Project item status from this document. Query GitHub at start of task.

## First task for next agent
1. Read `AGENTS.md`, `.ads/{AGENTS,STANDARD,SAFETY,QUALITY}.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`.
2. Open the current bootstrap PR and relevant P0 Issue. Confirm exact SHA and CI logs.
3. Resolve any bootstrap CI errors without modifying Site inputs or moving work to `main`.
4. **Generate and commit a real `pnpm-lock.yaml`; change CI to `pnpm install --frozen-lockfile`.** Do not claim deterministic builds before this passes.
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
git submodule update --init --recursive
corepack enable
pnpm install --no-frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out dist/external-site
```

## Expected CI output
`dist/site/index.html`, `dist/site/posts/hello-alnilam/index.html`, `dist/site/site-assets/orion.svg`.

## Explicit unverified matters
- A complete clean Astro build and Svelte/Tailwind E2E must be confirmed from remote CI; this authoring environment cannot access npm registry.
- A frozen lockfile is not yet part of bootstrap.
- Branch protection/ruleset enforcement is not enabled unless verifiably applied.
- Project #17 membership/status changes are not verified unless an authenticated Projects v2 read/write occurs.
- No preview or production deployment was performed during bootstrap.
- Full content migration compatibility across Core versions has not yet been exercised.
- Initialization PR must be reviewed, not auto-merged.

## Next implementation prompt
"Continue ALNILAM at the actual bootstrap PR HEAD, under the pinned ADS v0.3 rules and Project #17. First close P0 bootstrap verification gaps: immutable pnpm lock, reproducible CI, Astro/Svelte/Tailwind build, external Core/Site compose, Site non-mutation, safe path handling and two-version Core upgrade. Use an Issue-linked PR targeting dev. Do not touch main or production. Report actual SHA, CI links, verified vs unverified acceptance, and keep docs/HANDOFF.md updated."

