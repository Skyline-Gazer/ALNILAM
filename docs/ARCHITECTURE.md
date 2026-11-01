# Architecture — Core / Site composition

Status: v0.1 implementation baseline; not a framework-neutral CMS.

## Invariants
1. **Core is source-controlled software** in this Monorepo; Site is user-owned config, content, data and assets.
2. The Site is an immutable input to build. The builder MUST NOT write into the original Site directory.
3. `sites/demo` is a reference fixture only. A user's Site may live in any external directory/repository.
4. Site is accepted through one stable contract: `alnilam.config.yaml`, `content/posts/`, optional `assets/`, optional `data/`. Assets are copied to `/site-assets/` after building.
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
.ads/                  # optional private ADS gitlink (cnb/dev 6e5a7df); not cloned by public CI
```

## Build algorithm
1. Resolve and validate an absolute Site source, hash the read-only inputs.
2. Copy config, content, assets and data into a deterministic snapshot under the managed build cache (keyed by Core revision and Site digest) and verify its digest against the source.
3. Run Astro in Core with `ALNILAM_SITE_DIR` pointing to the snapshot; Content Layer reads its `content/posts` and output goes to staging.
4. Copy optional snapshot assets into the staged static output (not back into Core or Site).
5. Hash the Site inputs again and abort on changes.
6. Replace the final destination from staging; retain/restore the existing output if staging fails.

The managed cache root (`<repo>/.cache/alnilam`, override `ALNILAM_CACHE_DIR`) holds
the snapshot and Astro's build-time content/image store, keyed by Core revision and
Site digest. All derived resources are generated only in the build space (cache or
staging) — never in the Site. `--clean-cache` removes it.

The staged output also carries `alnilam-provenance.json`. Its `schema` field versions
the **provenance document format** and is independent of the Site `schemaVersion`:
changing the Site contract does not relabel already-published provenance records.

**Current limits**: Do not treat this as an OS sandbox. Trusted MDX can execute build-time code. Post-relative image paths resolve in the build space only; the source Site stays read-only. Concurrent builds of the same Core revision and Site digest are serialized by a lock inside the managed cache (stale locks are stolen after six hours); concurrency/locking of two builds to the same output path and crash recovery beyond that are not yet fully specified; do not claim atomicity across power loss. Browser/performance and cross-platform behavior are not verified until CI and browser tests complete.

## Upgrade contract and user workflow
- The Core Git SHA/tag and Site SHA/tag must be pinned separately in deployment configuration.
- An external Site repository may later add Core as an immutable submodule; the builder itself does not demand a submodule.
- The caller checks out the Core version and Site version in different directories; the CLI never performs fetch/reset/checkout on Site.
- A normal Core upgrade changes only Core's selected commit. Site's content, config, assets and Git ref remain unchanged.
- Rollback selects the previous Core commit and rebuilds against the same Site commit.
- When a Site content schema changes, require explicit migration PR and a test against the old Site fixture.

## Theme boundary and P1 preview
Released v0.1.3 uses Editorial. The authorized P1 vertical slice routes the main blog pages through `themes/shirone`, while retaining the Editorial package as an unchanged rollback surface and keeping Core/Site v1 untouched. This is still a **package boundary**, not a theme marketplace or plugin SDK. Runtime theme switching, authenticated comments, server adapters, CLI install/update flows and rich Firefly/Mizuki functionality are not implemented. P1 does not authorize production release.

