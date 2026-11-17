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

- Core remains the Astro static renderer/builder. PR #161 added the optional
  Site-owned `content/pages/` collection. This branch also fixes its locale
  routing: published page locales receive shared empty listing routes and omit
  RSS discovery until the locale publishes posts.
- The CMS remains an optional authoring adapter, not a Core service or a second
  content authority.
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
| `tests/fixtures/pages-cms-site/.pages.yml` | Site-owned editor schema for `content/posts` and `content/pages`; post and static-page fields, source editing, `operations.delete: false`, `merge: true`. |
| `tests/fixtures/pages-cms-site/` | Disposable independent Site with Markdown/MDX posts and default/en/ja pages, nested and draft pages, page-only taxonomy metadata, undeclared frontmatter, Site and collection-relative media. |
| `scripts/pages-cms.mjs` | Offline adapter CLI (`verify`, `create`, `edit`, `init`). `verify` maps both collections; write CLI commands remain confined to posts/config. `applyEdit` requires fields from an explicitly selected collection. |
| `scripts/pages-cms.schema.yml` | `init` template for both collections; post category choices come from Site taxonomy, page category metadata stays free text. |
| `scripts/tests/pages-cms.test.mjs` | Explicit field selection, frontmatter/MDX preservation, dual-base page routes, page-only locale navigation and RSS omission, Pagefind markers, metadata isolation, media boundaries and full Site-tree immutability. |

## What is verified (offline)

| Requirement | Evidence |
| --- | --- |
| Independent Site `.pages.yml` example | Both collection paths parse as `yaml-frontmatter`; page and post deletion are disabled and `settings.content.merge: true` is required. |
| Offline adapter | `verify` reports post and page fields, required keys, media paths and post category drift. `create` and CLI `edit` remain posts-only; the roundtrip helper accepts only an explicit collection field list. |
| Explicit local branch selection | Tests use a temporary Git checkout on `cms-poc`; `create`, `edit` and `init` reject a mismatched `--expect-branch` before writing. Remote branch protection and publishing are not exercised. |
| Unknown frontmatter | Post `author`, `editorialNote`, nested `cmsMeta`, page `editorialNote` and MDX metadata survive selected-field edits. `merge: false` reproduces the documented loss and is refused by the CLI. |
| Markdown / MDX roundtrip | Markdown and MDX bodies remain byte-identical for posts and pages; JSX and `{1 + 1}` continue to render. Edits without selected collection fields and off-schema keys fail. |
| Static page output | Default, English and Japanese routes, nested slugs, draft exclusion, canonical/hreflang links, sitemap entries and Pagefind searchable-body markup are checked in root and `/ALNILAM/` builds. Page-only locales get valid empty navigation targets and omit RSS discovery without publishing empty locale feeds. |
| Metadata and media isolation | Page-only category/tag values do not appear in post taxonomies, archives or RSS. `/site-assets/...` and page-relative images resolve; references escaping `content/pages` fail verification. |
| Site immutability | Every regular-file digest and path, including `.pages.yml`, is compared before and after each compose. Provenance continues to use the same Core/Site digest. |
| CMS disabled / removed | Removing or editing `.pages.yml` does not change the Site input digest. Static pages still build without the editor config; the config never enters published output. |

Generate the editor schema for a real Site (post categories and tags come from
`alnilam.config.yaml` plus optional `data/taxonomy.yaml`; an existing file is
only replaced with `--force`):

```sh
node scripts/pages-cms.mjs init --site /path/to/site
node scripts/pages-cms.mjs verify --site /path/to/site
node scripts/pages-cms.mjs create --site /tmp/pages-cms-site --file new-post.md \
  --set '{"title":"New post","pubDate":"2026-11-12"}' --body /path/to/body.md
node --test --test-concurrency=1 scripts/tests/pages-cms.test.mjs
```

The local `edit --post ...` command intentionally writes only `content/posts`;
the Pages CMS page collection is schema-mapped and its field roundtrip is
exercised with an explicitly selected field list. For a reproducible
Git-checkout example, copy the fixture to a temporary path outside this repo
and follow `tests/fixtures/pages-cms-site/README.md`. Hosted Pages CMS
permissions, remote branch rules and PR creation remain unverified.

## Provider status

| Provider | Status | Evidence |
| --- | --- | --- |
| Pages CMS offline authoring compatibility | **PoC VERIFIED** | Config shape, field mapping, merge behavior, Markdown/MDX roundtrip and dual-base builds are exercised locally. |
| Pages CMS hosted service / GitHub App | **OWNER_PENDING** | No GitHub App, repository permission, webhook, hosted editor session or screenshot was used. |
| Decap CMS editorial workflow | **DOCS REVIEWED; NOT TRIALED** | Official docs describe branch-based drafts and PR review; hosted permissions and behavior remain unverified. |
| Keystatic / Astro integration | **DOCS REVIEWED; NOT TRIALED** | Official docs describe an Astro integration and a server adapter for deployed editor use; no integration was installed. |
| Self-hosted CMS v2 | **OUT OF SCOPE** | Requires PostgreSQL, HTTPS, a GitHub App and webhooks; must not be described as "no DB". |

## Provider comparison (official documentation only)

| Provider | Fit for ALNILAM's separate Site repository | Trade-off and evidence |
| --- | --- | --- |
| Pages CMS | Closest to the current PoC: `.pages.yml` can map Site-owned Markdown collections without adding a Core runtime. `settings.content.merge: true` preserves fields outside the editor schema. | The documented GitHub App asks for Administration, Actions and Contents read/write permissions plus webhooks. This needs Owner review; hosted PR/review behavior was not tested. [Settings](https://pagescms.org/docs/configuration/settings/) · [GitHub App](https://pagescms.org/docs/guides/installing/github-app/) |
| Decap CMS | Its documented `editorial_workflow` saves drafts on a branch, opens a pull request, and merges on approval. This is the clearest documented review gate. | Requires a hosted workflow and separate permission/configuration evaluation. The PoC did not install or trial it. [Editorial workflows](https://decapcms.org/docs/editorial-workflows/) |
| Keystatic | Offers schema-driven authoring with an Astro integration. | The documented Astro setup adds Keystatic packages and an Astro config integration; its deployment guide calls for an Astro server adapter for the editor. This couples the authoring UI more closely to Core's Astro app. No integration was tested. [Astro installation](https://keystatic.com/docs/installation-astro) |

This documentation review does not select a provider. Pages CMS remains the
offline PoC candidate; hosted behavior and permission review are still pending.

## Known limitations

- The adapter models local write-back; concurrent edits, conflicts, rollback,
  private test repositories and actual hosted delete rejection are not
  exercised. `operations.delete: false` is configuration evidence only.
- `--expect-branch` checks the selected local branch only; it does not inspect
  remote branch protection or create a commit/PR.
- Pages CMS category selects are generated from the Site taxonomy for posts;
  static-page category metadata is free text and does not join post taxonomy.
- The local CLI creates and edits posts only. Static pages are mapped in the
  Pages CMS schema and tested through the explicitly selected field roundtrip;
  hosted editor behavior remains unverified.
- New entries use `.md`; MDX must be edited through source. There is no
  WYSIWYG path for MDX.
- The YAML serializer preserves keys, values, comments and order, but may
  normalize frontmatter quoting/whitespace. Bodies remain byte-identical.
  Frontmatter must use exact `---` delimiter lines; block-scalar delimiter
  collisions remain out of scope.
- An escaped inline-code fragment containing `href="..."` can be read as an
  internal link by `seo-check.mjs`; the fixture avoids that spelling. This is a
  pre-existing crawler behavior, not a CMS effect.

## Owner-authorized steps still required

1. Install the Pages CMS GitHub App on a disposable/approved Site repository and
   review the actual Administration / Actions / Contents permissions and consent.
2. Trial the hosted editor (create, edit, media upload, branch selection, PR /
   editorial workflow, accidental-delete rejection) with browser screenshots.
3. Decide whether to authorize a Decap or Keystatic live trial; this docs-only
   comparison does not select a provider.
4. Verify a real external Site's hash before/after the builder, Core/Site SHA
   provenance, concurrent edits and rollback.
5. Keep `SITE_ONBOARDING` and the ADR accurate; only then consider a separately
   authorized integration. No production release is implied by this PoC.
