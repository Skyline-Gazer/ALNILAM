---
title: "Hello, ALNILAM"
description: "Follow an illustrated article from Site source to static output and rehearse a Core upgrade with the same content."
pubDate: 2026-10-25
category: "release"
tags: ["ALNILAM", "Astro"]
cover: "/site-assets/orion.svg"
lang: "en"
translationKey: "hello-alnilam"
---

The parts of a blog you want to keep are its writing, illustrations, and links. This article, the Orion cover, and the lighthouse below come from the Demo's **Site**. **Core** builds them into an article, home feed, search index, and RSS feed.

## Keep illustrations with the article

Put posts in `content/posts/` and shared illustrations in `assets/`. Write alt text that conveys what the image shows. Use surrounding prose for context the reader also needs. The beam in the illustration below picks out the sea on a dark night. The same lighthouse is the cover subject of the [first-post guide](../getting-started/).

![A lighthouse casts a beam over the sea under a dark blue sky](/site-assets/lighthouse.png)

Select the illustration to view it at a larger size. With a keyboard, focus the image and press Enter to open it, then Escape to return to the image. See the [Markdown and MDX guide](../markdown-and-mdx/) for more ways to lay out an article.

## Rehearse an upgrade with the same Site

From the Core checkout, run `pnpm compose --site /path/to/site --out /path/to/output`. When upgrading, use the new Core to build the same Site into a second directory. Open an article, its image, and the feed before switching the published directory. Keep the previous output so you can roll back with the same content.

[简体中文](../../../posts/hello-alnilam/) · [日本語](../../../ja/posts/hello-alnilam/)
