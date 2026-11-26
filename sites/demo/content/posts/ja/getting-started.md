---
title: "ALNILAM を始める"
description: "Site v2 を設定して、最初の記事を公開します。"
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
pinned: true
lang: "ja"
translationKey: "getting-started"
---

設定、記事、画像は Site が所有します。ALNILAM Core はそれらを読み込んで静的サイトを生成します。

記事の公開は三つの手順です。

1. Site のルートに `alnilam.config.yaml` を置き、サイト情報と有効な言語を宣言します。
2. `content/posts/` に frontmatter 付きの Markdown を保存します。ファイルのパスが公開 URL の slug になります。
3. Compose で静的出力を生成し、ルートパスと `/ALNILAM/` サブパスの両方でリンクを確認します。

## Site v2 を作る

Site のルートに保存し、`content/posts/` を用意します。

<pre tabindex="0"><code>schemaVersion: 2
site: { title: "夜空のフィールドノート", description: "読書の記録", url: "https://blog.example.org", locale: "zh-CN" }
locales: ["zh-CN", "en", "ja"]
</code></pre>

対応するのは `schemaVersion: 2` だけです。詳しい契約は[Site Onboarding](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)を参照してください。

## 安定した URL で記事を公開

次の frontmatter は公開記事の例です。分類とタグは Site に宣言しておきます。

<pre tabindex="0"><code>---
title: "夕空の下の記録"
pubDate: 2026-11-23
category: "guide"
tags: ["alnilam"]
lang: "ja"
translationKey: "first-note"
---
</code></pre>

`content/posts/ja/first-note.md` は `/ja/posts/first-note/` になります。ファイルパスが slug なので、改名すると公開 URL も変わります。翻訳にはそれぞれ `lang` を設定し、共通の `translationKey` を使います。英語と日本語の記事は `content/posts/en/`、`content/posts/ja/` に置きます。

## ビルドと公開範囲

通常の記事はページになり、公開一覧、Feed、Sitemap に入ります。`draft: true`、`private: true`、`unlisted: true` はビルド時に記事 HTML を除外します。アクセス制御ではなく、秘密を守る機能でもありません。

出力先を Site の外に、しかも互いに上書きされない二つに分けて Compose します：`ALNILAM_SITE_URL=https://blog.example.org/ pnpm compose --site ./my-site --out ./dist/root`。次に `ALNILAM_SITE_URL` を `https://blog.example.org/ALNILAM/`、`--out` を `./dist/subpath` 変えて再ビルドします（Compose は公開済みの出力ディレクトリを置き換えるため）。両方のリンクを確認してください。この記事は各言語で優先表示されます。次は[Markdown と MDX](../markdown-and-mdx/)を読んでみましょう。
