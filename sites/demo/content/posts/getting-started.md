---
title: "开始使用 ALNILAM"
description: "用 Site v2 配置并发布第一篇文章。"
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
cover: "/site-assets/lighthouse-artwork.svg"
pinned: true
series: "alnilam-introduction"
seriesOrder: 2
lang: "zh-CN"
translationKey: "getting-started"
---

Site 拥有配置、文章和图片；ALNILAM Core 读取这些输入并生成静态网站。

发布一篇文章只有三步：

1. 在 Site 根目录写好 `alnilam.config.yaml`，声明站点信息与启用的语言。
2. 在 `content/posts/` 下保存一个带 frontmatter 的 Markdown 文件，文件路径就是公开 URL 的 slug。
3. 用 Compose 生成静态输出，并分别在根路径与 `/ALNILAM/` 子路径下检查链接。

## 创建 Site v2

在 Site 根目录保存配置，并创建 `content/posts/`：

<pre><code>schemaVersion: 2
site: { title: "纸上星图", description: "阅读笔记", url: "https://blog.example.org", locale: "zh-CN" }
locales: ["zh-CN", "en", "ja"]
</code></pre>

只有 `schemaVersion: 2` 受支持。配置细节见[Site Onboarding](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)。

## 发布文章并保持 URL 稳定

frontmatter 描述一篇已发布文章；分类与标签要在 Site taxonomy 中声明：

<pre><code>---
title: "夜色里的第一则笔记"
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
lang: "zh-CN"
translationKey: "first-note"
---
</code></pre>

将文件保存为 `content/posts/first-note.md`，它会发布到 `/posts/first-note/`。文件路径就是 slug；改名会改变公开 URL。完整译文使用各自的 `lang` 和相同的 `translationKey`，例如英文、日文放在 `content/posts/en/` 与 `content/posts/ja/`。本篇三语由语言切换器互相对应。

## 构建并检查公开状态

没有排除标记的文章会生成页面并进入公开列表、Feed 和 Sitemap。`draft: true`、`private: true`、`unlisted: true` 会在构建时排除文章 HTML；它们不是访问控制，不能保护秘密。

用 Compose 将输出写在 Site 之外，并使用两个互不覆盖的输出目录：`ALNILAM_SITE_URL=https://blog.example.org/ pnpm compose --site ./my-site --out ./dist/root`；随后把 `ALNILAM_SITE_URL` 改为 `https://blog.example.org/ALNILAM/` 且 `--out ./dist/subpath` 再构建一次（Compose 会替换已发布的输出目录），并检查两种 base 的链接。本文在三种语言中置顶，使用 Demo 已声明的 Guide 分类与 ALNILAM 标签。继续读[Markdown 与 MDX 指南](../markdown-and-mdx/)。
