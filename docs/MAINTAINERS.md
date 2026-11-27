# Maintainer guide

Operational notes for ALNILAM maintainers. Public contributor guidance is in [CONTRIBUTING](../CONTRIBUTING.md); Site authors use [Site onboarding](SITE_ONBOARDING.md).

## Branch model

- `main` — release-only. Protected by ruleset `alnilam-main` (ID 25809753): PR-only, required `verify` check (strict), no force pushes, no deletion.
- `dev` — integration branch. Protected by ruleset `alnilam-dev` (ID 25809723): identical policy.
- Task branches: `feat/*`, `fix/*`, `chore/*` from `dev`; Issue-linked PRs only.

## Release records and authority

The annotated tag and matching [GitHub Release](https://github.com/Skyline-Gazer/ALNILAM/releases) identify the published version and assets. The [changelog](../CHANGELOG.md) records changes and migrations; PR history, Issue threads and CI runs record refs, checks and deployments. Release and Production authorization come from the linked Owner decision.

## Release procedure (vX.Y.Z)

1. Confirm `dev` Verify and the current acceptance requirements pass at the intended SHA. Record any Owner-approved changes to the acceptance contract in the release PR.
2. Open the release PR from `dev` to `main` with title `release: vX.Y.Z`. Include the full change and migration notes since the last tag. Prepare the README release version and numbered changelog in a small PR to `dev` once the release is approved.
3. Check the release PR's required Verify, resolve applicable review findings, and verify the deployment boundary before merging. GitHub Pages requires a separate manual workflow dispatch. Confirm the Vercel Git configuration will prevent automatic publication from this merge. Use a normal merge commit, then confirm Verify passes on the resulting `main` SHA.
4. Build and verify the release assets from that exact `main` commit using the procedure below. Create an annotated tag and push it to GitHub:
   ```bash
   git tag -a "$tag" -m "ALNILAM $tag" "$release_sha"
   git push https://github.com/Skyline-Gazer/ALNILAM.git "refs/tags/$tag:refs/tags/$tag"
   ```
5. Confirm the exact tag's Release status workflow passes. Create the GitHub Release using `gh release create --verify-tag`, the reviewed notes, verified archive, file manifest and `SHA256SUMS`. Verify the public entry points at the annotated tag and the downloaded assets match `SHA256SUMS`.
6. Keep `ALNILAM_OLD_CORE_SHA` pointed at the previous released Core for upgrade/rollback evidence.

Never tag `dev`. Never tag a commit whose `verify` check has not passed on `main`.

### Demo release assets

Use a fresh Linux clone at the approved merge commit with GNU tar. Use the same Node and pnpm versions for both builds and record them in the release notes. The example packages the bundled root-hosted Demo for inspection at a fixed sample URL. Build for the actual host URL before publishing a Site.
The `tar` must be GNU tar (`tar --version` reports `tar (GNU tar)`); the BSD/libarchive tar shipped by macOS does not support the reproducibility flags above.

```bash
set -euo pipefail
export LC_ALL=C TZ=UTC
release_sha=$(git rev-parse HEAD)
export ALNILAM_CORE_REV="$release_sha" ALNILAM_SITE_REF="$release_sha"
export ALNILAM_SITE_URL=https://example.com/
export SOURCE_DATE_EPOCH=$(git show -s --format=%ct "$release_sha")
tag=vX.Y.Z  # replace with the approved release version
pnpm install --frozen-lockfile
scratch=$(mktemp -d)
stem="alnilam-$tag-demo-root"
for run in 1 2; do
  mkdir "$scratch/$run"
  out="$scratch/$run/site"
  ALNILAM_CACHE_DIR="$scratch/$run/cache" \
    node scripts/compose.mjs --site sites/demo --out "$out"
  node scripts/artifact-check.mjs "$out"
  node scripts/seo-check.mjs "$out"
  (cd "$out" && find . -type f -print0 | sort -z | xargs -0 sha256sum) \
    > "$scratch/$run/$stem.files.sha256"
  tar --sort=name --format=ustar --mtime="@$SOURCE_DATE_EPOCH" \
    --owner=0 --group=0 --numeric-owner --mode='u+rwX,go+rX,go-w' \
    -C "$out" -cf - . | gzip -n > "$scratch/$run/$stem.tar.gz"
done
cmp "$scratch/1/$stem.files.sha256" "$scratch/2/$stem.files.sha256"
cmp "$scratch/1/$stem.tar.gz" "$scratch/2/$stem.tar.gz"
mkdir "$scratch/extracted"
tar -xzf "$scratch/1/$stem.tar.gz" -C "$scratch/extracted"
(cd "$scratch/extracted" && sha256sum -c --quiet "$scratch/1/$stem.files.sha256")
node scripts/artifact-check.mjs "$scratch/extracted"
(cd "$scratch/1" && sha256sum "$stem.tar.gz" "$stem.files.sha256" > SHA256SUMS)
```

Verify `alnilam-provenance.json` in the extracted archive records the expected
Core and bundled Site commit and Site digest, and compare its distribution
notices with the repository copies. Upload the three verified files from
`$scratch/1`. Record the canonical URL, epoch, input SHAs, digest, archive
checksum and Verify URL with the release. GitHub Release assets are separate
from protected Vercel staging and the Owner-authorized public promotion.

## CI acceptance inventory (workflow: CI, job: verify)

The required `verify` check always runs. A change whose every path is documentation
(`docs/**`, `LICENSES/**`, root Markdown, `LICENSE`, `NOTICE`) runs the documentation
tests only; any other path — including `.github/**`, Site fixtures and dependencies —
runs the full product checks below. The decision is made inside the job, so the
required check is never left pending.

1. `pnpm install --frozen-lockfile` (Node 24, pnpm 10.19)
2. Contract tests (`pnpm test`): config normalization, schema fail-closed, Site digest stability, output-overlap rejection, symlink rejection, provenance binding, hashTree addressing, upgrade-check argument handling.
3. Python contract, artifact and release tests (`scripts/tests/*_test.py`), including the offline release DAG.
4. `astro check`
5. Demo compose + output assertions (`index.html`, first post, `site-assets/orion.svg`), nested-base compose and internal-URL containment.
6. PhotoSwipe fixture compose at both bases, then the complete Playwright browser acceptance (root and `/ALNILAM/`).
7. External-Site composition + isolation (byte-compare of the Site before/after).
8. Two-version Core upgrade/rollback against an unchanged external Site.
9. Artifact budget check (wired into `pnpm build`): external script-tag scan on posts pages, ≤2 islands/page, explicit img dimensions and provenance shape.
10. Documentation tests: Markdown link checks, documented commands, full Site-config examples, rejection of active CNB provider claims, release-version and target-status checks, unique ADR identifiers, production-boundary negative fixtures. Built artifacts are also scanned in verify.

## Known operational notes

- **Astro requires Node ≥22.23.4**; older Node versions fail `astro check` with a version banner, not a type error.
- **Generated Astro state:** Compose serializes access to shared `apps/web/.astro` scratch state. If output appears stale, rerun into a fresh temporary output directory and compare provenance. `--clean-cache` only removes the verified managed cache; do not recursively remove `apps/web/.astro` or `apps/web/dist` as a troubleshooting step.
- **Pagefind index nondeterminism**: `pagefind-entry.json` language key order follows worker completion; compose sorts it. Repeat builds are byte-identical with `SOURCE_DATE_EPOCH` pinned.
- **`pagefind-entry.json` must not be Svelte-$state wrapped** in islands — the module namespace breaks under reactive proxies (documented in `packages/ui/src/Search.svelte`).
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

