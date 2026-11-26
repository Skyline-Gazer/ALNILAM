---
title: "Organize posts with tags and archives"
description: "Use taxonomy, archives, and series to guide readers."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "organize-your-blog"
---

Useful navigation makes each destination clear. This article uses the declared `guide` category and existing `guide` and `alnilam` tags. Open a collection below and continue through its post cards.

[中文](../../../posts/organize-your-blog/) · [日本語](../../../ja/posts/organize-your-blog/)

## Use a category for the main subject

The Site taxonomy declares `guide` as a category id, with a localized label in Chinese, English, and Japanese. All three versions of this article keep the same stable id:

```yaml
category: "guide"
```

Open the [Guide category](../../categories/guide/) to find related posts. The route is locale-scoped, so the same relative link from this English article opens the English listing. Its label follows the current locale while the category slug stays stable.

## Use tags to connect broader topics

The Site owns the tag catalog. This guide uses `guide` for tutorials and `alnilam` for project posts. Browse the [Guide tag](../../tags/guide/) or [ALNILAM tag](../../tags/alnilam/).

Categories describe an article's main subject and must be declared in the Site. Tags connect narrower topics. Tags can come directly from a post, and reusing a catalog ID gives them a consistent label and URL.

## Browse by publication date

Open the [English archive](../../archives/), then use the language selector to visit the Chinese or Japanese archive. Each list contains posts from its own locale. If the list spans pages, open page 2 and return to page 1.

## Follow an ordered series

A series groups posts that belong in sequence. The shared [ALNILAM Introduction series](../../../series/alnilam-introduction/) lists its two Chinese members in reading order. After opening an article, use the language selector to reach its English or Japanese translation.

These routes answer different questions, so one article can belong to a category, use several tags, appear in a date archive, and be part of a series. Continue with the [multilingual publishing guide](../internationalization/) and the [Pagefind search guide](../pagefind-basics/); search a phrase in that guide to move from discovery to reading.

For the authoritative field rules, use the [Site Onboarding documentation](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md). Before publishing, open this locale's category, tag, archive, and series routes from both the root and `/ALNILAM/` deployments.
