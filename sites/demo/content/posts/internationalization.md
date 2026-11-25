---
title: "为 ALNILAM 编写多语言文章"
description: "Site v2 翻译文章、语言切换与 SEO 实例。"
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "zh-CN"
translationKey: "internationalization"
---

翻译可以使用不同文件名和表达方式，但应回答同一个问题。本篇的中文、English 和日本語版本都可从页首链接或语言选择器打开。

[English](../../en/posts/internationalization/) · [日本語](../../ja/posts/internationalization/)

## 每种语言各写一篇文章

默认语言文章放在 `content/posts/`，其他语言放在对应代码的子目录中。下面是英文版本的 frontmatter：

```yaml
title: "Write multilingual posts with ALNILAM"
description: "Organize independent translations in a Site v2 blog."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "internationalization"
```

保存为 `content/posts/en/internationalization.md`；中文与日文版本在默认目录和 `ja/` 下。每篇有自己的 `lang` 与正文，共享 `translationKey`。文件路径决定 slug；同组每种语言只能有一篇。

## 切换到实际存在的译文

使用顶部选择器切换到 English 和日本語，确认每次都打开本篇的译文。只有已发布的对应文章才是直接目标；若该语言没有译文，选择器会回到该语言首页，不会用无关文章代替。

## 检查搜索和搜索引擎信息

文章列表和 Pagefind 索引按语言分开；中文搜索不会混入英文或日文结果。按[搜索指南](../pagefind-multilingual-zh/)搜索一段正文并打开结果。

每篇翻译都有自己的 canonical。已发布的组员互有 `hreflang`；只有组内含默认语言文章时，`x-default` 才指向它。构建后检查三页的 `<head>`：canonical 应指向当前页面，alternates 应列出三种实际译文。

这组文章可以作为内容检查入口：

- [中文的 Pagefind 搜索指南](../pagefind-multilingual-zh/)
- [中文的分类与归档指南](../organize-your-blog/)

参照[Site Onboarding 文档](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)，并在根路径和子路径中打开每个译文。
