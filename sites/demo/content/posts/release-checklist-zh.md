---
title: "版本说明与发布检查表"
description: "演示默认语言分类的分页与标签聚合：一篇 release 分类、带 ALNILAM 标签的中文样例文章。"
pubDate: 2026-11-02
category: "release"
tags: ["ALNILAM", "指南"]
lang: "zh-CN"
---

这篇样例存在的目的，是让默认语言（`zh-CN`）的 `release` 分类超过一页，
并让 `ALNILAM` 标签页至少有三条时间线条目。#35 之后每个列表只读取自己语言的语料，
所以分类分页和标签聚合必须在默认语言里各有一套可验证的内容，而不是依赖其他语言的文章补位。

## 发布检查表

发布一个站点时，按顺序检查这些项目：

1. `alnilam.config.yaml` 的 `schemaVersion` 为 `2`，`site.locale` 与 `locales` 一致。
2. 每篇文章的 `lang` 与其所在语言目录一致；未写 `lang` 时回退到 `site.locale`。
3. 分类与标签在 `taxonomy` 中已声明，显示名与 slug 分开维护。
4. 各语言的列表页、归档页与 Feed 只列出该语言的文章。
5. `hreflang` 交替链接只指向实际生成的路由。

```bash
node scripts/compose.mjs --site ./my-site --out ./dist/site
node scripts/artifact-check.mjs ./dist/site
node scripts/seo-check.mjs ./dist/site
```

三条命令都应返回 0；任何 `FAIL:` 行都意味着生成结果内部存在无法解析的链接或交替链接。
