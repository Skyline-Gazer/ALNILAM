# Product specification — ALNILAM v0.1

**Audience:** writers who want a Git-managed personal blog and developers who want to customize a theme without continually merging upstream Astro starter code.

**Core promise:** Upgrade platform code without rewriting articles or user configuration. Use an independent Site source as the content owner.

## Historical v0.1.3 visual contract (Editorial)
- Editorial theme: cinematic dark visual language inspired by SHBlog Next, distinct original branding and components.
- Main/home post list: **exactly one Post per row**, not a two-column masonry/grid.
- Desktop post card: readable text on the left, cover on the right at approximately 28% width.
- Mobile: single-column card with cover above content; responsive text sizing and keyboard navigation.
- Article detail: centered readable column, no mandatory right-hand article column.
- Motion: reduced-motion compliance and no required Lenis/smooth-scroll runtime.
- Dark and light palettes are implemented in `themes/editorial/src/editorial.css`; the legacy Site fixture exercises light appearance.

## Foundation v0.2.0
- Shirone-derived Material 3 Expressive presentation for the main blog pages;
  the Editorial theme remains the v0.1.x rollback surface.
- One post per row is retained: text left with an approximately 28% cover on the
  right for desktop, cover above content on mobile. Dark and light palettes,
  keyboard operation and reduced-motion support ship without a required
  smooth-scroll runtime.
- Delivered surfaces: homepage, posts index and detail, pagination, archives,
  categories, tags, series, localized routes for enabled locales, Pagefind
  search, RSS/sitemap/robots, canonical/hreflang/JSON-LD metadata, opt-in
  llms.txt v2, Giscus comments, Bangumi snapshots, Site-owned Gallery and
  Moments, static Site pages, Markdown and trusted MDX.
- Core/Site contract: YAML schema v2 with fail-closed validation, non-mutating
  staged composition, provenance (Core revision, Site ref and digest), atomic
  output swap, the documented upgrade/rollback procedure and a release artifact
  hygiene gate over final output.
- Acceptance still open at this release: field p75 performance, manual macOS
  Safari/VoiceOver, reviewed onboarding by a real user from an independently
  owned Site, and Owner product/visual sign-off. Lab browser and Lighthouse
  evidence plus the public Test-Site regression are recorded in the
  [Handoff](HANDOFF.md).

## Minimal product v0.1
- Static homepage, posts index and post detail.
- Demo Markdown post with Site-controlled frontmatter and image.
- Astro Content Layer and optional MDX integration for **trusted authored content only**.
- Svelte 5 island with intentional `client:visible` hydration.
- Core/Site CLI composition and a Site immutability test.

## Delivered and proposed scope
The v0.1.3 line included archives, tags, Pagefind, RSS/sitemap, translation
metadata, pagination, optional giscus and static Bangumi. Its category routes,
complete locale-scoped navigation and nested-base canonical defects are recorded
in the [P0 report](p0/P0-ACCEPTANCE.md); Foundation v0.2.0 supersedes that
contract.

The [historical release roadmap](ROADMAP.md) is distinct from the frozen
[Next Plan/Spec](next/01-SPEC.md). G0-F authorized P1 development; Foundation
v0.2.0 is the resulting released line. Post-release features and the next
roadmap remain separate decisions tracked in [#136](https://github.com/Skyline-Gazer/ALNILAM/issues/136).

## Non-goals for bootstrap
User authentication, admin dashboard, hosted content DB, CMS server, commercial plugin marketplace, external media hotlinking, automatic production deployment.

