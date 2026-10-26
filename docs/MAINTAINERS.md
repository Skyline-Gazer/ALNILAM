# Maintainer guide

Operational notes for ALNILAM maintainers. Public contributor docs live in the [README](README.md) and [Site onboarding](SITE_ONBOARDING.md).

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
7. Artifact budget check (wired into `pnpm build`): zero runtime scripts on posts pages, ≤2 islands/page, explicit img dimensions, provenance integrity
8. ADS gitlink pin (`3abf6025657a5d716476029cc8cbf5239543210b`, ADS v0.4.1)

## Known operational notes

- **Astro requires Node ≥22.23.4**; older Node versions fail `astro check` with a version banner, not a type error.
- **Stale `.astro`/Vite caches** can serve old island bundles across rebuilds — if a source fix "doesn't take", `rm -rf apps/web/.astro apps/web/dist` before re-theorizing (documented in HANDOFF).
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
