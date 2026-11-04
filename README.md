# ALNILAM

**ALNILAM — A Modern, Extensible Blogging Platform**

Apache-2.0 licensed, static-first Astro 7 / Svelte 5 / Tailwind CSS 4 blogging platform, with a strict Core/Site ownership boundary. Released v0.1.3 uses the Editorial theme; the P1 preview on `dev` uses the Shirone-derived theme.

> **Status:** v0.1.3 is released; current CNB `dev` development is not a production release. P2 Core/Site work is accepted on the tracker: independent CNB Site and Core push runs are recorded in [#55](https://github.com/Skyline-Gazer/ALNILAM/issues/55). GitHub's reusable Site workflow has not been exercised on its mirror. See [Handoff](docs/HANDOFF.md) for historical recovery context and check live Issues and CNB before starting work.

## Quickstart

Requires Node.js ≥22.23.4 (or Node 24) and pnpm 10.19 (via Corepack).

```bash
git clone https://github.com/Skyline-Gazer/ALNILAM.git
cd ALNILAM
git switch dev
corepack enable
pnpm install --frozen-lockfile
pnpm dev            # dev server against the demo Site
pnpm test           # contract and CI helper tests
pnpm check          # astro check
pnpm build          # compose demo Site + artifact budget checks
```

The default Site fixture lives in `sites/demo` (three locales, two articles) — it is a test fixture, **never** a user-owned production Site.

## Local browser and performance checks

In a fresh worktree, install dependencies as above and install the pinned Playwright
Chromium with `pnpm exec playwright install chromium` (Linux may also require
`pnpm exec playwright install-deps chromium`). Ports 4323 and 4324 must be free.
Then run one of:

```bash
pnpm browser:local     # complete default Playwright suite, including CLS
pnpm cls:local         # CLS and navigation-focused Playwright specifications
pnpm lighthouse:local  # mobile and desktop Lighthouse, including regression probes
pnpm audit:local       # complete Playwright suite followed by both Lighthouse runs
```

Each command composes a temporary copy of the demo Site at root and `/ALNILAM/`,
checks both artifacts, and stops on failure. Browser commands accept additional
Playwright arguments, for example `pnpm browser:local -- --grep navigation`.
Playwright writes `browser-results/`; Lighthouse writes `artifacts/lighthouse/`
and `artifacts/lighthouse-regression/`, replacing the selected form factor's
previous reports. Lighthouse uses the CI routes, budgets, run count and expected-red
CLS regression check. These local results do not replace the target-owned CNB gate;
the separate P1 external-Site baseline uses a different fixture and configuration.

CNB publishes gate evidence as commit attachments and downloads it again to verify
the manifest, file sizes and SHA-256 before marking the upload successful. The manifest
lists the archive and its parts in order. If CNB explicitly reports a 100 MB per-file
limit, the uploader retries in parts of at most 90 MiB; quota and ambiguous failures
remain failures. To recover a split archive, download the manifest and every listed
part, concatenate them in manifest order (for example `cat archive.tgz.part* > archive.tgz`),
then compare `sha256sum archive.tgz` with the manifest's `sha256` before extracting.
CNB's overall storage quota is separate from its per-file limit.

## Build Core with your own Site

```bash
node scripts/compose.mjs --site /absolute/path/to/my-site --out /absolute/path/to/dist
```

Required Site layout (schema v2 — frozen):

```
my-site/
  alnilam.config.yaml     # schemaVersion: 2, site: {title, url, locale}, locales, theme: {appearance}
  content/posts/          # *.md / *.mdx
  assets/                 # optional → served at /site-assets/
  data/                   # optional, reserved
```

See [Site onboarding](docs/SITE_ONBOARDING.md) for the complete, copy-ready
configuration including `locales`, taxonomy and module blocks.

- The Site is hashed before and after building; **any mutation aborts the build**.
- Output is staged, then atomically swapped; `alnilam-provenance.json` binds the Core revision + Site SHA-256 digest.
- Non-default-locale posts: put them in `content/posts/<lang>/` with frontmatter `lang` + `translationKey` → served at `/posts/<lang>/<slug>/` with automatic hreflang alternates.
- Full contract, slug rules, image policy, and private-Site CI strategy: [docs/SITE_ONBOARDING.md](docs/SITE_ONBOARDING.md).

## Search

Local search is powered by [Pagefind](https://pagefind.app/) (MIT). The index is built during compose into `/pagefind/` and loaded lazily — pages ship no post content in their bundles. No configuration needed; if the index is absent the search UI stays inert.

## Upgrade / rollback

1. Check out the target Core revision (a second clone or `git worktree`).
2. `node scripts/compose.mjs --site <same-site> --out <new-out>` — the Site is never fetched, reset, or checked out by Core.
3. Compare `alnilam-provenance.json`'s `site.digest` with the previous build — must match.
4. Swap the served directory. Rollback = rebuild with the previous Core revision.

CI runs this acceptance on every PR (two revisions, one unchanged external Site, byte-identical provenance).

## Development and governance

- Primary development: CNB `dev` with Issue-linked CNB PRs; GitHub Issues/Project remain the task tracker; `main` is release-only (rulesets `alnilam-dev` / `alnilam-main`: PR-only + required `verify` check, no force pushes/deletion).
- Tagging: `vX.Y.Z` on `main` only, annotated, created by the release PR merge. See [CHANGELOG.md](CHANGELOG.md) for versioning rules (SemVer; `lang`/`translationKey` are schema-v1 additive fields).
- ADS pinned at `.ads` to commit `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` (ADS `cnb/dev` development line, not a release tag; private — optional for public users, `git submodule update --init --checkout .ads` requires authorized access). CI never clones it.
- Docs: [Architecture](docs/ARCHITECTURE.md) · [Site onboarding](docs/SITE_ONBOARDING.md) · [Roadmap](docs/ROADMAP.md) · [Handoff](docs/HANDOFF.md)
- Attribution: [CREDITS.md](CREDITS.md) · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · [NOTICE](NOTICE)
- GitHub Project #17: https://github.com/orgs/Skyline-Gazer/projects/17/
- ALNILAM Next: G0-F froze the P1 Plan/Spec through [PR #77](https://github.com/Skyline-Gazer/ALNILAM/pull/77). Shirone slice [PR #95](https://github.com/Skyline-Gazer/ALNILAM/pull/95) is merged to `dev`; P1 is accepted under closed [#37](https://github.com/Skyline-Gazer/ALNILAM/issues/37), including the integrated #49 routing/lifecycle, #50 browser evidence and #79 Astro compatibility work. Reusable ALNILAM behavior (immutable Site build, v2 YAML contract, CI, Pagefind and optional modules) is retained; production release remains separately gated. Future Astro build acceleration stays out of release scope until official stabilization.
- ADS adoption follows the v0.5.0 Lite model: [lite adoption](https://github.com/Skyline-Gazer/ADS/blob/b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695/docs/lite-adoption.md). Optional CodeGraph/RTK and strict profiles are not enabled. This project remains Apache-2.0; ADS's MIT license does not relicense ALNILAM.

## License

Apache-2.0 — see [LICENSE](LICENSE). Third-party npm packages are consumed unmodified under their own licenses (summary in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
