# External Site onboarding

An ALNILAM **Site** is an independent directory (usually its own Git repository) that owns
your content, configuration and assets. Core never writes into it, fetches it, or checks
it out — you pin the Site revision yourself.

This guide covers the current YAML v2 contract. For the published TOML v1
contract, see the [v0.1.3 Site layout](https://github.com/Skyline-Gazer/ALNILAM/blob/v0.1.3/docs/SITE_ONBOARDING.md#site-layout-schema-v1--frozen).

## Site layout (schema v2 — frozen)

```
yoursite/
├── alnilam.config.yaml      # required — site configuration
├── content/posts/           # required — Markdown/MDX posts
├── content/pages/           # optional — Site-authored Markdown/MDX pages
├── assets/                  # optional — copied verbatim to /site-assets/ in output
└── data/                     # optional — Site data such as taxonomy.yaml and albums.yaml
```

### `alnilam.config.yaml` (schema v2)

```yaml site-config
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

gallery:
  enabled: false             # default false; enable only when this Site owns albums.yaml
```

Unknown top-level or nested keys fail the build, and so do malformed YAML, duplicate
keys, unresolved YAML tags and non-plain YAML values. The `gallery`, `moments`, `comments`,
`bangumi` and `llms` module blocks are documented below. Omit keys your target Core does not yet
know — an older Core fails closed on unknown fields even when the current Core accepts
them.

**Routing:** `routing` is accepted and validated. `routing.prefixDefaultLocale`
controls whether default-locale Gallery and Moments routes include the locale
prefix; post and taxonomy routes retain their existing URL policy. Categories and
tags are Site-owned catalogs; tag pages also use post frontmatter.

### Posts and slugs

- Place posts under `content/posts/*.md` (or `.mdx`). Frontmatter schema:
  `title` (required), `description`, `pubDate` (required date), `updatedDate`,
  `cover` (path), `tags`, `draft`, `lang` (optional BCP-47),
  `translationKey` (optional, groups translations for hreflang),
  `commentId` (optional, explicit stable Giscus thread term; no whitespace).
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

#### Locale listings

Every listing surface is scoped to one locale's corpus: `/`, `/posts/`, `/archives/`,
`/categories/`, `/tags/` and the taxonomy detail routes list only posts whose resolved `lang`
equals the **default** locale, while `/<lang>/…` lists only that locale's posts. Resolved `lang` is
the frontmatter `lang` value, falling back to `site.locale` when absent — the file path never
decides it. Per-locale RSS feeds and Pagefind (whose index is sliced by each page's `<html lang>`)
already behaved this way, so a page, its feed and its search results now agree.

- A translation is reachable through its article URL, `hreflang` alternates, the language switch and
  its own locale listing — never inside another locale's list.
- Listing counts and pagination boundaries are per locale; a locale with no post in a category or
  tag gets no route for it, rather than an empty page.
- A post whose `lang` is not listed in `locales` keeps its article URL but appears in no listing,
  taxonomy route or feed; add the locale if you want it listed.
- Series pages stay corpus-wide in this release and are localized by a follow-up change.

#### Post visibility

`draft`, `private` and `unlisted` are build-time exclusions: the post publishes
no HTML article and no LLM Markdown view, and does not appear in indexes,
feeds, sitemaps or listings. Do not put secrets or confidential material in a
Site relying on `noindex`.

### Static pages

Add optional Site-authored pages under `content/pages/` as `.md` or `.mdx` files.
Each page requires `title`; optional fields are `description`, `pubDate`,
`updatedDate`, `cover`, `category`, `tags`, `draft`, `lang` and
`translationKey`. Dates, cover images and article metadata follow the post
frontmatter rules; page categories and tags do not create taxonomy entries. The
body uses the same Shirone Markdown rendering as posts.

The file path is the stable slug without its extension. For example,
`content/pages/about.md` is served at `/pages/about/`, while
`content/pages/guide/start.md` is served at `/pages/guide/start/`. A page in a
non-default locale uses `content/pages/<lang>/...` and a matching `lang` value;
`content/pages/en/about.md` becomes `/en/pages/about/`. Default-locale pages keep
the unprefixed route. All links and canonicals include the configured deployment
base on subpath hosts.

`draft: true` pages emit no route or sitemap entry. Pages sharing a
`translationKey` receive `hreflang` links only for the published translations
that exist; `x-default` is emitted only when the group includes the default
locale. There is no automatic page index or navigation link. Link to a page from
other content using its published URL; root-relative links must include the
configured deployment base on subpath hosts.


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

Derived build state lives under `<repo>/.cache/alnilam` by default, overridable with
`ALNILAM_CACHE_DIR`. The root carries `.alnilam-cache-owner.json`. On first use,
ALNILAM creates that marker only when no managed `v1`, `bangumi` or `shirone` namespace
exists; unmarked cache namespaces fail closed. Unrelated sibling files are preserved.
The Site snapshot and Astro content/image state are keyed by Core revision and Site
digest; Vite's dependency cache is keyed by Core revision. Shirone's compiled bundle
manifests are keyed by Core compiler inputs, while immutable SHA-256 objects are shared
across inputs when their output bytes match. GC preserves objects referenced by retained
manifests. Bangumi snapshots are scoped by user ID, subject type and limit. Keep the
cache outside your Site.

Normal Compose never recursively deletes project-local legacy directories.
`node scripts/compose.mjs --clean-cache` removes only the verified managed cache,
and refuses active builds, symlinks, hard links and nested filesystem boundaries.
`node scripts/compose.mjs --gc-cache --dry-run` reports proposed TTL/size eviction;
`--gc-cache` applies a 14-day unused TTL and 2 GiB allocated-size cap. Set
`ALNILAM_CACHE_TTL_DAYS` or `ALNILAM_CACHE_MAX_BYTES` to override these limits.
`node scripts/compose.mjs --clean-legacy --dry-run` lists allowlisted legacy paths,
types and estimated space. `--clean-legacy` removes empty allowlisted directories;
it preserves files and directories whose contents do not have verified ownership.

## Optional modules (opt-in via config)

Optional modules are feature-flagged: **disabled modules ship nothing** — no page, no 404 stub, no client JS, no third-party requests.

### Gallery (`gallery`)

Gallery is off by default. When enabled, Core emits `/albums/` and one detail route per album, adds the navigation link, and loads the Shirone Gallery components. It also emits localized index/detail routes for each configured locale with a URL prefix, respecting `routing.prefixDefaultLocale`. When disabled, the build emits no Gallery route, Gallery-specific client module or Gallery image requests.

The Site owns `data/albums.yaml` (schemaVersion 1). Missing data is an empty album list; `photos: []` is a valid empty album. Each album requires a URL-safe `id`, a `title` and a `photos` array; `description`, `cover`, `date`, `location`, `tags`, `layout` (`grid` or `masonry`) and `columns` (2–4) are optional. A cover may be omitted. Each photo requires `src` and descriptive `alt`; `thumbnail`, `title`, `description`, `tags`, `date`, `location`, and paired positive `width`/`height` are optional. Cards reserve a 4:3 cover box; gallery photos without dimensions reserve a 4:3 tile.

```yaml
# alnilam.config.yaml
gallery:
  enabled: true

# data/albums.yaml
schemaVersion: 1
albums:
  - id: coast
    title: Coast
    description: A Site-owned album.
    cover: gallery/coast-thumb.jpg
    photos:
      - src: gallery/coast-full.jpg
        thumbnail: gallery/coast-thumb.jpg
        alt: Coast at sunset
        width: 2400
        height: 1600
      - src: https://images.example.org/signed/photo.jpg?signature=...
        alt: A remotely hosted photo
  - id: empty
    title: Empty album
    photos: []
```

Relative media paths resolve under the Site's `assets/` directory and are emitted under `/site-assets/`; `assets/gallery/photo.jpg` and `gallery/photo.jpg` both work. Root-relative paths such as `/site-assets/gallery/photo.jpg` and complete HTTPS URLs are also accepted. HTTPS queries and signatures are preserved. Core never downloads remote media during build, proxies images, or makes cross-origin pixel reads; ordinary browser image loading does not require CORS. The browser host must allow the remote image URL in its own CSP, if configured. No additional request is made to measure dimensions during build. Supplying `width` and `height` also lets PhotoSwipe avoid its on-open size probe; without them, the existing PhotoSwipe handler measures only when the viewer opens.

Use media you have rights to publish. The Demo Site's remote samples are served by Unsplash under the [Unsplash License](https://unsplash.com/license); they are referenced by URL and are not copied into ALNILAM.

### Moments (`moments`)

Moments is off by default. Set `moments.enabled: true` to emit the `/moments/`
timeline, localized routes for configured non-default locales, its navigation
link and its interactive image viewer. When `routing.prefixDefaultLocale` is
true, every configured locale, including the default locale, uses a prefixed
Moments route. With Moments disabled, its content collection loads no entries
and the build emits no Moments route or navigation link.

Each entry is a Markdown file under `content/moments/`. Its frontmatter accepts
`published` (required date), `draft` and `pinned` (booleans), `location` and
`mood` (string), `tags` (string list), and `images` (list of
`{ src, alt, thumbnail, width, height }`). The body uses the Site Markdown
renderer. Drafts are omitted from production output. Image paths may be Site-relative
(`assets/photo.jpg` or `photo.jpg`), `/site-assets/...`, or absolute HTTPS URLs; external images are
never downloaded by Core. `thumbnail` is optional and is used for the timeline
tile while `src` remains the original image in the viewer. `width` and `height`
are an optional pair; absent values reserve a 4:3 ratio. The timeline shows eight
entries initially and reveals the next eight on request; filters and search
operate on the build-time dataset without a runtime data service.

### Comments (`[comments]`)

Comments are **off by default** and intentionally support one provider for the
first launch: Giscus over public GitHub Discussions. Twikoo/Waline are not
configured here; they require separately operated backends and are post-launch
evaluations, not alternate values for this block.

```yaml
comments:
  enabled: true
  provider: "giscus"            # only provider in this release
  repo: "you/your-repo"         # public GitHub repo hosting Discussions
  repoId: "R_..."               # from giscus.app
  category: "Announcements"
  categoryId: "DIC_..."
  mapping: "specific"           # required when enabled: specific | pathname | number
  sharing: "translation"        # translation | locale
  load: "click"                 # click | visible
  lang: "auto"                  # auto | giscus/BCP-47 locale
  csp: true                     # emit the provider-scoped CSP meta tag
```

All fields are public identifiers. Unknown keys and secret-looking fields
(`token`, `accessToken`, `webhookSecret`, …) fail the build; never put a GitHub
App private key, webhook secret or personal access token in a Site.

Enabled comments require an explicit `mapping`. For an existing v2 Site whose
enabled comments omitted it, add `mapping: pathname` to retain its existing
URL-based Discussions. Choose `mapping: specific` for new threads; changing an
existing Site to `specific` creates different threads and does not migrate
comment data. A missing mapping fails the build until you choose.

#### Stable identity and translation policy

- `mapping: specific` sends an explicit Giscus `data-term` instead of using the
  browser URL. The term is derived at build time from, in order:
  frontmatter `commentId`, frontmatter `translationKey`
  (`alnilam:translation:<key>`), or the Site content id
  (`alnilam:content:<path-without-extension>`).
- `sharing: translation` (default) makes every translated page that shares a
  `translationKey`/`commentId` use one Discussion. `sharing: locale` appends
  `::<page-locale>` so each translation has a separate thread. This is the
  explicit per-translation sharing/partition policy; it does not guess from the
  URL prefix.
- Use `commentId` when a file or public slug may be renamed but its Discussion
  must stay the same. A `commentId` must not contain whitespace and is limited
  to 200 characters.
- `mapping: number` requires a numeric `commentId` and
  `sharing: translation`; otherwise the build fails with an actionable message.
- `mapping: pathname` maps by the browser URL, so `/ALNILAM/`, locale prefixes
  and future permalink renames create different discussions.

#### Privacy, loading and failure behavior

- With `comments.enabled: false` the output contains no comment component, no
  giscus script/iframe, no placeholder and no client island — zero comment JS
  and zero comment network requests.
- With comments enabled, the page shows a distinct third-party disclosure. The
  default `load: click` renders a button and makes **no** third-party request
  until the reader activates it. `load: visible` loads the provider when the
  section nears the viewport; that is still an enabled-provider request, so do
  not claim zero third-party traffic for it.
- The mounted container reserves height so late iframe creation does not move
  the article above it. One provider instance owns the script, iframe, theme
  listener and observer; failure, retry and unmount remove the mount node, so
  a late iframe cannot appear in the failed comment area.
- If the script is blocked or no iframe appears within 15 seconds, the article
  and navigation remain usable and the comment area offers a non-blocking retry
  plus a grounded link to the repository's GitHub Discussions.
- When `csp: true`, comment-enabled articles emit a `Content-Security-Policy`
  meta tag. `script-src`, `style-src`, `connect-src` and `frame-src` allow the
  Giscus origin; `style-src` permits the stylesheet loaded by the Giscus client,
  and `connect-src` also allows `https://api.github.com` for GitHub repository
  cards. `script-src` includes `'wasm-unsafe-eval'` for
  Pagefind WASM search; `frame-src` adds the supported Markdown player origins
  (YouTube nocookie, Bilibili, AcFun); and `media-src` allows `'self' https:`
  for author `<video>`/`<audio>`. Hosting-level CSP may extend this with
  `frame-ancestors`, which `meta` cannot enforce. Comments disabled = no
  giscus CSP allowance.

Requires GitHub Discussions on the public repo and a Giscus configuration from
<https://giscus.app>. Theme updates follow the Site's dark/light switch; the
language follows the article locale unless `comments.lang` overrides it.

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

Install dependencies in the pinned Core checkout before running Compose. Use
Node.js 22.23.4 or newer and pnpm 10.19.0 for the current Core.

```bash
# From the pinned Core checkout, with pnpm available (corepack enable if needed):
pnpm install --frozen-lockfile

# This build uses the URL in the Site config:
ALNILAM_SITE_URL= \
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
with the same Site digest can still differ if the deployment URL or other build
inputs differ. For a repeatable build, pin the deployment URL, use the Core
lockfile and set `SOURCE_DATE_EPOCH` to a fixed value. Verify the Core revision,
Site ref and Site digest before publishing.
An enabled Bangumi build also depends on the provider response and cached
snapshot. Retain the checked output for byte-identical rollback.

## Core upgrade / rollback workflow

1. Check out the target Core revision in its own directory (`git worktree` or a
   second clone) and install its dependencies with `pnpm install --frozen-lockfile`.
2. Run `compose` against the **same unchanged Site directory**.
3. Verify that `alnilam-provenance.json` records the intended Core revision and
   Site ref. For a Core-only upgrade, the Site digest must match the previous build's.
4. Publish the checked output. To roll back, restore the previous checked
   artifact or rebuild with the previous Core and the Site revision it supports.
   Across a schema migration, this may require the previous pinned Site revision
   in a separate checkout. Current Core requires YAML v2, and v0.1.3 requires TOML v1.

Automated acceptance (CI and local):

```bash
node scripts/upgrade-check.mjs --old "$OLD_CORE_SHA" --site /absolute/path/to/yoursite
```

The script builds the Site with the current Core, then with `--old` in an isolated
worktree. The Site digest must be identical before, after the upgrade build, and after
the rollback build. Set `OLD_CORE_SHA` to the historical commit SHA. Omit `--site`
to use a throwaway copy of `sites/demo`. The script treats an older Core's
contract rejection (missing TOML, unsupported schema version, or unknown config
fields) as a pass for Site non-mutation. Only a successful old-Core build
verifies that it can rebuild this Site revision. Unexpected build failures fail
the run. Output bytes may differ when Core rendering changes.

The Site's Git ref is never touched by any of these steps.

## Content build security and secrets boundary

- **Secrets never belong in the Site.** `assets/` is copied to the output as-is,
  and values from the Site config and content can appear in generated pages,
  feeds and other public files. Keep credentials in your CI system's secret
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

The two-checkout pattern ships as `.github/workflows/site-ci.yml` in Core. The
workflow must exist at the GitHub ref named in `uses`. The public Test-Site
[validated the reusable workflow on a non-production ref](https://github.com/Skyline-Gazer/Test-Site/actions/runs/41836937453).
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

It runs the Core contract tests, validates the YAML-only v2 Site contract and
composes the Site using its configured URL. If you supply `site_url`, it runs a
second compose using that URL as an override. For a root and subpath matrix,
set a root URL in the Site config and pass the subpath URL as `site_url`. The
workflow runs the artifact checker, verifies the Core revision, Site SHA and
Site digest against the checkouts, and uploads the output for inspection. It
uses `contents: read` and disables persisted checkout credentials.
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

The Test-Site run supplies regression evidence for the workflow. Onboarding
acceptance requires a separate review by a real user with an independently
owned Site. See [issue #81](https://github.com/Skyline-Gazer/ALNILAM/issues/81).

### Static publishing (multi-host)

The directory passed to Compose via `--out` is a self-contained static bundle.
Publish the contents of that directory. Supported in detail:

| Host | Base | Notes |
| --- | --- | --- |
| GitHub Pages project page | `https://<org>.github.io/<repo>/` | subpath; set `site_url` accordingly, add `.nojekyll` |
| GitHub Pages user/org page or custom domain | `https://<your-domain>/` | root base |
| Any static host (nginx, Netlify, Cloudflare Pages…) | your choice | publish the composed output as-is |
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

The publishing workflows also run `scripts/artifact-check.mjs` against the
composed output. Git tracking and `.gitignore` do not filter files copied from
Site `assets/`; the check examines the final tree after composition, including
`dist/site/site-assets/`, and rejects known credential/config names, local
build/test data, backups and symlinks. It reports relative paths and rule names;
it does not print sensitive values or mutate the Site. The single reserved public
example path `docs/examples/.env.example` is allowed only when every non-comment
line is a simple assignment with a bracketed placeholder value, such as
`API_KEY=<your-api-key>`. The checker reads only that bounded example file to
validate placeholder syntax; every other `.env` or `.env.*` path is rejected.
This is not a scan of arbitrary file contents for secrets.

The check runs in GitHub Actions Verify and Site CI, again immediately before
the owner-dispatched Pages artifact upload, and in the repository's Vercel build.
It protects only those wired outputs; GitHub source archives and arbitrary
custom packaging or manual copies are not scanned.

For a local or manually packaged build, run the same check against the exact
output directory before publishing:

```bash
node scripts/artifact-check.mjs /absolute/path/to/output
```

### Optional Git-based editors (PoC)

An optional Git-based editor such as Pages CMS can author posts in the **Site**
repository without changing Core. The editor schema `.pages.yml` belongs in the
Site root; compose snapshots only `alnilam.config.yaml`, `content/`, `assets/`
and `data/`, so adding, editing or removing `.pages.yml` changes neither the
build nor `alnilam-provenance.json`. See the isolated example in
`tests/fixtures/pages-cms-site/` and the offline adapter `scripts/pages-cms.mjs`.
`node scripts/pages-cms.mjs create` and `edit` write only declared frontmatter
fields inside `content/posts/`; `init --site <site>` generates `.pages.yml` from the
Site taxonomy, and `verify` checks field mapping, media paths and category drift
(the editor cannot show a category the schema does not declare).
For a Git checkout, `create`, `edit` and `init` also accept
`--expect-branch <name>` to refuse writes when the current Site branch differs.
This is a local selection check; enforce review and protected-branch policy in
the Git provider separately.

Two rules matter for content safety:

- Set `settings.content.merge: true`. The Pages CMS default `merge: false`
  rewrites a post from the editor schema only and silently drops undeclared
  frontmatter keys.
- Edit MDX through a source/code field, not a WYSIWYG rich-text field, and keep
  field names in sync with the post frontmatter contract above. Absolute
  `/site-assets/...` paths and post-relative `![]()` images are re-based for
  `/ALNILAM/` deployments automatically.

The current evidence is an **offline PoC** (see `docs/pilots/PAGES-CMS-POC.md`):
field mapping, unknown-field and MDX roundtrip, media paths and dual-base builds.
A hosted editor, GitHub App permissions, a real external Site and production
publishing are not exercised and remain separately Owner-authorized work.
