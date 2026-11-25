# #194 visual evidence

All captures: Chromium via the repository's Playwright, `viewport 390×844`, `isMobile`, `hasTouch`,
`deviceScaleFactor: 1`, JPEG q72, `animations: "disabled"`. Taken 2026-11-24.

| File | Page | State |
| --- | --- | --- |
| `alnilam-before-cluster-over-text.jpg` | `/en/posts/internationalization/` on the #190 guides tree (dev CSS), scrolled 700 px | the floating cluster at `x=317, 49 px` items, container class `fab-text-obscured fab-scroll-hidden` — i.e. the long article's controls are present but **hidden**, so the contents affordance is gone exactly where it matters |
| `alnilam-after-390.jpg` | `/en/posts/getting-started/` on this branch, scrolled 520 px | no floating control is rendered below `lg`; the reading column keeps its full width |
| `alnilam-after-390-open.jpg` | same page, contents disclosure expanded | in-flow expansion pushes the article instead of covering it |
| `starlight-mobile-toc-closed.jpg` | `https://starlight.astro.build/guides/components/` | `mobile-starlight-toc` disclosure in the header stack, closed |
| `starlight-mobile-toc-open.jpg` | same | open; the list overlays the article text — ALNILAM's disclosure expands in flow instead |
| `mizuki-mobile.jpg` | `https://mizuki.mysqil.com/` | mobile header TOC button measured 39×39 px (below the 44 px floor this project keeps) plus a floating music FAB |
| `shirone-post-mobile.jpg` | `https://shirone.mysqil.com/posts/guide/` | upstream cluster measured 49 px wide at `right: 24px` against a 334 px content column at `x=28`, i.e. **two items overlap the text column**; no obstruction handling exists upstream |

Measurements quoted here come from the same sessions as the captures (element rectangles and computed
styles read in the page), not from estimates.
