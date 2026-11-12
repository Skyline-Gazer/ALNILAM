# Pages CMS PoC Site (isolated fixture)

This directory is a disposable, independently owned ALNILAM Site used only by
the offline Git-based authoring proof of concept (GitHub Issue #88). It is not
a user's Site, is never published, and contains no third-party media.

- `.pages.yml` is the Site-owned Pages CMS editor schema. Core never reads it.
- `alnilam.config.yaml` is the ordinary schema v2 Site config.
- `content/posts/` holds one Markdown and one MDX post; both carry frontmatter
  keys that are **not** declared in the editor schema, to prove a CMS save does
  not silently drop them.
- `assets/cms-mark.svg` is a Site asset served at `/site-assets/cms-mark.svg`;
  `content/posts/cms-local.svg` is a post-relative image resolved into
  `/_astro/` by the image pipeline.

Run the offline adapter from the repository root:

```sh
node scripts/pages-cms.mjs verify --site tests/fixtures/pages-cms-site
cp -a tests/fixtures/pages-cms-site /tmp/pages-cms-site
node scripts/pages-cms.mjs edit \
  --site /tmp/pages-cms-site \
  --post cms-basics.md \
  --set '{"title":"Edited by the PoC"}'
```

`edit` writes back to the post; `--out` is allowed only inside the Site's
`content/posts/`, so the tool cannot write into another Site or the config.

Compose both deployment bases (the adapter never writes into the fixture during
a build):

```sh
ALNILAM_SITE_URL=https://example.com/ node scripts/compose.mjs \
  --site tests/fixtures/pages-cms-site --out dist/pages-cms
ALNILAM_SITE_URL=https://example.com/ALNILAM/ node scripts/compose.mjs \
  --site tests/fixtures/pages-cms-site --out dist/pages-cms-nested
```

Limits of this PoC: it models the editor's write-back locally. A hosted Pages
CMS instance, its GitHub App permissions, Decap/Keystatic comparisons, a real
external Site repository and production publishing are **not** exercised and
remain Owner-authorized work. MDX is edited through the source path only; a
rich-text/WYSIWYG editor is not used for MDX.
