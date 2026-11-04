# External Site onboarding

An ALNILAM **Site** is an independent directory (usually its own Git repository) that owns
your content, configuration and assets. Core never writes into it, fetches it, or checks
it out — you pin the Site revision yourself.

## Site layout (schema v2 — frozen)

```
yoursite/
├── alnilam.config.yaml      # required — site configuration
├── content/posts/           # required — Markdown/MDX posts
├── assets/                  # optional — copied verbatim to /site-assets/ in output
└── data/                    # optional — reserved, not yet read
```

### `alnilam.config.yaml` (schema v2)

```yaml
schemaVersion: 2            # required; only 2 is supported. Old Core + new Site fails closed.

site:
  title: "My Blog"            # required, non-empty
  description: "About this blog"
  url: "https://blog.example.com"   # required, absolute http(s) URL
  locale: "zh-CN"             # optional, default zh-CN; must appear in locales

locales:                      # optional, defaults to [site.locale]; list every content locale
  - "zh-CN"

theme:
  appearance: "dark"          # "dark" | "light", default dark
```

Unknown top-level or nested keys fail the build, and so do malformed YAML, duplicate
keys, unresolved YAML tags and non-plain YAML values. The `comments` and `bangumi`
module blocks are documented below.

**Reserved fields:** `routing`, `categories` and `tags` are accepted and validated for
forward compatibility, but this Core revision has no consumer for them — do not rely on
them in Sites. Tag pages derive from post frontmatter.

### Posts and slugs

- Place posts under `content/posts/*.md` (or `.mdx`). Frontmatter schema:
  `title` (required), `description`, `pubDate` (required date), `updatedDate`,
  `cover` (path), `tags`, `draft`, `lang` (optional BCP-47),
  `translationKey` (optional, groups translations for hreflang).
- **The slug is the file path** under `content/posts` (without extension). A post at
  `content/posts/2026/hello.md` is served at `/posts/2026/hello/`. Renaming or moving a
  file changes its public URL — treat paths as stable identifiers.
- **i18n layout (recommended)**: put non-default-locale posts in
  `content/posts/<lang>/` (e.g. `content/posts/en/hello.md` → `/posts/en/hello/`) and
  set frontmatter `lang` + `translationKey` on every member of a translation group.
  Pages sharing a `translationKey` get automatic `hreflang` alternates (and
  sitemap `xhtml:link` entries). Default-locale posts live directly under
  `content/posts/`.
- `draft = true` posts are excluded from all builds.

### Images policy

Covers and absolute `/site-assets/...` images are **Site-owned and served
as-is** — ALNILAM does not re-encode, resize, or fetch them at build time. The
only build-time asset work is resolving post-relative `![]()` references (see
below). This keeps the build deterministic and offline:

- An image referenced with an absolute path (`/site-assets/...`) must exist under
  your Site's `assets/` directory.
- A post-relative image (a Markdown image whose destination is `./img.png`) is
  resolved relative to the Markdown file's directory (including `../`
  references) by Astro's image pipeline at build time, into the build space
  only — the source Site is never modified. The copy is emitted under
  `/_astro/...`, prefixed with your configured `base` on subpath hosts
  (verified with an SVG fixture under `/ALNILAM/`). Inline HTML `<img>` tags
  are not rewritten; use `![]()` or an absolute `/site-assets/...` path.
- Remote `http(s)` image URLs are rendered as plain `<img>` without any
  build-time download.

Authors should ship appropriately sized images; the platform guarantees CLS-safe
markup by always emitting explicit `width`/`height` on generated cover `<img>` tags.

### Build cache

Derived build state (the verified Site snapshot, Astro's content/image store,
Vite's dependency cache) lives in one managed cache root — `<repo>/.cache/alnilam`
by default, overridable with `ALNILAM_CACHE_DIR`. The snapshot and Astro's
content/image store are keyed by Core revision and Site digest; Vite's
dependency cache is keyed by Core revision alone (optimized deps do not vary
with Site content). Repeated builds never write into your Site.
`node scripts/compose.mjs --clean-cache` removes the whole cache and the
legacy cache directories (`apps/web/.astro`, `apps/web/node_modules/.astro`)
left by earlier versions. Builds of the same Core revision and Site digest
are serialized by a lock in the cache; a lock is released when its build
finishes and stolen when its holder process is gone or after six hours.

## Optional modules (opt-in via config)

Both modules are feature-flagged: **disabled modules ship nothing** — no page, no 404 stub, no client JS, no third-party requests.

### Comments (`[comments]`)

```yaml
comments:
  enabled: true
  provider: "giscus"            # only provider
  repo: "you/your-repo"         # public GitHub repo hosting Discussions
  repoId: "R_..."               # from giscus.app
  category: "Announcements"
  categoryId: "DIC_..."
  # mapping: "pathname"         # optional: pathname | specific | number
```

Renders on post pages as a lazy `client:visible` island; the giscus script loads only after the section scrolls into view. Requires GitHub Discussions on the repo. Theme (dark/light) and language follow your Site config.

### Bangumi (`[bangumi]`)

```yaml
bangumi:
  enabled: true
  userId: "your-bgm-name"
  subjectType: "anime"          # anime | book | music | game
  limit: 10                     # 1–50
```

Adds `/bangumi/` (nav + footer links appear automatically). Data is fetched **once at build time** from `api.bgm.tv` and embedded as static HTML — visitors make **zero** third-party data requests. Cover images hotlink `lain.bgm.tv` with `referrerpolicy="no-referrer"` (fetching covers into your output would redistribute upstream artwork). If the API is unreachable at build time the page renders an inline warning; the rest of the Site is unaffected.

## Building

```bash
# From a checkout of ALNILAM (Core):
node scripts/compose.mjs --site /absolute/path/to/yoursite --out /absolute/path/to/output
```

The output directory must not overlap the Site directory. The build:

1. Hashes the Site inputs (rejecting symlinks and non-regular files),
2. Builds static HTML with the pinned Core revision,
3. Re-hashes the Site and aborts if anything changed,
4. Writes `alnilam-provenance.json` (Core revision, Site ref, Site SHA-256 digest) into the output.

Set `ALNILAM_SITE_REF` to the Site commit SHA in CI; otherwise a Site that is its own
Git root records its `HEAD`, and an unversioned Site records `unversioned`. An output
from Core revision X is reproducible from the same Site digest; bind the Core revision,
Site ref and Site digest in your deployment configuration and fail closed if they drift.

## Core upgrade / rollback workflow

1. Check out the target Core revision in its own directory (`git worktree` or a second clone).
2. Run `compose` against the **same unchanged Site directory**.
3. Verify `alnilam-provenance.json` in the new output: the Site digest must match the previous build's.
4. Swap the served output directory; rollback = rebuild with the previous Core revision.

The Site's Git ref is never touched by any of these steps.

## Content build security and secrets boundary

- **Secrets never belong in the Site.** `alnilam.config.yaml`, `content/` and
  `assets/` are copied verbatim into the build and published as content — any
  value placed there is public. Keep credentials in your CI system's secret
  store (GitHub Actions Secrets); the shipped workflows consume them only
  where needed and never echo them (anchored by
  `scripts/tests/workflows.test.mjs`).
- **Provenance contains only documented build metadata.**
  `alnilam-provenance.json` records the Core revision, Site ref, Site digest,
  schema and timestamp. The regression test in
  `scripts/tests/secrets-boundary.test.mjs` verifies that two injected
  environment marker values are absent from every composed output file.
  This does not guarantee that arbitrary trusted MDX or future build code
  cannot read and publish environment values; keep secrets out of their reach.
- **Build-time code is trusted, not sandboxed.** MDX and the build run with
  the CI job's permissions; only build Site content you trust. See
  docs/ARCHITECTURE.md "Current limits".

## Private Site: secure CI strategy

If your Site repository is private and you build in CI:

- **Two-checkout pattern (recommended)**: one workflow job checks out Core with the
  standard `actions/checkout`, a second step checks out the Site with a
  fine-grained token scoped to only the Site repository (`contents: read`). Pass the
  Site checkout path to `compose --site`. The Site token never grants access to Core.
- **No cross-writeback**: CI jobs must have write access to neither repository's
  refs. Publishing is a separate deploy step reading the composed output.
- **Provenance gating**: after a CI build, assert `alnilam-provenance.json`'s
  `site.digest` equals the digest of the exact Site commit being deployed. CI on the
  Site repo should record the digest; CI on Core should record its own revision.
- Keep `ALNILAM_CORE_REV`/`SOURCE_DATE_EPOCH` explicit in CI for reproducible,
  byte-stable provenance.

Compose copies validated Site inputs into a digest-keyed snapshot inside the managed build cache before building. The source Site is checked again before publishing, and an unsuccessful build retains the previous output.

### Ready-made CI: the reusable `site-ci` workflow

The two-checkout pattern ships as `.github/workflows/site-ci.yml` in Core. GitHub
`dev` may lag CNB `dev`, so the workflow must exist at the GitHub ref named in
`uses`. The GitHub cross-repository call was [validated on a non-production ref](https://github.com/Skyline-Gazer/Test-Site/actions/runs/41836937453).
Pin the same published Core SHA in `uses` and `core_ref`:

```yaml
on: workflow_dispatch
jobs:
  validate:
    uses: Skyline-Gazer/ALNILAM/.github/workflows/site-ci.yml@<published-core-commit-sha>
    with:
      core_ref: <published-core-commit-sha> # same SHA as uses
      site_repository: you/your-site     # your Site repository
      site_ref: <full commit SHA>        # pin an exact Site commit
      site_url: https://you.example.com/ # where the Site will be served
    secrets:
      site_token: ${{ secrets.SITE_TOKEN }}
```

It runs the Core contract tests, validates your Site against the YAML-only v2
contract, composes it (root base, plus your `site_url` base when different),
runs artifact budgets, asserts `alnilam-provenance.json` binds `site.ref` to
the exact SHA you asked for, and uploads the composed output for inspection.
The workflow uses `contents: read` and disables persisted checkout credentials.
A reusable workflow runs on the caller’s chosen event, including pull requests;
do not pass the Site token from pull-request jobs; configure the caller to run
this job only on trusted events and refs (for example, `workflow_dispatch` or
a push to a protected branch). Use a
fine-grained token with `contents: read` scoped to your Site repository alone.
For a direct dispatch, configure `site_token` as a secret in the Core repository.

When the caller is the public Site repository itself, its `GITHUB_TOKEN` with
`contents: read` can be passed as `site_token`; the linked validation run used
that configuration. Private or cross-repository Sites require an appropriately
scoped read-only credential.

The reusable workflow must be available at the referenced Core ref before a
Site can invoke it.

### Static publishing (multi-host)

The composed `dist/` directory is a self-contained static bundle — any static
file host works. Supported in detail:

| Host | Base | Notes |
| --- | --- | --- |
| GitHub Pages project page | `https://<org>.github.io/<repo>/` | subpath; set `site_url` accordingly, add `.nojekyll` |
| GitHub Pages user/org page or custom domain | `https://<your-domain>/` | root base |
| Any static host (nginx, Netlify, Cloudflare Pages…) | your choice | copy `dist/` as-is |

The owner-gated `deploy` workflow (`.github/workflows/deploy.yml`) publishes to
GitHub Pages with `deploy_base: subpath | root`, and can publish an external
Site (`site_repository` + `site_ref`) after running the same contract tests and
provenance binding checks. It only ever runs via `workflow_dispatch` against the
protected `github-pages` environment — production publishing remains an explicit
owner action and is never triggered by pushes or pull requests.
