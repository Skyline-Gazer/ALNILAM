# Pages CMS — offline authoring PoC (Issue #88)

Status: **PoC verified offline.** Not integrated, not deployed, not in production.
This document records what the isolated proof of concept actually proves, and
what still needs Owner authorization. It is a pilot record, not a provider
selection or a product commitment.

## Scope and architectural decision

Issue #88 asks for a Git-based content editor similar to
[Pages CMS](https://pagescms.org). The Owner's boundary is explicit: no GitHub
App installation, no widened permissions, no self-hosted services, no changes to
a real Site, no production publishing, and no change of Git provider without
authorization. The PoC therefore stays offline and uses only an isolated fixture
Site and existing test resources.

- Core remains the Astro static renderer/builder. **No Core runtime code, Site
  config schema or published output changes.** The editor is an optional Site
  authoring adapter, not a Core service or a second content authority.
- Site config stays YAML-only (`alnilam.config.yaml`, schema v2). The editor's
  `.pages.yml` lives in the Site root and is deliberately outside the four
  inputs compose snapshots and hashes (`alnilam.config.yaml`, `content/`,
  `assets/`, `data/`). Adding, editing or removing it changes neither the build
  nor `alnilam-provenance.json`.
- MDX is edited through a source (`code`) field, not a WYSIWYG rich-text field,
  so JSX, expressions and fenced code are never reinterpreted.
- `settings.content.merge: true` is mandatory. Pages CMS defaults to
  `merge: false`, which rewrites a post from the editor schema only and silently
  drops undeclared frontmatter keys; the PoC adapter refuses that write mode.

## Delivered

| Path | Role |
| --- | --- |
| `tests/fixtures/pages-cms-site/.pages.yml` | Site-owned Pages CMS editor schema: media source, `content/posts` collection, all post frontmatter fields, `body` source field, `operations.delete: false`, `merge: true`. |
| `tests/fixtures/pages-cms-site/` | Disposable independent Site: schema v2 config, one Markdown post and one MDX post (both with undeclared frontmatter keys), one Site asset and one post-relative image. No third-party media. |
| `scripts/pages-cms.mjs` | Offline adapter CLI (`verify`, `edit`, `init`). Parses frontmatter as a YAML document, edits declared fields in place, re-serializes without touching the body, and generates the editor schema from the Site taxonomy. Writes are confined to the Site's `content/posts/`. No Core changes, no new dependency. |
| `scripts/pages-cms.schema.yml` | The single schema template `init` renders (`{{CATEGORY_FIELD}}` is replaced by a select with the Site's categories, or a free-text field when the Site declares none). |
| `scripts/tests/pages-cms.test.mjs` | Field mapping, roundtrip, dual-base compose, CMS-removal and fail-closed tests. |

## What is verified (offline)

| Requirement | Evidence |
| --- | --- |
| Independent Site `.pages.yml` example | Fixture config parses with the Pages CMS schema shape (`media`, `content`, `settings`, `actions`); collection path `content/posts`, format `yaml-frontmatter`. |
| `scripts/pages-cms.mjs` | Offline adapter CLI: `verify` (mapping, required fields, media paths, category drift), `edit` (declared-field write-back that preserves comments, unknown keys and body bytes), `init` (generate `.pages.yml` from the Site taxonomy). No Core changes, no new dependency. |
| Unknown frontmatter fields | `author`, `editorialNote`, nested `cmsMeta` and `mdxOnly` survive an edit with their values and a YAML comment. With `merge: false` the same edit drops all three — the exact data-loss mode the PoC guards against. |
| Markdown / MDX content roundtrip | The post body is byte-identical before and after the edit for both `.md` and `.mdx`; MDX JSX (`data-pages-cms-mdx`) and `{1 + 1}` still render as `计算结果：2` in the composed HTML. Off-schema edit keys are rejected. |
| Markdown and media path compatibility | `/site-assets/cms-mark.svg` resolves to `/site-assets/...` at root and `/ALNILAM/site-assets/...` under the subpath; the post-relative `./cms-local.svg` is emitted under `/_astro/` (base-prefixed on the subpath). `artifact-check.mjs` and `seo-check.mjs` pass on both builds. |
| Root and `/ALNILAM/` builds | Three composes (with CMS at root, with CMS at `/ALNILAM/`, without CMS at root) all succeed; canonical links and provenance digests are base-correct. |
| CMS disabled / removed | Removing `.pages.yml`, or appending to it, leaves `validateSiteRoot().digest` unchanged; the CMS-free build emits the same article and media and the same `site.digest` in provenance. The editor config never appears in the output. |
| Site immutability | Site digest is re-checked after all composes; no `.pages.yml`, adapter or cache file is written into the Site by the build. |

Generate the editor schema for a real Site (categories and tags come from
`alnilam.config.yaml` plus optional `data/taxonomy.yaml`; an existing file is
only replaced with `--force`):

```sh
node scripts/pages-cms.mjs init --site /path/to/site
node scripts/pages-cms.mjs verify --site /path/to/site
node --test --test-concurrency=1 scripts/tests/pages-cms.test.mjs
```

## Provider status

| Provider | Status | Reason |
| --- | --- | --- |
| Pages CMS (offline authoring compatibility) | **PoC VERIFIED** | Config shape, field mapping, merge behavior, MDX/Markdown roundtrip and dual-base builds are exercised locally. |
| Pages CMS hosted service / GitHub App | **OWNER_PENDING** | No GitHub App was installed, no repository permission or webhook was granted, and no hosted editor session or screenshot exists. |
| Decap CMS editorial-workflow PR review | **NOT EVALUATED** | A written provider comparison needs a live trial; not part of this offline PoC. |
| Keystatic / native Astro integration | **NOT EVALUATED** | Same; would add invasive Core hooks and was not authorized. |
| Self-hosted CMS v2 | **OUT OF SCOPE** | Requires PostgreSQL, HTTPS, a GitHub App and webhooks; must not be described as "no DB". |

## Known limitations

- The adapter models a single write-back locally; concurrent edits, conflict
  handling, rollback, private test repositories and rejection of real deletes
  are not exercised. `operations.delete: false` is a configuration guard only.
- Pages CMS `select` cannot source categories dynamically. `init` generates the
  values from the Site taxonomy, and `verify` fails when a post uses a category
  the select cannot represent (`selectDrift`). Regenerate after taxonomy changes.
- New entries are created as `.md` via the collection filename template. MDX
  files can be edited but must be created through the source path; there is no
  WYSIWYG support for MDX.
- The YAML serializer preserves keys, values, comments and order, but may
  normalize quoting/whitespace inside frontmatter. No field is dropped and the
  body is never rewritten. Frontmatter must be delimited by lines containing
  exactly `---`; a block scalar containing such a line is out of scope.
- An escaped inline-code fragment containing `href="..."` can be read as an
  internal link by `seo-check.mjs`; the fixture avoids that spelling. This is a
  pre-existing crawler behavior, not a CMS effect.

## Owner-authorized steps still required

1. Install the Pages CMS GitHub App on a disposable/approved Site repository and
   review the actual Administration / Actions / Contents permissions and consent.
2. Trial the hosted editor (create, edit, media upload, branch selection, PR /
   editorial workflow, accidental-delete rejection) with browser screenshots.
3. Produce the written Decap / Keystatic comparison and decide whether a
   provider-neutral workflow is needed.
4. Verify a real external Site's hash before/after the builder, Core/Site SHA
   provenance, concurrent edits and rollback.
5. Keep `SITE_ONBOARDING` and the ADR accurate; only then consider a separately
   authorized integration. No production release is implied by this PoC.
