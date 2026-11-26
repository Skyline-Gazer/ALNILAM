---
title: "こんにちは、ALNILAM"
description: "挿絵入りの記事を例に Core と Site の役割を知り、同じ記事を使って更新手順を試します。"
pubDate: 2026-10-25
category: "release"
tags: ["ALNILAM", "Astro"]
cover: "/site-assets/orion.svg"
lang: "ja"
translationKey: "hello-alnilam"
---

ブログで残したいのは、記事や挿絵、そしてそれらをつなぐリンクです。この記事、表紙のオリオン座、本文の灯台は、デモの **Site** に置いてあります。**Core** はそれらを使って記事ページ、ホーム、検索インデックス、RSS を生成します。

## 挿絵を記事と一緒に管理する

記事は `content/posts/`、複数の記事から使う挿絵は `assets/` に置きます。画像の内容が伝わる代替テキストを書き、読者に必要な背景は本文で補います。下の挿絵では、夜の海に灯台の光が伸びています。[最初の記事を書くガイド](../getting-started/)の表紙も同じ灯台を描いています。

![紺色の夜空の下で、灯台が海へ光を投げかける](/site-assets/lighthouse.png)

挿絵を選ぶと拡大できます。キーボードでは画像にフォーカスを移し、Enter で開いて Escape で閉じると元の画像に戻ります。記事の組版は [Markdown と MDX のガイド](../markdown-and-mdx/)も参考にしてください。

## 同じ Site を使って更新を試す

Core のディレクトリで `pnpm compose --site /path/to/site --out /path/to/output` を実行します。更新時には、新しい Core で同じ Site を別のディレクトリに生成します。記事、画像、フィードを確認してから公開先を切り替えます。前の出力を保管しておけば、記事を変更せずに戻せます。

[简体中文](../../../posts/hello-alnilam/) · [English](../../../en/posts/hello-alnilam/)
