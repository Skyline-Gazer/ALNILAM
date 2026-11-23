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

## Create a Site v2

Save this at the Site root, beside `content/posts/`:

<pre><code>schemaVersion: 2
site: { title: "Field Notes", description: "Reading notes", url: "https://blog.example.org", locale: "zh-CN" }
locales: ["zh-CN", "en", "ja"]
</code></pre>

Only `schemaVersion: 2` is supported. See the authoritative [Site Onboarding guide](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md).

## Publish a post at a stable URL

This frontmatter describes a published post; categories and tags must be declared by the Site:

<pre><code>---
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

Compose outside the Site, then repeat with the subpath URL: `ALNILAM_SITE_URL=https://blog.example.org/ pnpm compose --site ./my-site --out ./dist/root` and `https://blog.example.org/ALNILAM/`. Check both outputs' links. This guide is pinned in every language and uses the Demo's declared taxonomy. Continue with [Markdown and MDX](../markdown-and-mdx/).
