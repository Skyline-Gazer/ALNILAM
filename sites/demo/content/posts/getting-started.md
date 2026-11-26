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

<pre tabindex="0"><code>schemaVersion: 2
site: { title: "纸上星图", description: "阅读笔记", url: "https://blog.example.org", locale: "zh-CN" }
locales: ["zh-CN", "en", "ja"]
</code></pre>

只有 `schemaVersion: 2` 受支持。配置细节见[Site Onboarding](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)。

## 发布文章并保持 URL 稳定

下面的 frontmatter 描述一篇已发布文章。如果要使用此示例的分类与标签，先在 `categories` 中声明 `guide`，并在 `tags` 中声明 `alnilam`。

<pre tabindex="0"><code>---
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

## 继续配置阅读体验

在 Site 中将 `theme.appearance` 设为 `light` 或 `dark`，可选择首次访问的外观。试用本页的外观按钮，再刷新确认浏览器保留了选择。窄屏文章的目录位于正文之前，宽屏则用侧栏。

公开 Demo 未启用 Bangumi 和评论。想在自己的 Site 显示公开收藏，可按 [Bangumi 配置](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md#bangumi-bangumi)设置 `bangumi.userId`，构建后检查 `/bangumi/`。需要评论时，先在自己的公开 GitHub 仓库开启 Discussions，再按 [Giscus 配置](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md#comments-comments)添加公开标识和映射。只在需要时开启这些功能。

下一步可以[发布译文](../internationalization/)、[整理分类和系列](../organize-your-blog/)，或在 [Pagefind 指南](../pagefind-multilingual-zh/)中试搜正文。
