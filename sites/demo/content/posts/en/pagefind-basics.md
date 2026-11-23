---
title: "Search your blog with Pagefind"
description: "Search published article text in each locale and open a highlighted result."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "search-pagefind"
---

Pagefind builds a static index from published posts when you compose the Site. The index files load on demand when a reader starts searching. Use `quiet-harbor-index` as a reproducible English query: it appears in this guide, so the result should point back to this page. Look for the highlighted excerpt, then click its title to read the article.

[中文](../../../posts/pagefind-multilingual-zh/) · [日本語](../../../ja/posts/pagefind-basics/)

## Start from the toolbar or search page

On desktop, open the search control in the top bar. On a phone, open the search panel. You can also use the locale's dedicated search route: `/search/` for the default language, `/en/search/` in English, and `/ja/search/` in Japanese. Enter `quiet-harbor-index`, wait for the excerpt, and confirm that the highlighted result opens this guide rather than stopping at a preview.

For a broader query, search for a topic such as “translation” or “archive”. Several results may appear. Read the title and excerpt before choosing one; both the result and the destination should stay in English.

## Understand what the index contains

Pagefind indexes the post title and body produced during composition. It does not need a live database, and a search does not send the query to an ALNILAM server. When you edit a post or add a new one, compose the Site again to refresh the static index. A draft is not a published result.

The index is split by locale. An English query should return English routes, while Chinese and Japanese queries stay with their own article versions. Use the [multilingual publishing guide](../internationalization/) to check the translation group, then visit [categories and archives](../organize-your-blog/) to continue from a different list.

Pagefind is the static search engine used by the existing Shirone search panel and search page. Its lazy loading and query lifecycle are described in the [search architecture decision](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/adr/0002-native-mpa-and-pagefind-lifecycle.md). Before publishing, repeat the query at the root and subpath deployment bases, open the actual result, and check that its URL retains the correct base prefix.
