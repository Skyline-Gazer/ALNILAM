# Maintainer guide

Operational notes for ALNILAM maintainers. Public contributor guidance is in [CONTRIBUTING](../CONTRIBUTING.md); Site authors use [Site onboarding](SITE_ONBOARDING.md).

## Branch model

- `main` — release-only. Protected by ruleset `alnilam-main` (ID 25809753): PR-only, required `verify` check (strict), no force pushes, no deletion.
- `dev` — integration branch. Protected by ruleset `alnilam-dev` (ID 25809723): identical policy.
- Task branches: `feat/*`, `fix/*`, `chore/*` from `dev`; Issue-linked PRs only.

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
