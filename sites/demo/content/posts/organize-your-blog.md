---
title: "用分类、标签和归档整理博客"
description: "用分类、标签、归档和系列组织文章。"
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "zh-CN"
translationKey: "organize-your-blog"
---

好用的博客导航不只是把文章放进抽屉；它还要让读者明白每个入口会带自己去哪里。本篇属于 `guide` 分类，并使用现有的 `guide` 与 `alnilam` 标签。你可以从本页直接打开这些聚合列表，再沿着文章卡片继续阅读。

## 分类表示文章的主要方向

Site 分类目录声明了 `guide` id，中文显示名是“指南”。三种语言共用此 id：

```yaml
category: "guide"
```

中文页面可从[指南分类](../../categories/guide/)查看相关文章；英语版本使用[Guide 分类](../../en/categories/guide/)；日文版本也通过[ガイド分类](../../ja/categories/guide/)查看。分类标签会根据当前语言显示，而分类路径保留同一个 slug。

## 标签可以跨越不同主题

标签目录也由 Site 拥有。本文组使用 `guide` 聚合教程、用 `alnilam` 关联项目内容。打开[指南标签](../../tags/guide/)或 [ALNILAM 标签](../../tags/alnilam/)浏览文章。

分类通常回答“这篇文章属于哪一类”，标签则适合连接更细的主题。避免为一次性措辞创建新标签；先查看 Site 目录，再复用已有 slug。未在目录声明的分类或标签不会自动成为有效的导航项。

## 归档按时间组织

归档按发布日期组织文章。打开[中文归档](../../archives/)，再用语言切换访问英语或日语归档。列表只显示对应语言的文章；文章较多时，翻到第二页再返回。

## 系列提供有顺序的阅读路线

系列把有先后关系的文章放在一起。系列路由是共享的；[ALNILAM 入门系列](../../series/alnilam-introduction/)展示说明、顺序和成员。每篇成员文章仍使用自己的语言路由。

分类、标签、归档和系列适合不同的阅读问题，因此一篇文章可以同时属于分类、带多个标签，也出现在日期归档或系列中。继续查看[多语言文章](../internationalization/)和[Pagefind 搜索](../pagefind-multilingual-zh/)；如果希望从检索词出发，先[搜索一段正文](../pagefind-multilingual-zh/)再沿着结果阅读。

有关 Site 分类与标签目录的字段规则，请查看[Site Onboarding 文档](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)。在正式发布前，分别打开本语言的分类、标签、归档和系列路线，并确认链接在根路径与 `/ALNILAM/` 下都能到达。
