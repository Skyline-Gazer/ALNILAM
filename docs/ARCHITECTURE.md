# Architecture — Core / Site composition

Status: v0.1 implementation baseline; not a framework-neutral CMS.

## Invariants
1. **Core is source-controlled software** in this Monorepo; Site is user-owned config, content, data and assets.
2. The Site is an immutable input to build. The builder MUST NOT write into the original Site directory.
3. `sites/demo` is a reference fixture only. A user's Site may live in any external directory/repository.
4. Site is accepted through one stable contract: `alnilam.config.toml`, `content/posts/`, optional `assets/`, optional `data/`. Assets are copied to `/site-assets/` after building.
5. No hosting API, database or runtime server is required to serve output. Astro produces static HTML.
6. Core upgrade must not require merging Core files with Site content. Any content schema changes must be versioned, validated and accompanied by a migration strategy.
7. No secret is stored in a public Site config, or supplied through `PUBLIC_*` variables.

## Source tree
```
apps/web/              # Astro assembly app, build & route entrypoints
packages/core/         # shared site config contract; no Astro dependency
packages/ui/           # Svelte UI islands
themes/editorial/      # released visual layout + rollback surface
themes/shirone/        # P1 Shirone-derived layout, tokens and Post card
sites/demo/            # Core-repo Site fixture (only for tests & preview)
scripts/compose.mjs    # non-mutating external Site builder
.ads/                  # optional private ADS v0.4.1 gitlink; not cloned by public CI
```

## Build algorithm
1. Resolve and validate an absolute Site source, hash the read-only inputs.
2. Run Astro in Core with `ALNILAM_SITE_DIR` pointing to the source and output redirected into a temporary staging folder.
3. Astro Content Layer `glob` reads `content/posts` from that Site; pages remain in Core.
4. Copy optional Site assets into the staged static output (not back into Core or Site).
5. Hash the Site inputs again and abort on changes.
6. Replace the final destination from staging; retain/restore the existing output if staging fails.

**Current limits**: Do not treat this as an OS sandbox. Trusted MDX can execute build-time code. Relative asset paths and site configuration compatibility require further P0 checks. Concurrency/locking of two builds to the same output path and crash recovery are not yet fully specified; do not claim atomicity across power loss. Browser/performance and cross-platform behavior are not verified until CI and browser tests complete.

## Upgrade contract and user workflow
- The Core Git SHA/tag and Site SHA/tag must be pinned separately in deployment configuration.
- An external Site repository may later add Core as an immutable submodule; the builder itself does not demand a submodule.
- The caller checks out the Core version and Site version in different directories; the CLI never performs fetch/reset/checkout on Site.
- A normal Core upgrade changes only Core's selected commit. Site's content, config, assets and Git ref remain unchanged.
- Rollback selects the previous Core commit and rebuilds against the same Site commit.
- When a Site content schema changes, require explicit migration PR and a test against the old Site fixture.

## Theme boundary and P1 preview
Released v0.1.3 uses Editorial. The authorized P1 vertical slice routes the main blog pages through `themes/shirone`, while retaining the Editorial package as an unchanged rollback surface and keeping Core/Site v1 untouched. This is still a **package boundary**, not a theme marketplace or plugin SDK. Runtime theme switching, authenticated comments, server adapters, CLI install/update flows and rich Firefly/Mizuki functionality are not implemented. P1 does not authorize production release.

