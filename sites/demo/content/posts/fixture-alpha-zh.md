---
title: "样例文章甲"
description: "填充分页语料。"
pubDate: 2026-10-30
category: "release"
tags: ["样例"]
cover: "/site-assets/lighthouse.png"
lang: "zh-CN"
translationKey: "fixture-alpha"
---

正文包含独有词 天琴座星图 便于断言搜索命中。

这一段是填充段落，用于让每篇文章拥有稳定的正文体积。The quick brown fox jumps over the lazy dog.
行内代码应保留连续空格：`a    b`。

## 代码块

```ts
export function fibonacci(n: number): number {
	return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
```

## 表格

| 特性 | 状态 |
| --- | --- |
| 代码高亮 | ✓ |
| 目录 | ✓ |

![示例图片](/site-assets/orion.svg)

[安全外链](https://example.org/markdown) · [站内锚点](#表格) · [邮件链接](mailto:hello@example.org)

[不安全链接](javascript:alert%281%29) · [不安全引用链接][unsafe-link]

[unsafe-link]: data:text/html,unsafe

### 嵌套标题

目录应包含上面所有二级标题与本三级标题。
