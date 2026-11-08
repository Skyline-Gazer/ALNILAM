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
keys, unresolved YAML tags and non-plain YAML values. The `comments`, `bangumi` and
`llms` module blocks are documented below. Omit keys your target Core does not yet
know — an older Core fails closed on unknown fields even when the current Core accepts them.

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
  `content/posts/<lang>/` (e.g. `content/posts/en/hello.md` → `/en/posts/hello/`) and
  set frontmatter `lang` + `translationKey` on every member of a translation group.
  Nested source paths remain nested in the article URL. Pages sharing a
  `translationKey` get `hreflang` alternates only for published translations.
  Default-locale posts live directly under `content/posts/` and retain their
  unprefixed `/posts/<slug>/` URLs. Old `/posts/<lang>/<slug>/` URLs serve a
  noindex static page linking to the canonical article; this is not an HTTP redirect.
  All paths include the configured deployment base when hosted under a subpath.

#### Post visibility

`draft`, `private` and `unlisted` are build-time exclusions: the post publishes
no HTML article and no LLM Markdown view, and does not appear in indexes,
feeds, sitemaps or listings. Do not put secrets or confidential material in a
Site relying on `noindex`.


### Images policy

Post covers and absolute `/site-assets/...` images are **Site-owned and served
as-is** — ALNILAM does not re-encode, resize, or fetch them at build time.
For post content, build-time asset work resolves post-relative `![]()` references
(see below). Bangumi covers follow the separate policy described under Bangumi.

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
Vite's dependency cache and Bangumi snapshots and covers) lives in one managed
cache root — `<repo>/.cache/alnilam` by default, overridable with
`ALNILAM_CACHE_DIR`. The Site snapshot and Astro's content/image store are keyed
by Core revision and Site digest; Vite's dependency cache is keyed by Core
revision alone. Bangumi snapshots are scoped by user ID, subject type and limit.
Keep the cache outside your Site; repeated builds never write into your Site.
`node scripts/compose.mjs --clean-cache` removes the whole cache and the
legacy cache directories (`apps/web/.astro`, `apps/web/node_modules/.astro`)
left by earlier versions. Builds of the same Core revision and Site digest
are serialized by a lock in the cache; a lock is released when its build
finishes and stolen when its holder process is gone or after six hours.

## Optional modules (opt-in via config)

Optional modules are feature-flagged: **disabled modules ship nothing** — no page, no 404 stub, no client JS, no third-party requests.

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

Adds `/bangumi/` (nav + footer links appear automatically). A build fetches the
public collection from `api.bgm.tv`, saves a snapshot in the managed cache, and
renders static HTML. No credentials are required or supported. Visitors do not
contact Bangumi for data or images; subject links lead to Bangumi only when
followed. Covers are downloaded at build time, only from Bangumi's HTTPS image
hosts and without credentials or redirects, and emitted as local
`/bangumi-covers/` assets, with the deployment base applied on subpath hosts. A
cover retrieval failure is treated like a provider failure and leaves any prior
snapshot in place.
Publishing those assets redistributes upstream artwork; make sure you can do so.

The configured `subjectType` selects one subject category: book (1), anime (2),
music (3), or game (4). Bangumi's collection `type` is a different field: it
describes the user's status (wish, collected, doing, on hold, or dropped), not
the subject category. This module fetches at most `limit` entries for the chosen
subject category; it is not Firefly's multi-category, paginated or dynamic view.

If the provider (including a cover download) is unavailable or returns malformed
data, the build uses the last valid snapshot for the same user ID, subject type
and limit and indicates that it is stale. Without a matching snapshot, the page
shows an unavailable
message. A successful empty response is valid and replaces the prior snapshot.
Clearing the managed cache also removes this fallback; a fresh build needs the
provider again. Data and covers update only on a subsequent build.

### LLM discovery (`llms`, llmstxt.org v2)

```yaml
llms:
  enabled: false     # default: no LLM files, no discovery links
  full: false        # default: no llms-full.txt aggregate
```

When `enabled`, the build emits `/llms.txt` (site-wide curated index),
`/<locale>/llms.txt` for every non-default locale that publishes at least one
article, and a source-backed Markdown view at each public article's canonical
path, e.g. `/en/posts/guides/deep/index.md`, served as
`text/markdown; charset=utf-8`. Article HTML adds
`<link rel="alternate" type="text/markdown">` and `<link rel="describedby"
type="text/plain">` pointing at the generated files. The views preserve source
headings, code fences, math and Mermaid diagrams, resolve relative images and
article links to absolute canonical URLs, and render MDX component children as
text/link fallbacks rather than stripping them.
Post-relative images, including images beside an `index.md` or `index.mdx`
source, use the same generated image files as the HTML article; relative links
to public Markdown posts also work without a file extension. Unresolvable
relative post links, images, and raw HTML anchors retain their text instead of
pointing to invented files.

Only the public article inventory is exported: drafts, `private: true`,
`unlisted: true`, legacy alias routes, taxonomy pages and disabled locales get
no Markdown view and are absent from the indexes. Set `full: true` to add
`/llms-full.txt`, one aggregated document built from the same public Markdown
views; it is **off by default** because it can be large and its copyright,
provider size-limit and caching policy are deployment decisions. Static Pages
generally cannot attach `Cache-Control: no-store`, and robots rules are not an
access-control boundary; treat all exported content as public.

The root index links each generated locale index; links are absolute and
include the configured deployment base (root or `/ALNILAM/`). This feature is
discoverability support for the community llmstxt.org v2 proposal, not an
official search-ranking signal, and it does not replace HTML, sitemap, robots
or structured data.

## Building

```bash
# From a checkout of ALNILAM (Core):
node scripts/compose.mjs --site /absolute/path/to/yoursite --out /absolute/path/to/output

# Root host vs project-page / subpath base (same Site, separate outputs):
ALNILAM_SITE_URL=https://example.com/ \
  node scripts/compose.mjs --site /absolute/path/to/yoursite --out /absolute/path/to/out-root
ALNILAM_SITE_URL=https://example.com/ALNILAM/ \
  node scripts/compose.mjs --site /absolute/path/to/yoursite --out /absolute/path/to/out-nested
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

Automated acceptance (CI and local):

```bash
node scripts/upgrade-check.mjs --old <historical-core-sha> [--site /absolute/path/to/yoursite]
```

The script builds the Site with the current Core, then with `--old` in an isolated
worktree. The Site digest must be identical before, after the upgrade build, and after
the rollback build. Default `--site` is a throwaway copy of `sites/demo`. Expected
fail-closed outcomes for a Site the old Core cannot yet consume (missing TOML on
pre-YAML Core, unsupported `schemaVersion`, or unknown config fields such as a module
block added later) still count as a passed Site non-mutation check; unexpected build
failures fail the run. Output bytes may differ when Core rendering changed.

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
| Vercel (this repository's preview project) | root | `vercel.json` builds `dist/site` via `pnpm vercel-build`; the script derives the Site URL from `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` so canonical, sitemap, robots and RSS name the deployed host |

The owner-gated `deploy` workflow (`.github/workflows/deploy.yml`) publishes to
GitHub Pages with `deploy_base: subpath | root`, and can publish an external
Site (`site_repository` + `site_ref`) after running the same contract tests and
provenance binding checks. It only ever runs via `workflow_dispatch` against the
protected `github-pages` environment — production publishing remains an explicit
owner action and is never triggered by pushes or pull requests.

Vercel builds serve `dist/site` directly (`outputDirectory` in `vercel.json`).
Set `ALNILAM_SITE_URL` in the project environment to pin a custom domain; the
derived deployment host is used only when it is absent.
