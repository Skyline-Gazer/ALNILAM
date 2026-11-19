# Maintainer guide

Operational notes for ALNILAM maintainers. Public contributor guidance is in [CONTRIBUTING](../CONTRIBUTING.md); Site authors use [Site onboarding](SITE_ONBOARDING.md).

## Branch model

- `main` — release-only. Protected by ruleset `alnilam-main` (ID 25809753): PR-only, required `verify` check (strict), no force pushes, no deletion.
- `dev` — integration branch. Protected by ruleset `alnilam-dev` (ID 25809723): identical policy.
- Task branches: `feat/*`, `fix/*`, `chore/*` from `dev`; Issue-linked PRs only.

## Release procedure (vX.Y.Z)

1. Confirm `dev` CI green at the intended SHA (workflow `CI`, job `verify`).
2. Update `CHANGELOG.md` (move Unreleased → new version, date, compare links) in a small PR to `dev`.
3. Open release PR `dev` → `main`. Title: `release: vX.Y.Z`. Body links the changelog section and the green CI run.
4. Owner-authorized merge. CI must pass on `main` post-merge.
5. Create the annotated tag on `main`'s release merge commit:
   ```bash
   git tag -a vX.Y.Z -m "ALNILAM vX.Y.Z" <main-merge-sha>
   git push origin vX.Y.Z
   ```
6. Set the repository variable `ALNILAM_OLD_CORE_SHA` to the previous release's tag SHA — the CI upgrade/rollback step then always tests real release-to-release upgrades.

Never tag `dev`. Never tag a commit whose `verify` check has not passed on `main`.

## CI acceptance inventory (workflow: CI, job: verify)

1. `pnpm install --frozen-lockfile` (Node 24, pnpm 10.19)
2. Contract tests (`pnpm test`): config normalization, schema v1 fail-closed, Site digest stability, output-overlap rejection, symlink rejection, provenance binding, hashTree addressing, upgrade-check argument handling.
3. `astro check`
4. Demo compose + output assertions (`index.html`, first post, `site-assets/orion.svg`)
5. External-Site composition + isolation (byte-compare of the Site before/after)
6. Two-version Core upgrade/rollback against an unchanged external Site
7. Artifact budget check (wired into `pnpm build`): external script-tag scan on posts pages, ≤2 islands/page, explicit img dimensions and provenance shape. Inline hydration and canonical correctness are not covered; see the [P0 report](p0/P0-ACCEPTANCE.md).
8. [ADS gitlink pin check](../scripts/check-ads-pin.sh): compares the current commit's `.ads` gitlink with the exact SHA in `ads-pin.txt`; it does not read root `AGENTS.md`. A missing gitlink is accepted only when the target is `main`. Public CI does not fetch the private submodule.
9. Markdown link checks, documented command and full Site-config examples, rejection of active CNB provider claims, README/Vercel branch consistency with current Handoff evidence, release-version and target-status checks, unique ADR identifiers, production-boundary negative fixtures and a two-round offline release DAG. The candidate-tree guard runs inside required `verify`; tool-specific `.gitignore` entries remain development-only, with an exact exported-candidate positive check. Built artifacts are also scanned in verify.

## Known operational notes

- **Astro requires Node ≥22.23.4**; older Node versions fail `astro check` with a version banner, not a type error.
- **Generated Astro state:** Compose serializes access to shared `apps/web/.astro` scratch state. If output appears stale, rerun into a fresh temporary output directory and compare provenance. `--clean-cache` only removes the verified managed cache; do not recursively remove `apps/web/.astro` or `apps/web/dist` as a troubleshooting step.
- **Pagefind index nondeterminism**: `pagefind-entry.json` language key order follows worker completion; compose sorts it. Repeat builds are byte-identical with `SOURCE_DATE_EPOCH` pinned.
- **`pagefind-entry.json` must not be Svelte-$state wrapped** in islands — the module namespace breaks under reactive proxies (documented in `packages/ui/src/Search.svelte`).
- The `.ads` submodule is private; CI checks only its gitlink SHA. Do not add credential-based submodule clones.
- Deterministic rebuilds: set `SOURCE_DATE_EPOCH` (compose embeds it in provenance `generatedAt`).

## Verification commands

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build                                    # includes artifact budgets
node scripts/upgrade-check.mjs --old <sha>    # two-version acceptance
node scripts/artifact-check.mjs dist/site     # standalone budget re-check
```

## Learning Loop (Pilot)

The project-local [ADS Learning Loop Pilot](https://github.com/Skyline-Gazer/ALNILAM/issues/148) records concrete lessons from naturally completed development deliveries. Use it only when an Issue #148 trigger is evidenced; ordinary feature reviews, one-off small fixes, speculation and transient failures do not qualify by themselves. A one-off fix that meets a trigger, such as correcting a false PASS, can qualify.

Write a triggered Lesson in the original delivery Issue or PR thread, then add a one-line evidence link and update the observation summary in #148. Do not create a separate ledger or record a Lesson when no trigger occurred.

Use these five fields:

- **Failure:** observed failure, conditions and exact affected delivery.
- **Root cause:** reproduced mechanism and how it was verified; describe the mechanism, not blame.
- **Prevention:** smallest actionable regression, test, check, documentation or process change.
- **Evidence:** Issue, PR, commit SHA, CI run, deployment ID or test-case links.
- **Scope:** boundaries, exceptions and claims that remain unverified.

After the Pilot PR merges, observe the next 3–5 naturally completed, independent deliveries. Count each delivery once. If none of its work meets a trigger, record “no qualifying trigger”; do not manufacture observations. At the end, report evidence and limitations in #148, then ask the Owner to retain, adjust or stop the Pilot.

Historical examples in #148 are candidate evidence only. The Pilot observation count starts at **0** and excludes all pre-Pilot deliveries. This is documentation only: no mandatory per-PR report, CI check, bot, schedule, merge gate or ADS profile is added.
