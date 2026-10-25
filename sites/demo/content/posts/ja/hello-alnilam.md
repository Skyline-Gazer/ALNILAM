---
title: "こんにちは、ALNILAM"
description: "独立して所有される Site の最初の記事（日本語訳）。"
pubDate: 2026-10-25
tags: ["ALNILAM", "Astro"]
cover: "/site-assets/orion.svg"
lang: "ja"
translationKey: "hello-alnilam"
---

この記事はプラットフォームの Astro アプリケーション内ではなく、**Site** に存在します。

Core は独立してアップグレードできます。Site が記事とアセットを所有します。

## Core / Site の構成

1. コンテンツは `content/posts/` に置きます。
2. 設定は `alnilam.config.toml` に書きます。
3. `pnpm compose --site /path/to/site --out /path/to/output` でビルドします。
