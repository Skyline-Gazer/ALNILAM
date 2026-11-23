---
title: "Gallery: from thumbnail to original"
description: "Build a local album and test its viewer."
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: en
translationKey: gallery-guide
---

## Begin with a field route

An album needs a subject before it needs a layout. Coast and Mountains follows one route from headland to alpine lake; Tidal Sketchbook gathers the patterns left by a falling tide. These original SVG illustrations were made for this Site. Their authorship and Apache-2.0 license are recorded in the [artwork note](../../../site-assets/gallery/AUTHORSHIP.md).

Open the [album index](../../albums/), search for `Tidal` or select the `mountains` tag, then visit the stable [Coast and Mountains detail page](../../albums/coast-and-mountains/).

![The evening sun rests above layered headlands and blue-green water](/site-assets/gallery/coast-dusk.svg)

## Prepare local images

Put files under `assets/gallery/`. In `albums.yaml`, give each album a stable `id`, `title`, `layout`, and `photos` list. Each photo needs `src`, `thumbnail`, descriptive `alt`, and the measured original `width` and `height`—1600 × 1000 for this image. A preview should be a smaller copy of the same artwork.

Choose `grid` for even tiles or `masonry` to arrange landscape, portrait, and square photos by their dimensions. `cover` is optional: Forest Field Notes demonstrates the no-cover card and its working detail route. Keep empty albums in isolated test data instead of the public index.

## Check the reader's path

1. Open an album from the index and confirm its tiles decode.
2. Open an image, use the arrow keys, then Tab and Shift+Tab to check PhotoSwipe focus. Escape should close the viewer and return focus to the tile.
3. Return to the index and try search, a tag, and a query with no matches.

Gallery controls follow the route language; album titles, descriptions, and captions remain shared Site content. Continue with the [Moments timeline in this language](../../moments/) to try local images and its two-image viewer.
