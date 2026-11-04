#!/usr/bin/env bash
set -euo pipefail
# Pin the independent Site; update through a reviewed Core change.
site_sha=6c0246f31cf6af04167c9ec7d09237731167c38d
core_sha="$(git rev-parse HEAD)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
git init -q "$work_dir/site"
git -C "$work_dir/site" remote add origin https://cnb.cool/KoolingMachine/Test-Site.git
git -C "$work_dir/site" fetch -q --depth 1 origin "$site_sha"
git -C "$work_dir/site" checkout -q --detach FETCH_HEAD
test "$(git -C "$work_dir/site" rev-parse HEAD)" = "$site_sha"
npm install --global --ignore-scripts pnpm@10.19.0
pnpm install --frozen-lockfile
before="$(node --input-type=module -e 'import {validateSiteRoot} from "./scripts/site-contract.mjs"; console.log(validateSiteRoot(process.argv[1]).digest)' "$work_dir/site")"
export ALNILAM_SITE_REF="$site_sha" SOURCE_DATE_EPOCH=1700000000
node scripts/compose.mjs --site "$work_dir/site" --out "$work_dir/root"
node scripts/artifact-check.mjs "$work_dir/root"
ALNILAM_SITE_URL=https://example.com/ALNILAM/ node scripts/compose.mjs --site "$work_dir/site" --out "$work_dir/nested"
node scripts/artifact-check.mjs "$work_dir/nested"
after="$(node --input-type=module -e 'import {validateSiteRoot} from "./scripts/site-contract.mjs"; console.log(validateSiteRoot(process.argv[1]).digest)' "$work_dir/site")"
test "$before" = "$after"
test "$(git -C "$work_dir/site" rev-parse HEAD)" = "$site_sha"
test -z "$(git -C "$work_dir/site" status --porcelain --untracked-files=all)"
CORE_SHA="$core_sha" SITE_SHA="$site_sha" SITE_DIGEST="$before" OUTPUT_ROOT="$work_dir" node --input-type=module <<'NODE'
import fs from 'node:fs';
for (const layout of ['root', 'nested']) {
  const p = JSON.parse(fs.readFileSync(`${process.env.OUTPUT_ROOT}/${layout}/alnilam-provenance.json`, 'utf8'));
  if (p.core?.revision !== process.env.CORE_SHA || p.site?.ref !== process.env.SITE_SHA || p.site?.digest !== process.env.SITE_DIGEST) throw Error(`${layout}: provenance mismatch`);
}
console.log(`INDEPENDENT_SITE_VERIFIED core=${process.env.CORE_SHA} site=${process.env.SITE_SHA} digest=${process.env.SITE_DIGEST}`);
NODE
