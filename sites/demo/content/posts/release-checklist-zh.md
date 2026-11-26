---
title: "版本说明与发布检查表"
description: "发布前检查 Site 配置、文章链接、各语言的 Feed 和静态构建产物。"
pubDate: 2026-11-02
category: "release"
tags: ["alnilam", "guide"]
lang: "zh-CN"
---

每次发布时，我会先构建到一个新目录，再从读者的入口逐项检查。首页能打开只是第一步。旧文章地址、分享链接和 RSS 订阅也应继续工作。

## 发布检查表

发布一个站点时，按顺序检查这些项目：

1. `alnilam.config.yaml` 的 `schemaVersion` 为 `2`，并且 `locales` 包含 `site.locale`。
2. 给每篇译文写明 `lang`。省略时使用 `site.locale`，文件夹名不会决定文章语言。互为翻译的文章使用相同的 `translationKey`。
3. 在 `categories` 和 `tags` 中维护分类与标签的显示名和 slug。发布前跟随一条文章上的分类链接，确认它打开相应语言的列表。
4. 各语言的列表页、归档页与 Feed 只列出该语言的文章。
5. `hreflang` 交替链接只指向实际生成的路由。

```bash
node scripts/compose.mjs --site ./my-site --out ./dist/site
node scripts/artifact-check.mjs ./dist/site
node scripts/seo-check.mjs ./dist/site
```

构建通过后，打开一篇文章并从页眉切换到译文。再在浏览器中订阅本站的 [RSS](../../rss.xml) 或查看 [归档](../../archives/)，确认最新文章出现在预期语言的列表中。从子路径发布的站点还应检查文章和图片地址是否都带有正确的前缀。保留上一次成功构建的目录，便于回退。
