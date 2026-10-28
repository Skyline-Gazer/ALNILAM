# ADR 0002 — Keep native MPA routing and repair the existing Pagefind island

**Status:** Proposed in [PR #97](https://github.com/Skyline-Gazer/ALNILAM/pull/97), pending review. **Issue:** [#49](https://github.com/Skyline-Gazer/ALNILAM/issues/49).

## Context

The Shirone-derived application already uses Astro file-based routes and ordinary links. `apps/web` has no Swup, Astro `ClientRouter` or `astro:transitions` runtime. Pagefind 1.5.2 is generated once against the staged static output and loaded lazily by the existing Svelte search island.

Testing exposed two search lifecycle defects: a close/reopen during the dynamic import could initialize Pagefind twice, and a slower response could overwrite results for a newer query. Component teardown also left a pending debounce and response valid.

Astro pagination and article routes share `/posts/<number>/` for numeric default-locale slugs. Astro warned about the conflict and silently omitted the article from output. Existing Site v1 URLs must remain stable.

## Decision

1. Keep native Astro multipage routing and native browser navigation. Do not add Swup, `ClientRouter` or view-transition runtime without measured behavior requirements and the #50 lifecycle matrix.
2. Repair `Search.svelte` in place: guard lazy initialization, reject stale results, clear debounce and invalidate in-flight responses on destruction.
3. Keep existing Site v1 locale helpers and route URLs. Fail the build when a published default-locale numeric post slug collides with a currently generated pagination route.
4. Keep current custom RSS/sitemap and static-image output until an official API comparison proves equivalent behavior and a measurable benefit.
5. Preserve Astro 7.4.2 as the actual `dev` lock resolution. Compare it with the pinned Shirone 7.3.8 baseline in isolated Issue #79; do not change framework versions as an incidental #49 change.

## Consequences

The platform has one route/navigation owner and one search engine. A Site containing a colliding numeric slug now fails closed with an actionable message, and its owner must choose a non-conflicting slug. The existing search UI, generated index, canonical URL policy, theme store and feed output remain in place.

## Alternatives considered

- **Swup:** rejected; it would add another navigation lifecycle without a demonstrated gap.
- **Astro `ClientRouter` or native view transitions:** deferred to #50 measurements; no persistent application state currently requires client routing.
- **Replace Pagefind:** rejected; the defects are in the existing island lifecycle, not the index engine.
- **Move pagination URLs or locale routes:** rejected; it would change existing Site v1 links.
- **Adopt `@astrojs/rss`, `@astrojs/sitemap` or image APIs in this PR:** deferred because no tested output gap or scoped benefit justifies the migration.

## Rollback

Revert the #49 implementation commits on the feature branch and rebuild the unchanged Site using the prior Core revision. This restores the previous search lifecycle and collision behavior; it does not mutate Site inputs.
