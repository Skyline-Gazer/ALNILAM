# Product specification — ALNILAM v0.1

**Audience:** writers who want a Git-managed personal blog and developers who want to customize a theme without continually merging upstream Astro starter code.

**Core promise:** Upgrade platform code without rewriting articles or user configuration. Use an independent Site source as the content owner.

## Visual specification (target; bootstrap implements only basic layouts)
- Editorial theme: cinematic dark visual language inspired by SHBlog Next, distinct original branding and components.
- Main/home post list: **exactly one Post per row**, not a two-column masonry/grid.
- Desktop post card: readable text on the left, cover on the right at approximately 28% width.
- Mobile: single-column card with cover above content; responsive text sizing and keyboard navigation.
- Article detail: centered readable column, no mandatory right-hand article column.
- Motion: reduced-motion compliance and no required Lenis/smooth-scroll runtime.
- Dark-first appearance; true light palette is not yet implemented, despite initial config accepting the value.

## Minimal product v0.1
- Static homepage, posts index and post detail.
- Demo Markdown post with Site-controlled frontmatter and image.
- Astro Content Layer and optional MDX integration for **trusted authored content only**.
- Svelte 5 island with intentional `client:visible` hydration.
- Core/Site CLI composition and a Site immutability test.

## Planned milestones
P0 Core/Site compatibility and tested builds; P1 visual system and accessibility; P2 archives, categories, tags, Pagefind, RSS, sitemap, i18n; P3 modular comments, music, gallery, moments, bangumi; P4 hardening, performance budgets, docs, cross-host deployment. See [ROADMAP.md](ROADMAP.md).

## Non-goals for bootstrap
User authentication, admin dashboard, hosted content DB, CMS server, commercial plugin marketplace, external media hotlinking, automatic production deployment.

