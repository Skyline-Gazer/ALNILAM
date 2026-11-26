# Demo content and verification matrix

The Demo uses its own articles to show how to publish a blog with ALNILAM. The prose, illustrations and examples are ALNILAM material. The [distribution notices](../THIRD_PARTY_NOTICES.md#demo-distribution-artifacts) record asset rights, and [Site onboarding](SITE_ONBOARDING.md) specifies the supported configuration. The article format draws on [Fuwari’s guides](https://github.com/saicaca/fuwari/tree/main/src/content/posts).

| Capability | Article or route | Verification |
| --- | --- | --- |
| YAML schema v2, stable article URLs and publishing | `getting-started` in zh-CN, en and ja | Open the pinned guide from each Home, follow the relative links, and run the first-post workflow on an independent Site. |
| Core/Site ownership, local illustration and lightbox | `hello-alnilam` in three locales | Open the lighthouse illustration with mouse, touch or keyboard. Escape restores focus to the image. Confirm the guide’s alternatives lead to equivalent articles. |
| Markdown, MDX, typography and TOC | `markdown-and-mdx` in three locales | Open the article at desktop and mobile widths. Check the rendered table, code, image, expressions and TOC. H4 has a direct anchor and stays out of the default TOC. |
| Locale routes and translation groups | `internationalization` and the shared guide groups | Switch language on article and Home routes. Check the canonical URL, reciprocal `hreflang` and labeled fallback for the Chinese publication checklist, which has no translations. |
| Home, categories, tags, archive and series | `organize-your-blog`, Home and `/series/alnilam-introduction/` | Follow the category and tag links from the localized guides. Exercise Home page 2 and Archive tag grouping. The series lists its two Chinese members. Those articles link to their translations through the selector. |
| Pagefind and locale isolation | `pagefind-multilingual-zh` (zh-CN) and `pagefind-basics` (en and ja) | Search the localized example and follow the result. Browser coverage also searches body-only text in the organization guide and checks its destination and locale. |
| Theme and responsive reading | `getting-started` in three locales | Toggle the appearance and reload. Check the 1024 px article breakpoint and keyboard navigation. |
| Publishing and rollback | `release-checklist-zh` | Build to a new directory and check links, feeds and sitemap before switching outputs. |
| Bangumi, Giscus and discovery | Optional settings in the onboarding guide | Bangumi, comments and llms discovery are off on the public Demo. Use separate Site builds for enabled behavior. External provider behavior requires an independently verified provider connection. |
| Retired features | Gallery, Moments and site-wide Music | Public route and navigation absence is intentional. Article images and PhotoSwipe remain supported. |

For #190 and #194, run the browser suites `native-shirone-base`, `pagination-pagefind`, `archive-taxonomy`, `demo-series`, `markdown-render`, `floating-controls-overlap` and `lightbox` against freshly composed root and `/ALNILAM/` outputs. Use `artifact-check` and `seo-check` for emitted links, structure and budgets. The image-link edge case, multiple-image keyboard checks and unpublished search fixture belong to `tests/fixtures/lightbox-site`. Keep public article routes, titles and links useful to readers. Keep artificial content for deterministic tests in an isolated Site. The public Demo and the candidate can have different revisions. Record the actual served provenance for public acceptance.
