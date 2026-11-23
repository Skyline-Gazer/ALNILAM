---
title: "Moments: keep a field timeline"
description: "Add field notes and use timeline filters."
pubDate: 2026-11-23
category: guide
tags: [alnilam, guide]
lang: en
translationKey: moments-guide
---

## Give observations a place

Moments holds short notes between longer posts: a route reminder, a change in the tide, or something to check on a return visit. The Demo has twelve published entries and one excluded draft. Each entry is Site-owned Markdown in `content/moments/`; Core builds the timeline without a runtime data service.

Open the [Moments timeline in this language](../../moments/). It starts with eight entries. **Load more** reveals the rest. Tag chips filter the feed; search matches entry text, location, and tags, and the current filters appear in the URL.

![A pale trail bends between deep green pines toward an open clearing](/site-assets/gallery/pine-trail.svg)

## Add an image with context

Each file needs `published`; `location`, `tags`, and `images` are optional. For an image, set `src` to the original, `thumbnail` to its smaller preview, `alt` to a useful description, and `width` / `height` to the measured original dimensions. These entries reuse original Gallery art; its author and Apache-2.0 license are in the [artwork record](../../../site-assets/gallery/AUTHORSHIP.md). `pinned: true` moves a note to the top; `draft: true` keeps it out of publication.

## Try the real feed

1. Select the `tide` tag, then search for `independent` or a place. Clear filters and load more to go from eight notes to all twelve.
2. Open an image in the two-image entry. The inline viewer uses the arrows, Home, and End; Escape closes it and restores focus to the tile.
3. Choose **View original** for PhotoSwipe. Check Tab, Shift+Tab, Escape, and focus return.

The route language translates Moments controls. Entry text, locations, tags, and captions are shared Site content at each route; entries do not have individual translations. Continue to the [Coast and Mountains album](../../albums/coast-and-mountains/) for the complete image sequence.
