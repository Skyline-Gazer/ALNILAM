# ALNILAM

**ALNILAM — A Modern, Extensible Blogging Platform**

Apache-2.0 licensed, static-first Astro 7 / Svelte 5 / Tailwind CSS 4 blogging platform, with a strict Core/Site ownership boundary. Released v0.2.0 uses the Shirone-derived frontend; the Editorial theme remains the v0.1.x rollback package.

> **Status:** v0.2.0 is the Foundation release. GitHub `main` is release-only at that version; `dev` carries post-release development. GitHub Actions `verify` is the required check on both branches. CNB `dev` remains frozen at `9916a0c4984f8e9d762f59247cf923f0fd7f0071`. See [Handoff](docs/HANDOFF.md) and live Issues for current state and remaining acceptance.

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
The PhotoSwipe fixture also uses ports 4333 and 4334.
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
`browser:local` and `audit:local` compose the HTTPS PhotoSwipe article from
`tests/fixtures/lightbox-site` into `dist/lightbox-root` and `dist/lightbox-nested`.
Use `pnpm browser` to rerun specs against already composed outputs.
Playwright writes `browser-results/`; Lighthouse writes `artifacts/lighthouse/`
and `artifacts/lighthouse-regression/`, replacing the selected form factor's
previous reports. Lighthouse uses the CI routes, budgets, run count and expected-red
CLS regression check. Local results are developer evidence; GitHub Actions `verify`
is the required pull request validation. The CNB browser/CLS pilot is frozen and
is not part of current ALNILAM validation. Its historical artifact procedure remains
in the [pilot record](docs/pilots/CNB-BROWSER-PLUGINS.md).

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
  data/                   # optional — taxonomy.yaml
```

See [Site onboarding](docs/SITE_ONBOARDING.md) for the complete, copy-ready
configuration including `locales`, taxonomy and module blocks.

- The Site is hashed before and after building; **any mutation aborts the build**.
- Output is staged, then atomically swapped; `alnilam-provenance.json` binds the Core revision + Site SHA-256 digest.
- Non-default-locale posts: put them in `content/posts/<lang>/` with frontmatter `lang` + `translationKey` → served at `/<lang>/posts/<slug>/` with automatic hreflang alternates for real translations. Old `/posts/<lang>/<slug>/` URLs provide a noindex static navigation fallback to the canonical article.
- Optional `llms.enabled` publishes locale-aware LLM discovery and source-backed Markdown views; `llms.full` separately opts into aggregation. Both default off; see [Site onboarding](docs/SITE_ONBOARDING.md) for privacy and hosting details.
- Gallery/Albums, Moments and Music are retired product features; the `gallery` and `moments` config keys stay accepted but are ignored and warn at build time. See [Site onboarding](docs/SITE_ONBOARDING.md#retired-modules-gallery-moments).
- Optional `comments.enabled` adds Giscus discussions through an explicit identity mapping. Comments default off; the default `load: click` mode waits for reader action, while `load: visible` can load as the section approaches the viewport. See [Site onboarding](docs/SITE_ONBOARDING.md#comments-comments).
- Full contract, slug rules, image policy, and private-Site CI strategy: [docs/SITE_ONBOARDING.md](docs/SITE_ONBOARDING.md).

## Search

Local search is powered by [Pagefind](https://pagefind.app/) (MIT). The index is built during compose into `/pagefind/` and loaded lazily — pages ship no post content in their bundles. No configuration needed; if the index is absent the search UI stays inert.

## Upgrade / rollback

1. Check out the target Core revision (a second clone or `git worktree`).
2. `node scripts/compose.mjs --site <same-site> --out <new-out>` — the Site is never fetched, reset, or checked out by Core.
3. Compare `alnilam-provenance.json`'s `site.digest` with the previous build — must match.
4. Swap the served directory. Rollback = rebuild with the previous Core revision.

Automated acceptance: `node scripts/upgrade-check.mjs --old <historical-core-sha> [--site /absolute/path]`. CI runs this on every PR (two Core revisions, one unchanged external Site). Site digest identity is the hard contract; output bytes may differ when Core rendering changed. See [Site onboarding](docs/SITE_ONBOARDING.md).

## Development and governance

- Primary development: GitHub `dev` through Issue-linked PRs; GitHub Issues and Project #17 remain the task tracker; `main` is release-only. The active `alnilam-dev` / `alnilam-main` rulesets require PRs and the `verify` check, with no bypass or force pushes.
- CNB `dev` is frozen at `9916a0c4984f8e9d762f59247cf923f0fd7f0071`; new product work and current validation do not run through CNB.
- Vercel: the existing public Demo project remains on GitHub `dev`; separate `alnilam-production-next` tracks `main` with SSO protection. Its deployment URL is gated; first formal Production release and custom-domain activation remain Owner decisions. See [Handoff](docs/HANDOFF.md).
- Tagging: `vX.Y.Z` on `main` only, annotated, created by the release PR merge. See [CHANGELOG.md](CHANGELOG.md) for SemVer rules; the content-frontmatter fields `lang` and `translationKey` were added compatibly in schema v1 and remain supported under v2.
- ADS pinned at `.ads` to commit `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` (ADS `cnb/dev` development line, not a release tag; private — optional for public users, `git submodule update --init --checkout .ads` requires authorized access). CI never clones it.
- Docs: [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Site onboarding](docs/SITE_ONBOARDING.md) · [Roadmap](docs/ROADMAP.md) · [Handoff](docs/HANDOFF.md) · [Security policy](SECURITY.md)
- Attribution: [CREDITS.md](CREDITS.md) · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · [NOTICE](NOTICE)
- GitHub Project #17: https://github.com/orgs/Skyline-Gazer/projects/17/
- Release line: Foundation v0.2.0 ships the Shirone-derived frontend adopted after G0-F, the YAML schema v2 Site contract, optional Site modules and the release artifact hygiene gate. Post-release fixes and the next roadmap follow [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136); experimental Astro build acceleration stays out of scope until its official stable release is validated.
- ADS: the current project pin is `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` on ADS `cnb/dev`, a development line rather than a release. PR #84 records historical v0.4.1 adoption; optional CodeGraph/RTK and strict profiles remain disabled. Public CI does not fetch the private submodule; see [AGENTS](AGENTS.md).

## License

Apache-2.0 — see [LICENSE](LICENSE). Third-party npm packages are consumed unmodified under their own licenses (summary in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
