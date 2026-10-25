---
title: "Getting started with ALNILAM"
description: "A second article showing multilingual content organization."
pubDate: 2026-10-26
tags: ["Guide"]
lang: "en"
translationKey: "getting-started"
---

ALNILAM splits **what you write** (Site) from **the software that renders it** (Core).

## Your first Site

1. Create a directory with `alnilam.config.toml` and `content/posts/`.
2. Write Markdown or MDX posts with `title`, `description`, `pubDate` frontmatter.
3. Compose: `node scripts/compose.mjs --site /path/to/site --out dist/`.

## Translations

Add `lang` and `translationKey` to your frontmatter. Posts sharing a
`translationKey` get automatic `hreflang` alternates. Non-default-locale posts
are served under `/posts/<lang>/<slug>/`.
