# External Site onboarding

An ALNILAM **Site** is an independent directory (usually its own Git repository) that owns
your content, configuration and assets. Core never writes into it, fetches it, or checks
it out — you pin the Site revision yourself.

## Site layout (schema v1 — frozen)

```
yoursite/
├── alnilam.config.toml      # required — site configuration
├── content/posts/           # required — Markdown/MDX posts
├── assets/                  # optional — copied verbatim to /site-assets/ in output
└── data/                    # optional — reserved, not yet read
```

### `alnilam.config.toml` (schema v1)

```toml
schemaVersion = 1            # optional; only 1 is supported. Old Core + new Site fails closed.

[site]
title = "My Blog"            # required, non-empty
description = "About this blog"
url = "https://blog.example.com"   # required, absolute http(s) URL
locale = "zh-CN"             # optional, default zh-CN

[theme]
appearance = "dark"          # "dark" | "light", default dark
```

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

Covers and in-post images are **Site-owned and served as-is** — ALNILAM does not
re-encode, resize, or fetch them at build time. This keeps the build deterministic
and offline: an image referenced with an absolute path (`/site-assets/...`) must
exist under your Site's `assets/` directory; remote `http(s)` image URLs are
rendered as plain `<img>` without any build-time download. Authors should ship
appropriately sized images; the platform guarantees CLS-safe markup by always
emitting explicit `width`/`height` on generated cover `<img>` tags.

## Optional modules (opt-in via config)

Both modules are feature-flagged: **disabled modules ship nothing** — no page, no 404 stub, no client JS, no third-party requests.

### Comments (`[comments]`)

```toml
[comments]
enabled = true
provider = "giscus"            # only provider
repo = "you/your-repo"         # public GitHub repo hosting Discussions
repoId = "R_..."               # from giscus.app
category = "Announcements"
categoryId = "DIC_..."
# mapping = "pathname"         # optional: pathname | specific | number
```

Renders on post pages as a lazy `client:visible` island; the giscus script loads only after the section scrolls into view. Requires GitHub Discussions on the repo. Theme (dark/light) and language follow your Site config.

### Bangumi (`[bangumi]`)

```toml
[bangumi]
enabled = true
userId = "your-bgm-name"
subjectType = "anime"          # anime | book | music | game
limit = 10                     # 1–50
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
4. Writes `alnilam-provenance.json` (Core revision, Site SHA-256 digest) into the output.

An output from Core revision X is reproducible from the same Site digest; bind both in
your deployment configuration and fail closed if they drift.

## Core upgrade / rollback workflow

1. Check out the target Core revision in its own directory (`git worktree` or a second clone).
2. Run `compose` against the **same unchanged Site directory**.
3. Verify `alnilam-provenance.json` in the new output: the Site digest must match the previous build's.
4. Swap the served output directory; rollback = rebuild with the previous Core revision.

The Site's Git ref is never touched by any of these steps.

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
