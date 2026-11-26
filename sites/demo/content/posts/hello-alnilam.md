---
title: "你好，ALNILAM"
description: "从一篇带原创插图的文章认识 Core 与 Site 的分工，并学会在升级时保留自己的内容。"
pubDate: 2026-10-25
category: "release"
tags: ["ALNILAM", "Astro"]
series: "alnilam-introduction"
seriesOrder: 1
cover: "/site-assets/orion.svg"
lang: "zh-CN"
translationKey: "hello-alnilam"
---

写博客时，最值得保留的是文章、插图和它们之间的链接。这篇文章连同封面的猎户座星图和下方的灯塔插图，都由 Demo 的 **Site** 提供。**Core** 负责把它们构建成文章、首页、搜索索引和 Feed。

## 让图像和文章留在 Site

把文章放进 `content/posts/`，把公用插图放进 `assets/`。给每张图写一段能传达信息的替代文字，再在正文中补足读者需要的背景。下图的灯塔用一束浅色灯光照向海面，也是[第一篇文章指南](../getting-started/)的封面主题。

![深蓝色夜空下，灯塔把一束光投向海面](/site-assets/lighthouse.png)

点按灯塔插图可以放大。用键盘阅读时，聚焦图像后按 Enter 打开，按 Escape 关闭并回到图像。更多排版示例见 [Markdown 与 MDX 指南](../markdown-and-mdx/)。

## 用同一个 Site 检查两次构建

在 Core 目录中执行 `pnpm compose --site /path/to/site --out /path/to/output`。准备升级时，用新版本 Core 对同一个 Site 再构建一次，输出到另一个目录。先检查文章、图片和 RSS 链接，再切换发布目录。保留上次产物，就能用原有内容回退。

[English](../../en/posts/hello-alnilam/) · [日本語](../../ja/posts/hello-alnilam/)
