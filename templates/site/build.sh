#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
root=$(pwd -P)

fail() { printf 'ALNILAM build: %s\n' "$1" >&2; exit 1; }
revision=$(<core.sha) || fail 'Missing core.sha with the pinned Core commit.'
[[ $revision =~ ^[0-9a-f]{40}$ ]] || fail 'core.sha must contain one full lowercase Core commit SHA.'
[[ -d site && ! -L site ]] || fail 'Expected a site/ directory containing your YAML v2 configuration and posts.'
git_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -n $git_root ]]; then
  [[ $git_root == "$root" ]] || fail 'Copy the starter into the root of your own Git repository.'
  site_ref=$(git rev-parse --verify HEAD) || fail 'Create the initial Site commit before building.'
  site_status=$(git status --porcelain --untracked-files=all --ignored -- site/)
  [[ -z $site_status ]] || fail 'Commit the Site inputs in site/ before building. Remove any ignored files there.'
  tracked_output=$(git ls-files -- dist)
  [[ -z $tracked_output ]] || fail 'dist/ is reserved for generated output. Move tracked files out of it.'
else
  # Some Git integrations provide source files and a commit SHA without .git.
  site_ref=${CF_PAGES_COMMIT_SHA:-${WORKERS_CI_COMMIT_SHA:-${VERCEL_GIT_COMMIT_SHA:-${COMMIT_REF:-}}}}
  [[ $site_ref =~ ^[0-9a-f]{40}$ ]] || fail 'Build from your Site Git repository or enable the host Git commit metadata.'
fi
[[ ! -L dist ]] || fail 'dist/ is reserved for generated output. Move the symlink out of it.'
[[ ! -e dist || -f dist/alnilam-provenance.json ]] || fail 'Move existing dist/ aside before building.'

scratch=$(mktemp -d /tmp/alnilam-core.XXXXXX)
artifact=$(mktemp -d "$root/.alnilam-build.XXXXXX")
# Some systems expose TMPDIR through a symlink. Compose requires a physical cache path.
trap 'rm -rf -- "$scratch" "$artifact"' EXIT
core=$(cd -- "$scratch" && pwd -P)
git -C "$core" init -q
git -C "$core" fetch -q --depth=1 https://github.com/Skyline-Gazer/ALNILAM.git "$revision" || fail 'Could not fetch this Core SHA from the public ALNILAM repository.'
git -C "$core" switch -q --detach FETCH_HEAD
[[ $(git -C "$core" rev-parse HEAD) == "$revision" ]] || fail 'Fetched Core commit does not match core.sha.'
cd -- "$core"
pm=$(node -p 'require("./package.json").packageManager ?? ""')
[[ $pm =~ ^pnpm@[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'The pinned Core must declare an exact pnpm version.'

unset ALNILAM_REPO_ROOT ALNILAM_TOOLCHAIN_ROOT ALNILAM_CACHE_DIR
export ALNILAM_CORE_REV="$revision" ALNILAM_SITE_REF="$site_ref"
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-$(git show -s --format=%ct HEAD)}"
npm exec --yes --package="$pm" -- pnpm install --frozen-lockfile --prod=false
npm exec --yes --package="$pm" -- node scripts/compose.mjs --site "$root/site" --out "$artifact/dist"
node scripts/artifact-check.mjs "$artifact/dist"
node scripts/seo-check.mjs "$artifact/dist"
if [[ -n $git_root ]]; then
  site_status=$(git -C "$root" status --porcelain --untracked-files=all --ignored -- site/)
  [[ -z $site_status && $(git -C "$root" rev-parse HEAD) == "$site_ref" ]] || fail 'The Site Git state changed during the build.'
fi
if [[ -e $root/dist ]]; then mv -- "$root/dist" "$artifact/previous"; fi
if ! mv -- "$artifact/dist" "$root/dist"; then
  if [[ -d $artifact/previous ]] && ! mv -- "$artifact/previous" "$root/dist"; then
    trap 'rm -rf -- "$scratch"' EXIT
    fail "Could not restore the previous build. It remains in $artifact/previous."
  fi
  fail 'Could not move the checked artifact into dist/.'
fi
