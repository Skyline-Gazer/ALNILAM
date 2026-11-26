---
title: "Getting started with ALNILAM"
description: "Set up Site v2 and publish a first post."
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
pinned: true
lang: "en"
translationKey: "getting-started"
---

Your Site owns its configuration, posts, and images. ALNILAM Core reads them and builds a static website.

Publishing takes three steps:

1. Write `alnilam.config.yaml` at the Site root, declaring the site identity and the enabled locales.
2. Save a Markdown file with frontmatter under `content/posts/`; the file path becomes the public slug.
3. Build the static output with Compose and check the links under both the root path and the `/ALNILAM/` subpath.

## Create a Site v2

Save this at the Site root, beside `content/posts/`:

<pre tabindex="0"><code>schemaVersion: 2
site: { title: "Field Notes", description: "Reading notes", url: "https://blog.example.org", locale: "zh-CN" }
locales: ["zh-CN", "en", "ja"]
</code></pre>

Only `schemaVersion: 2` is supported. See the authoritative [Site Onboarding guide](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md).

## Publish a post at a stable URL

This frontmatter describes a published post. To reuse this example's taxonomy, declare `guide` in `categories` and `alnilam` in `tags` first.

<pre tabindex="0"><code>---
title: "A note beneath the evening sky"
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
lang: "en"
translationKey: "first-note"
---
</code></pre>

Save it as `content/posts/en/first-note.md`; it becomes `/en/posts/first-note/`. The path is the slug, so renaming the file changes its public URL. Give each complete translation its own `lang` and the same `translationKey`; English and Japanese posts live under `content/posts/en/` and `content/posts/ja/`.

## Build and choose visibility

Without an exclusion flag, a post generates a page and appears in public lists, feeds, and the sitemap. `draft: true`, `private: true`, and `unlisted: true` exclude article HTML at build time; they are not access control and cannot protect secrets.

Compose outside the Site into two separate outputs, because Compose replaces the output directory it publishes: `ALNILAM_SITE_URL=https://blog.example.org/ pnpm compose --site ./my-site --out ./dist/root` and then the same command with `--out ./dist/subpath` plus `ALNILAM_SITE_URL=https://blog.example.org/ALNILAM/`. Check both outputs' links. This guide is pinned in every language and uses the Demo's declared taxonomy. Continue with [Markdown and MDX](../markdown-and-mdx/).

## Set up the reading experience

Set `theme.appearance` to `light` or `dark` for a reader’s first visit. Try the appearance switch here and reload to see the browser keep your choice. On narrow screens, the article contents are above the text. On wide screens, find them in the sidebar.

The public Demo leaves Bangumi and comments off. To display a public collection, set `bangumi.userId` in your own [Bangumi configuration](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md#bangumi-bangumi) and check `/bangumi/` after building. For comments, enable Discussions in your own public GitHub repository and follow the [Giscus configuration](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md#comments-comments) for public identifiers and thread mapping. Enable these features as you need them.

Continue with [publishing translations](../internationalization/), [organizing categories and series](../organize-your-blog/), or [searching article text](../pagefind-basics/).
