---
title: "用 Pagefind 搜索博客正文"
description: "在每种语言中搜索实际文章，并从高亮摘要打开结果。"
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "zh-CN"
translationKey: "search-pagefind"
---

Pagefind 会在构建时为已发布文章生成静态索引，读者搜索时才按需加载索引文件。试搜词「北辰手写索引」只写在本篇中文正文中。输入这几个字，确认结果摘要中的命中标记，然后打开标题为“用 Pagefind 搜索博客正文”的结果。

[English](../../en/posts/pagefind-basics/) · [日本語](../../ja/posts/pagefind-basics/)

## 从标题栏或搜索页开始

在桌面端打开标题栏的搜索框，在手机上打开搜索面板，或者访问本语言的搜索页面。搜索页地址是 `/search/`；英文和日文地址分别是 `/en/search/` 与 `/ja/search/`。输入“北辰手写索引”，等摘要出现后，确认它标记了查询词，再点击结果。你应该回到这篇文章，而不是仅看到一个无法打开的预览。

也可以搜索更普通的词，例如“语言”或“文章”。Pagefind 会展示多个匹配结果；读摘要和标题，再选择你要继续阅读的文章。搜索结果和文章链接都应留在当前语言中。

## 搜索的是已发布的 Site 内容

索引来自 compose 时的文章正文和标题。它不需要后台数据库，也不会在每次搜索时向 ALNILAM 服务发送请求。新文章加入或正文变更后，重新 compose Site 才会更新索引。草稿不会作为已发布文章被索引。

索引按语言分别构建。中文查询在中文结果中打开，英文和日文也各自对应自己的文章版本。可以用[多语言文章指南](../internationalization/)检查语言切换，再读[分类与归档指南](../organize-your-blog/)了解从其他列表继续发现文章的路线。

Pagefind 是一个静态站点搜索工具。ALNILAM 当前把它接入 Shirone 的搜索面板与独立搜索页；其加载和查询生命周期记录在[搜索架构决策](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/adr/0002-native-mpa-and-pagefind-lifecycle.md)。在网站发布前，分别在根路径和子路径上输入这篇文章的试搜词，打开结果，并确认地址包含正确的部署前缀。
