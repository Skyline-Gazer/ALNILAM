---
title: "Lightbox HTTPS fixtures"
description: "Playwright-routed HTTPS beds for PhotoSwipe matrix; not a live network dependency."
pubDate: 2026-10-20
category: "release"
tags: ["ALNILAM", "lightbox"]
lang: "zh-CN"
translationKey: "lightbox-fixtures"
---

External beds below are HTTPS-only Playwright routes (`lightbox-fixtures.local` / `cdn.example.com`).

![External ok fixture](https://lightbox-fixtures.local/ok/640/360.png)

![Signed fixture](https://lightbox-fixtures.local/signed/800/450.png?sig=abc123&exp=9999999999)

![Protocol-relative fixture](//cdn.example.com/ok/512/288.png?v=1)

[![Thumb with author full](https://lightbox-fixtures.local/thumb/160/90.png)](https://lightbox-fixtures.local/full/1280/720.png)

![Missing dimensions external](https://lightbox-fixtures.local/ok/321/187.png)

:::grid
![Grid one](https://lightbox-fixtures.local/ok/200/200.png)
![Grid two](https://lightbox-fixtures.local/ok/400/300.png)
:::

## Fixture notes

1. Keep HTTPS beds on this post only.
2. Do not put unrouted external images on hello-alnilam.
3. Trusted dual-compat harness opens local hello-alnilam slides.
