# Product specification — ALNILAM v0.1

**Audience:** writers who want a Git-managed personal blog and developers who want to customize a theme without continually merging upstream Astro starter code.

**Core promise:** Upgrade platform code without rewriting articles or user configuration. Use an independent Site source as the content owner.

## Released v0.1.3 visual contract
- Editorial theme: cinematic dark visual language inspired by SHBlog Next, distinct original branding and components.
- Main/home post list: **exactly one Post per row**, not a two-column masonry/grid.
- Desktop post card: readable text on the left, cover on the right at approximately 28% width.
- Mobile: single-column card with cover above content; responsive text sizing and keyboard navigation.
- Article detail: centered readable column, no mandatory right-hand article column.
- Motion: reduced-motion compliance and no required Lenis/smooth-scroll runtime.
- Dark and light palettes are implemented in `themes/editorial/editorial.css`; the legacy Site fixture exercises light appearance.

## Minimal product v0.1
- Static homepage, posts index and post detail.
- Demo Markdown post with Site-controlled frontmatter and image.
- Astro Content Layer and optional MDX integration for **trusted authored content only**.
- Svelte 5 island with intentional `client:visible` hydration.
- Core/Site CLI composition and a Site immutability test.

## Delivered and proposed scope
v0.1.3 includes archives, tags, Pagefind, RSS/sitemap, translation metadata, pagination, optional giscus and static Bangumi. Categories and complete locale-scoped navigation are not delivered. Nested-base canonical/link defects and the limits of current artifact checks are recorded in the [P0 report](p0/P0-ACCEPTANCE.md).

The [historical release roadmap](ROADMAP.md) is distinct from the unapproved [Next Plan/Spec in PR #77](https://github.com/Skyline-Gazer/ALNILAM/pull/77). Shirone remains the sole proposed Next frontend; P0 evidence does not authorize P1, optional modules or production changes.

## Non-goals for bootstrap
User authentication, admin dashboard, hosted content DB, CMS server, commercial plugin marketplace, external media hotlinking, automatic production deployment.

