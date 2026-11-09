---
title: "Hello, ALNILAM"
description: "First article in an independently owned Site."
pubDate: 2026-10-25
category: "release"
tags: ["ALNILAM", "Astro"]
cover: "/site-assets/orion.svg"
lang: "zh-CN"
translationKey: "hello-alnilam"
---

This article lives in **Site**, not inside the platform's Astro application.

Core can be upgraded independently. Site owns the post and its assets.

![Orion constellation artwork](/site-assets/orion.svg)

![Lighthouse lightbox fixture](/site-assets/lighthouse.png)

## Lightbox HTTPS fixtures

External beds below are HTTPS-only Playwright routes (`lightbox-fixtures.local` / `cdn.example.com`); they are not live network dependencies.

![External ok fixture](https://lightbox-fixtures.local/ok/640/360.png)

![Signed fixture](https://lightbox-fixtures.local/signed/800/450.png?sig=abc123&exp=9999999999)

![Protocol-relative fixture](//cdn.example.com/ok/512/288.png?v=1)

[![Thumb with author full](https://lightbox-fixtures.local/thumb/160/90.png)](https://lightbox-fixtures.local/full/1280/720.png)

![Missing dimensions external](https://lightbox-fixtures.local/ok/321/187.png)

:::grid
![Grid one](https://lightbox-fixtures.local/ok/200/200.png)
![Grid two](https://lightbox-fixtures.local/ok/400/300.png)
:::

Ordinary text link that contains an image must navigate, not open the lightbox:
[Read more about the lighthouse ![inline](/site-assets/lighthouse.png)](../).

## Core / Site composition

1. Keep your content under `content/posts/`.
2. Keep your configuration in `alnilam.config.yaml`.
3. Build with `pnpm compose --site /path/to/site --out /path/to/output`.
