---
title: "Moments：把观察写进时间线"
description: "添加短记录，体验标签筛选和图片查看。"
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: zh-CN
translationKey: moments-guide
---

## 给每次观察留一个位置

Moments 用来保存长文章之间的路线备注、潮位变化和回访发现。Demo 有 12 条已发布记录，另有一条草稿不会公开。每条都是 `content/moments/` 下的 Site Markdown，Core 在构建时生成时间线。

打开[本语言的 Moments 时间线](../../moments/)。页面先显示 8 条，选择「加载更多」可查看其余内容。标签缩小列表；搜索会匹配正文、地点和标签，筛选条件也会写入网址。

![松林步道穿过深绿色树影，通向午后明亮的空地](/site-assets/gallery/pine-trail.svg)

## 添加图片和说明

每个文件需要 `published` 日期，可选 `location`、`tags` 和 `images`。图片用 `src` 指向原图、`thumbnail` 指向较小预览，并填写描述内容的 `alt` 与原图实测的 `width` / `height`。本 Demo 的图像来自图库目录，作者和 Apache-2.0 许可见[作品记录](../../site-assets/gallery/AUTHORSHIP.md)。`pinned: true` 可将重要记录置顶，`draft: true` 会排除发布。

## 实际浏览和筛选

1. 选择 `tide` 标签，再搜索 `independent` 或地点；清除条件后加载更多，检查 8 条增至 12 条。
2. 打开双图记录，在内嵌查看器用左右箭头、Home 和 End 切换。Escape 收起后焦点返回原图格。
3. 选择「查看原图」打开 PhotoSwipe，检查 Tab、Shift+Tab、Escape 和焦点返回。

路由会翻译 Moments 的控件；正文、地点、标签和图注在各语言路由共用，并不支持逐条翻译。要继续浏览完整图组，可打开[Coast and Mountains 相册](../../albums/coast-and-mountains/)。
