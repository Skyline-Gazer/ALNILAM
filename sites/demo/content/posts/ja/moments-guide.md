---
title: "Moments：観察を残す"
description: "短い記録を整理し、時間線を絞り込みます。"
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: ja
translationKey: moments-guide
---

## 観察を記録する

Moments は、ルートのメモや潮の変化、再訪時に確かめたいことを短く残す機能です。この Demo には公開済み 12 件と、公開されない草稿 1 件があります。各項目は Site の `content/moments/` にある Markdown で、Core がビルド時に時間線を作ります。

[この言語の Moments 時間線](../../moments/)を開きます。最初は 8 件で、「もっと見る」から残りを表示できます。タグで絞り、本文・場所・タグを検索できます。選んだ条件は URL に反映されます。

![深い緑の松の間を進み、明るい空き地へ向かう小道](/site-assets/gallery/pine-trail.svg)

## 画像を添える

各ファイルには `published` 日付を指定します。`location`、`tags`、`images` は任意です。画像には原画像の `src`、小さな `thumbnail`、説明的な `alt`、実測した `width` と `height` を設定します。作品は Gallery と共用で、作者と Apache-2.0 ライセンスは[作品の記録](../../../site-assets/gallery/AUTHORSHIP.md)にあります。`pinned: true` は先頭に固定し、`draft: true` は公開対象から外します。

## 時間線を操作する

1. `tide` タグを選び、`independent` や場所を検索します。条件を解除して追加読み込みを試します。
2. 2 枚の画像がある項目を開き、矢印、Home、End で切り替えます。Escape で閉じるとタイルにフォーカスが戻ります。
3. 「原画像を表示」から PhotoSwipe を開き、Tab、Shift+Tab、Escape とフォーカスの戻りを確認します。

ルート言語で操作ラベルは変わりますが、本文、場所、タグ、キャプションは全ルートで共用され、項目ごとの翻訳には対応していません。続けて[Coast and Mountains アルバム](../../albums/coast-and-mountains/)を見られます。
