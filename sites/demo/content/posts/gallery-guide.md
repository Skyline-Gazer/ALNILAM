---
title: "相册：从缩略图到原图"
description: "用本地图片建相册并检查筛选与查看器。"
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: zh-CN
translationKey: gallery-guide
---

## 从一条观察路线开始

相册先要有主题，再选择排列方式。本 Demo 的 Coast and Mountains 记录海岸到高山湖的路线；Tidal Sketchbook 收集退潮留下的水纹。图像是为本 Site 绘制的原创 SVG，作者和 Apache-2.0 许可见[图库作品说明](../../site-assets/gallery/AUTHORSHIP.md)。

打开[相册索引](../../albums/)，搜索 `Tidal` 或选择 `mountains` 标签，再进入固定详情页[Coast and Mountains](../../albums/coast-and-mountains/)。

![夕阳落在层叠的海岬与蓝绿色海面上](/site-assets/gallery/coast-dusk.svg)

## 准备可用的本地图片

文件放在 `assets/gallery/`。在 `albums.yaml` 中为每组图片设置稳定的 `id`、`title`、`layout` 和 `photos`。每张照片提供 `src`、`thumbnail`、描述内容的 `alt`；`width` 与 `height` 填原图的实测尺寸，例如本图为 1600 × 1000。预览图要小于原图且内容相同。

`grid` 适合规整画廊，`masonry` 会依宽高比排列横图、竖图和方图。`cover` 可省略；Forest Field Notes 展示了无封面卡片和仍可访问的详情页。公开索引不放空相册，空态由隔离测试数据覆盖。

## 检查读者的操作

1. 从索引打开相册，确认卡片和详情都可到达，缩略图能解码。
2. 点开图格，用左右方向键切换；Tab、Shift+Tab 留在 PhotoSwipe 控件中，Escape 关闭并将焦点还给原图格。
3. 回到索引，试试搜索、标签和无结果提示。

Gallery 路由会翻译界面控件，相册名称、说明和图注则是共用的 Site 内容。接着打开本语言的[Moments 时间线](../../moments/)；其中也有本地图片和两图查看器。
