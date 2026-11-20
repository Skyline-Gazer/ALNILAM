---
# Undeclared Site-owned metadata: must survive a Pages CMS save with merge:true.
title: "Pages CMS 内容往返"
description: "验证 Markdown 内容、媒体路径与未知字段保留。"
pubDate: 2026-11-12
updatedDate: 2026-11-12
category: "guide"
tags: ["ALNILAM", "CMS"]
cover: /site-assets/cms-mark.svg
lang: "zh-CN"
commentId: "cms-basics"
draft: false
author: "Site Author"
editorialNote: "kept by settings.content.merge: true"
cmsMeta:
  reviewedBy: "owner"
  revision: 3
---

ALNILAM 的 **Site** 是唯一的内容权威；Core 只读取四个固定输入。

![Site 媒体](/site-assets/cms-mark.svg)

![文章相对媒体](./cms-local.svg)

正文里的围栏代码块也包含 `---`，它不能被误判为 frontmatter：

```markdown
---
title: "body text, not frontmatter"
---
<Callout>MDX-looking text stays untouched.</Callout>
```

列表与行内代码：

1. `alnilam.config.yaml` 保持 YAML-only。
2. `.pages.yml` 不参与构建。
3. 正文里的 `/site-assets/...` 绝对路径在子路径部署时会被加上 base。
