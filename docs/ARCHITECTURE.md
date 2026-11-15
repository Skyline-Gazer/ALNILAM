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
.ads/                  # optional private ADS gitlink (cnb/dev b8d9cfc); not cloned by public CI
```

## Build algorithm
1. Resolve and validate an absolute Site source, hash the read-only inputs.
2. Copy config, content, assets and data into a deterministic snapshot under the managed build cache (currently keyed by Core revision and Site digest) and verify its digest against the source.
3. Run Astro in Core with `ALNILAM_SITE_DIR` pointing at the snapshot; Content Layer reads its `content/posts` and output goes to staging. Composes serialize only while registering a per-build lock; builds with different cache keys remain concurrent. A stale lock fails closed and requires an operator to verify its recorded PID is gone before removing it; automatic stale-lock eviction is disabled because portable filesystem renames cannot preserve exclusion across competing recoverers.
4. Copy optional snapshot assets into the staged static output (not back into Core or Site).
5. Hash the Site inputs again and abort on changes.
6. Replace the final destination from staging; retain/restore the existing output if staging fails.

The managed cache root (`<repo>/.cache/alnilam`, override `ALNILAM_CACHE_DIR`) contains
an ALNILAM ownership marker and managed `v1`, `bangumi` and `shirone` namespaces.
The Site snapshot and Astro content/image state are keyed by Core revision and Site
digest; Vite's dependency cache is keyed by Core revision. Bangumi snapshots are scoped by
user ID, subject type and limit. Covers are emitted into staged output, not the Site.
Shirone's Site-independent compiled modules use a fingerprint of Core source,
dependency lock/configuration, Node version and target platform. Their content-hashed
bundles are shared across Site digests and Core revisions only when that fingerprint
matches; a manifest and SHA-256 check verify every reuse. Shirone's mutable generated
state remains under the Core-revision/Site-digest build directory.

Normal builds never remove project-local generated or legacy directories.
`--clean-cache` verifies the root marker, acquires the cache-operation lock, rejects
active builds, symlinks, hard-linked files and nested filesystem boundaries, then removes
only the three managed namespaces. Unknown files beside those namespaces are preserved.
`--gc-cache --dry-run` reports each managed candidate's logical and allocated bytes,
last successful use and planned action. `--gc-cache` applies a 14-day unused TTL and a
2 GiB allocated-size limit, evicting oldest candidates first; `ALNILAM_CACHE_TTL_DAYS`
and `ALNILAM_CACHE_MAX_BYTES` override those defaults. GC serializes with build admission,
rejects active builds and fails closed on symlinks, hard links, unexpected entries or
filesystem boundaries. Use `--clean-legacy --dry-run` to inspect allowlisted project
paths; explicit `--clean-legacy` removes only empty allowlisted directories, leaving
content without a verified ownership manifest untouched.

The staged output also carries `alnilam-provenance.json`: the Core revision, the Site
ref (`ALNILAM_SITE_REF`, or the Site's own Git `HEAD` when the Site directory is its
own Git root, otherwise `unversioned`) and the SHA-256 digest of the read-only Site
inputs. Its `schema` field versions the **provenance document format** and is
independent of the Site `schemaVersion`: changing the Site contract does not relabel
already-published provenance records.

**Current limits**: Do not treat this as an OS sandbox. Trusted MDX can execute build-time code. Post-relative image paths resolve in the build space only; the source Site stays read-only. Concurrent publishes to the same output path remain last-writer-wins by rename (the previous output is restored if the rename fails), and atomicity across power loss is not claimed. Browser/performance and cross-platform behavior are not verified until CI and browser tests complete.

## Upgrade contract and user workflow
- The Core Git SHA/tag and Site SHA/tag must be pinned separately in deployment configuration.
- An external Site repository may later add Core as an immutable submodule; the builder itself does not demand a submodule.
- The caller checks out the Core version and Site version in different directories; the CLI never performs fetch/reset/checkout on Site.
- A normal Core upgrade changes only Core's selected commit. Site's content, config, assets and Git ref remain unchanged.
- Rollback selects the previous Core commit and rebuilds against the same Site commit.
- When a Site content schema changes, require explicit migration PR and a test against the old Site fixture.
- Local/CI acceptance is `scripts/upgrade-check.mjs --old <sha> [--site <path>]`: same Site digest across current and old Core builds; expected fail-closed rejections (retired TOML requirement, unsupported `schemaVersion`, unknown config fields) still pass the non-mutation check.

## Theme boundary and P1 preview
Released v0.1.3 uses Editorial. The authorized P1 vertical slice routes the main blog pages through `themes/shirone`, while retaining the Editorial package as an unchanged rollback surface and keeping Core/Site v1 untouched. This is still a **package boundary**, not a theme marketplace or plugin SDK. Runtime theme switching, authenticated comments, server adapters, CLI install/update flows and rich Firefly/Mizuki functionality are not implemented. P1 does not authorize production release.

## Comments boundary
Comments are an optional Site module, not a Core platform service. The Site owns
`comments.enabled`, the Giscus public identifiers and the identity policy
(`mapping`, `sharing`, `load`, `lang`, `csp`). `packages/ui/src/Comments.svelte`
renders the disclosure/gate/fallback UI and delegates to exactly one
`GiscusProvider` implementation (`packages/ui/src/comments/giscus.ts`), which
owns the script, iframe, theme/language updates, observers and teardown.
`apps/web/src/lib/comments.mjs` derives the stable Discussion term from
`commentId`, `translationKey` or the content id and emits the provider-scoped
CSP; it never uses the deployment URL as the default identity.

Disabled comments ship no island, component JavaScript or CSS, script, iframe,
placeholder DOM or third-party request. The build-time comments entry imports
the island only when the Site enables comments. Enabled comments either wait
for an explicit click (`load: click`, default) or load near the viewport
(`load: visible`). Twikoo and Waline are not
installed: they require separately operated persistence/backends and are
post-launch evaluations rather than a second widget on the same article.

