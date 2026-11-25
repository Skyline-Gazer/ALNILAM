---
title: "カテゴリとタグで記事を整理する"
description: "分類、タグ、アーカイブから記事を探します。"
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "ja"
translationKey: "organize-your-blog"
---

ナビゲーションから行き先が分かると、記事を探しやすくなります。本記事は `guide` カテゴリに属し、既存の `guide` と `alnilam` タグを使います。

[中文](../../../posts/organize-your-blog/) · [English](../../../en/posts/organize-your-blog/)

## カテゴリで主なテーマを示す

Site の分類カタログは `guide` をカテゴリ id として定義し、三言語の表示名を持ちます。翻訳記事も同じ id を使います。

```yaml
category: "guide"
```

[ガイドカテゴリ](../../categories/guide/)を開くと、関連する記事を一覧できます。この日本語記事からは日本語の一覧へ移動します。カテゴリの slug は共通ですが、表示名は現在の言語に応じて変わります。

## タグで広い話題をつなぐ

タグのカタログも Site が所有します。`guide` は使い方の記事を、`alnilam` はプロジェクトの記事をまとめます。[ガイドタグ](../../tags/guide/)と[ALNILAM タグ](../../tags/alnilam/)から関連記事へ進めます。

カテゴリは「どんな種類の記事か」を示し、タグは複数のカテゴリをまたいで細かな話題を結びます。新しい表記を増やす前に既存のカタログを確認してください。未定義のカテゴリやタグを frontmatter に書いても、有効な一覧ページにはなりません。

## 公開日から記事を探す

公開日から探すには[日本語アーカイブ](../../archives/)を開きます。言語切替から英語と中国語も確認できます。記事が複数ページに分かれたら、2 ページ目から1ページ目へ戻ってみましょう。

## 順序のあるシリーズを読む

シリーズは順番に読む記事をまとめます。ルートは言語共通です。[ALNILAM 入門シリーズ](../../../series/alnilam-introduction/)では順番と各記事へのリンクを確認でき、メンバー記事はそれぞれの言語で開きます。

カテゴリ、タグ、アーカイブ、シリーズは別々の入口です。[多言語記事のガイド](../internationalization/)と[Pagefind 検索ガイド](../pagefind-basics/)から、本文検索で記事を見つける流れも試してください。

フィールドのルールは[Site Onboarding](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)を参照し、root と `/ALNILAM/` でリンクを確認してください。
