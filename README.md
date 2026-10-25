# ALNILAM

**ALNILAM — A Modern, Extensible Blogging Platform**

Apache-2.0 licensed, static-first Astro 7 / Svelte 5 / Tailwind CSS 4 blogging platform, with a strict Core/Site ownership boundary and an original Editorial theme.

> **Status: v0.1.0.** Core/Site composition, two-version upgrade/rollback acceptance, Editorial UI (dark/light), RSS/sitemap/robots/SEO, archives, tags, local search (Pagefind), i18n with hreflang, and paginated streams are implemented and CI-verified. See [CHANGELOG.md](CHANGELOG.md).

## Quickstart

Requires Node.js ≥22.23.4 (or Node 24) and pnpm 10.19 (via Corepack).

```bash
git clone https://github.com/Skyline-Gazer/ALNILAM.git
cd ALNILAM
git switch dev
corepack enable
pnpm install --frozen-lockfile
pnpm dev            # dev server against the demo Site
pnpm test           # contract tests (10)
pnpm check          # astro check
pnpm build          # compose demo Site + artifact budget checks
```

The default Site fixture lives in `sites/demo` (three locales, two articles) — it is a test fixture, **never** a user-owned production Site.

## Build Core with your own Site

```bash
node scripts/compose.mjs --site /absolute/path/to/my-site --out /absolute/path/to/dist
```

Required Site layout (schema v1 — frozen):

```
my-site/
  alnilam.config.toml     # schemaVersion = 1, [site] title/url, [theme] appearance
  content/posts/          # *.md / *.mdx
  assets/                 # optional → served at /site-assets/
  data/                   # optional, reserved
```

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

- Primary development: `dev` with Issue-linked PRs; `main` is release-only (rulesets `alnilam-dev` / `alnilam-main`: PR-only + required `verify` check, no force pushes/deletion).
- Tagging: `vX.Y.Z` on `main` only, annotated, created by the release PR merge. See [CHANGELOG.md](CHANGELOG.md) for versioning rules (SemVer; `lang`/`translationKey` are schema-v1 additive fields).
- ADS v0.3 pinned at `.ads` (private; optional for public users — `git submodule update --init --recursive` requires authorized access). CI never clones it.
- Docs: [Architecture](docs/ARCHITECTURE.md) · [Site onboarding](docs/SITE_ONBOARDING.md) · [Roadmap](docs/ROADMAP.md) · [Handoff](docs/HANDOFF.md)
- Attribution: [CREDITS.md](CREDITS.md) · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · [NOTICE](NOTICE)
- GitHub Project #17: https://github.com/orgs/Skyline-Gazer/projects/17/

## License

Apache-2.0 — see [LICENSE](LICENSE). Third-party npm packages are consumed unmodified under their own licenses (summary in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
