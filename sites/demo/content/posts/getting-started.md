---
title: "开始使用 ALNILAM"
description: "展示多语言内容组织的第二篇文章（中文版）。"
pubDate: 2026-10-26
tags: ["指南"]
lang: "zh-CN"
translationKey: "getting-started"
---

ALNILAM 将**你写的内容**（Site）与**渲染它的软件**（Core）分离。

## 你的第一个 Site

1. 创建一个包含 `alnilam.config.toml` 和 `content/posts/` 的目录。
2. 用 `title`、`description`、`pubDate` frontmatter 编写 Markdown 或 MDX 文章。
3. 构建：`node scripts/compose.mjs --site /path/to/site --out dist/`。

## 翻译

在 frontmatter 中加入 `lang` 和 `translationKey`。共享同一
`translationKey` 的文章会自动获得 `hreflang` 交替链接。非默认语言的文章
会发布在 `/posts/<lang>/<slug>/` 下。
