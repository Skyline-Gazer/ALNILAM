---
title: "Gallery：アルバムを作る"
description: "ローカル画像でアルバムを作り、絞り込みを試します。"
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: ja
translationKey: gallery-guide
---

## 観察ルートをアルバムにする

Coast and Mountains は岬から高山湖までの風景を、Tidal Sketchbook は引き潮の水模様を集めたアルバムです。作品はこの Site 用のオリジナル SVG で、作者と Apache-2.0 ライセンスは[作品の記録](../../../site-assets/gallery/AUTHORSHIP.md)にあります。

[アルバム一覧](../../albums/)で `Tidal` を検索するか `mountains` タグを選び、[Coast and Mountains の詳細](../../albums/coast-and-mountains/)を開きます。

![夕日が重なる岬と青緑の海を照らす](/site-assets/gallery/coast-dusk.svg)

## ローカル画像を用意する

ファイルは `assets/gallery/` に置きます。`albums.yaml` では固定 ID と `grid` / `masonry` のレイアウトを設定し、写真ごとに `src`、小さな `thumbnail`、内容を表す `alt` を指定します。`width` と `height` は原画像の実測値です。この画像は 1600 × 1000 です。

grid は整ったタイル、masonry は横長・縦長・正方形の比率を活かした配置です。カバーは省略でき、Forest Field Notes が代替カードと詳細ルートを示しています。空アルバムは公開一覧に置かず、分離したテストデータで確認します。

## 操作を試す

1. 一覧からアルバムを開き、画像が表示されることを確認します。
2. 画像を開いて矢印キーで移動し、Tab / Shift+Tab で PhotoSwipe 内のフォーカスを確かめます。Escape で閉じると開いたタイルへ戻ります。
3. 一覧に戻り、検索、タグ、該当なしの案内を試します。

Gallery の操作ラベルはルート言語に合わせますが、アルバム名、説明、キャプションは共通の Site 内容です。[この言語の Moments 時間線](../../moments/)では、ローカル画像と 2 枚表示のビューアーも試せます。
