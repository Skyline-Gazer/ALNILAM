---
title: "多言語記事の書き方"
description: "Site v2 の翻訳と切替。"
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "ja"
translationKey: "internationalization"
---

翻訳は自然な表現で同じテーマを扱います。このガイドは三言語で公開しています。

[中文](../../../posts/internationalization/) · [English](../../../en/posts/internationalization/)

## 言語ごとに記事ファイルを用意する

文章は Site が所有します。既定言語の記事は `content/posts/` に置き、それ以外の言語は言語コードのフォルダーに置きます。英語版の frontmatter は次のようになります。

```yaml
title: "Write multilingual posts with ALNILAM"
description: "Organize independent translations in a Site v2 blog."
pubDate: 2026-11-23
category: "guide"
tags: ["guide", "alnilam"]
lang: "en"
translationKey: "internationalization"
```

英語版は `content/posts/en/internationalization.md` に置きます。中国語は既定フォルダー、日本語は `ja/` に置き、各記事の `lang` と共通の `translationKey` を設定します。

## 公開されている翻訳へ切り替える

言語切替から中文または English を選び、対応版が開くことを確認します。翻訳が未公開なら、その言語のホームへ移動します。

## 検索範囲と SEO を確認する

記事一覧と Pagefind のインデックスは言語別です。[検索ガイド](../pagefind-basics/)で本文を検索してみましょう。

各ページは self canonical と `hreflang` を持ち、既定言語版があれば `x-default` も出ます。compose 後に `<head>` を確認します。

次は[カテゴリとアーカイブ](../organize-your-blog/)へ。詳細は[Site Onboarding](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md)を読み、root と subpath の URL を確認します。
