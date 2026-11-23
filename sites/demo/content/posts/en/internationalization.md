---
title: "Multilingual posts"
description: "Use Site v2 translation groups."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "internationalization"
---

Translations can use different wording, but they should answer the same reader question. This guide has complete Chinese, English, and Japanese versions linked below and in the language selector.

[中文](../../../posts/internationalization/) · [日本語](../../../ja/posts/internationalization/)

## Keep one source file per language

The Site owns the writing. Put a default-locale post directly in `content/posts/`, then place non-default locales in language-named folders. This frontmatter belongs to the English version:

```yaml
title: "Write multilingual posts with ALNILAM"
description: "Organize independent translations in a Site v2 blog."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "internationalization"
```

Save it as `content/posts/en/internationalization.md`; default posts stay in `content/posts/` and other locales use `content/posts/<lang>/`. `lang` marks the language, `translationKey` groups versions, and the path sets the slug. Publish one per locale.

## Switch to a published translation

Use the language selector to open 中文 and 日本語, confirming each route shows this guide in that language. Only a published equivalent is a direct target; when one is missing, the selector falls back to that locale's home page instead of substituting an unrelated post.

## Keep search and SEO language-aware

Post lists and Pagefind indexes are locale-scoped. Search in English, then follow the [Pagefind guide](../pagefind-basics/) to open a highlighted result.

Each translation has its own canonical URL and published group members appear as `hreflang` alternates. `x-default` points to the default-locale post when present. Check each page's `<head>` for a self canonical and all three versions.

Continue with [categories and archives](../organize-your-blog/) or the [Chinese search guide](../../../posts/pagefind-multilingual-zh/). Follow the [Site Onboarding documentation](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md) for the contract.
