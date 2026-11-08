# Release Candidate draft — P6 onboarding (#76)

Status: **draft only**. No tag, no `main` merge, no production publish.
Date: 2026-11-08. Issue: [#76](https://github.com/Skyline-Gazer/ALNILAM/issues/76).

## Pins

| Item | Value |
| --- | --- |
| CNB `dev` (branch base) | `145999e3b014041c7102e0a0dcc2ef191d83e85d` |
| Tree | `ce57903119b6783713a53d3ffdf088344c27a42d` |
| GitHub `dev` | `39ca829f97a60247f4c6a14e619dd847a5e895eb` (same tree) |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` |
| Candidate branch | `feat/76-onboarding-rc` — CNB PR [#84](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/84) |
| Old Core (upgrade-check) | `046f251d0092adee8d7d7e091df6bce82dd3ac16` (ancestor of CNB `dev`; historical HANDOFF SHA) |
| Temp Site digest | `7613644ae43a99b464aef4c9690b059ca2c75ded9eac336a37e03fda114d1227` |
| Temp Site ref | `unversioned` (directory Site, not a Git root) |

## Acceptance exercised locally

### Clean independent Site (schema v2)

Temp Site layout (not committed):

- `alnilam.config.yaml` with `schemaVersion: 2`, `site.{title,description,url,locale}`, `locales`, `theme.appearance`
- `content/posts/hello-76.md` + `content/posts/en/hello-76.md` (`lang` + `translationKey`)
- `assets/mark.svg` → `/site-assets/mark.svg`

Commands (Core worktree `/tmp/alnilam-76-onboarding`):

```bash
node scripts/compose.mjs --site /tmp/alnilam-76-ext-site --out /tmp/alnilam-76-out-root
ALNILAM_SITE_URL=https://example.com/ALNILAM/ \
  node scripts/compose.mjs --site /tmp/alnilam-76-ext-site --out /tmp/alnilam-76-out-nested
```

Results:

- Site digest before = after root = after nested = `7613644a…`
- Both outputs contain `posts/hello-76/`, `en/posts/hello-76/`, `site-assets/mark.svg`
- Nested HTML references `/ALNILAM/_astro/…`
- `alnilam-provenance.json` binds `core.revision=145999e3…`, `site.digest=7613644a…`, `site.ref=unversioned`

### Upgrade / rollback

```bash
SOURCE_DATE_EPOCH=1700000000 \
  node scripts/upgrade-check.mjs \
    --old 046f251d0092adee8d7d7e091df6bce82dd3ac16 \
    --site /tmp/alnilam-76-ext-site
```

- Exit 0
- Site digest unchanged through upgrade and rollback builds
- Current Core output digest: `fb8a150426eafa19670c1c1825b22faf458f36a83231977ea899bfa8a819fd3c`
- Old Core output digest: `0b2bb71cf10b8ae9ad277cc4c2ff2e03430a670edce39270fe8c80fbce84c9b2`
- NOTE: outputs differ (expected Core rendering drift); Site non-mutation is the hard contract

Observed fail-closed edge (documented, not a Site mutation failure): a Site that still declares the later `llms` config key is rejected by Core `046f251…` with `ALNILAM: unknown config field "llms"`. `upgrade-check` classifies that anchored unknown-field line as an expected contract rejection (`UPGRADE/ROLLBACK OK: Site unchanged; old Core build failed closed.`).

### Targeted test

`node --test --test-isolation=none --test-name-pattern='upgrade-check classifies' scripts/tests/contract.test.mjs` → pass.

## Doc / code fixes in this candidate

- `docs/SITE_ONBOARDING.md`: root/`ALNILAM_SITE_URL` subpath compose examples; `upgrade-check` acceptance; omit unknown keys for older Core; mention `llms` with other modules
- `scripts/upgrade-check.mjs` + `scripts/tests/contract.test.mjs`: expected fail-closed for unknown config fields
- `README.md`, `docs/ARCHITECTURE.md`: point upgrade/rollback to `upgrade-check`
- `docs/HANDOFF.md`, `docs/ROADMAP.md`: tip facts for 2026-11-08; keep historical sections as evidence

## CI

- Candidate CNB PR: https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/84 (CI on tip pending at draft time)
- Existing GitHub `verify` workflow still runs `upgrade-check` against `vars.ALNILAM_OLD_CORE_SHA` / `v0.1.0` / bootstrap fallback
- Trusted CNB gate remains target-owned; this PR does not claim candidate browser coverage

## Unverified / external blockers

- Owner authorization before tag, `main`, production deploy, or GitHub mirror push (Vercel Production tracks GitHub `dev`)
- Project #17 live card status for #76 (anonymous/API writeback not performed in this slice)
- Full `pnpm test` / `pnpm check` / `pnpm build` / browser suite on the candidate tip (only the upgrade-check classification unit was run mid-flight)
- Real Git-versioned Site `ALNILAM_SITE_REF` / Site HEAD provenance (temp Site was unversioned)
- Deployed-host acceptance (GitHub Pages / Vercel) — requires separate Owner publish; Issue #34 is closed and is not authorization
- Sibling P6 Issues #72/#74 acceptance and CNB PR #78 (#71) remain outside this slice

## Non-actions

No release tag, no `main` edit, no ADS pin change, no production deploy, no GitHub mirror.
