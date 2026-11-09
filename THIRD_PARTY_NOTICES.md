# Third-party code and asset notices

The initial bootstrap identified KIRARI, Fuwari, Mizuki, Firefly and SHBlog
Next as design or engineering references; see [CREDITS.md](CREDITS.md). That
historical statement is not an audit of all later source changes or assets.

## Shirone frontend adoption (P1 #48)

Native Shirone text source is retained under `themes/shirone/upstream/`; its
MIT license is retained there, and `SOURCE.json` records upstream file hashes
and consumer modifications. The import excludes upstream asset and content
directories and upstream scripts and workflows.


Source: [LyraVoid/Shirone](https://github.com/LyraVoid/Shirone) at commit `55a84b2322bdfb634a59ca6383bb242e5ce646bf`. MIT license text: [LICENSES/Shirone-MIT.txt](LICENSES/Shirone-MIT.txt).

The initial vertical slice adapts visual structure from:

- `src/components/organisms/PostCard.astro` and `src/components/atoms/blog/PostCard.astro`: one-post-per-row card with text left and 28% cover right on desktop, cover above content on mobile.
- `src/components/organisms/TopAppBar.astro`: sticky Material 3 top app bar, brand mark, centered navigation, and compact light/dark control.
- `src/layouts/Layout.astro` and `src/utils/theme-utils.ts`: M3E surface/role vocabulary and light/dark scheme semantics, implemented here as static CSS tokens without the upstream HCT runtime.
- `src/styles/variables.styl`: token names only; colors and layout are locally defined for ALNILAM.

The import excludes Shirone's upstream asset and content directories. The initial
slice did not import the upstream Astro integration, HCT engine or icon runtime;
the current integration includes frontend integration, HCT and offline icons.
ALNILAM's original code remains Apache-2.0; copied and adapted Shirone code
retains its MIT license.

Native icon runtime dependencies retain their package notices. Attribution for the
bundled offline icon data: Font Awesome 7 Free Solid/Brands by Dave Gandy / Fonticons
([source](https://github.com/FortAwesome/Font-Awesome)),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); Material Symbols by Google
([source and Apache-2.0 license](https://github.com/google/material-design-icons));
Simple Icons by the Simple Icons Collaborators
([source and CC0-1.0 license](https://github.com/simple-icons/simple-icons)).
Shirone/Iconify convert and select these icons for offline rendering; ALNILAM does
not alter the underlying icon drawings. Layout/runtime sizing and color follow the theme.

For any future code migration:
1. Identify exact upstream repository, path, commit and license.
2. Preserve original copyright/license text for MIT-origin code.
3. Retain applicable Apache-2.0 notices and mark modifications.
4. Verify asset/font licenses independently.
5. Update this file in the same PR before merge.

Upstream license summaries (not substitutes for their actual license texts):
- KIRARI, Firefly, SHBlog Next, Fuwari: MIT.
- Mizuki: Apache-2.0 with separate original MIT/third-party notices.
- ADS is pinned as a Git submodule. Earlier history included copied ADS production-boundary code and fixtures from [ADS commit `2af17d9e1d816844c49835ae91b784405765ad46`](https://github.com/Skyline-Gazer/ADS/tree/2af17d9e1d816844c49835ae91b784405765ad46); the historical mapping is in ALNILAM commit `8e6ce58402fdf4feda888fe8f4fe13687338e504`. The retained MIT text is [LICENSES/ADS-MIT.txt](LICENSES/ADS-MIT.txt). This history is not evidence of a complete current-file provenance audit.

## Runtime and build dependencies (npm)

The following is a selected dependency summary, not a complete license inventory.
Dependencies and transitive versions are resolved in `pnpm-lock.yaml`; each
package retains its own license. Vendored Shirone source is described above.

| Package | License | Role |
|---|---|---|
| astro, @astrojs/mdx, @astrojs/svelte, @astrojs/check | MIT | static site framework + integrations |
| svelte | MIT | island runtime (search, status) |
| tailwindcss, @tailwindcss/vite | MIT | styling engine |
| pagefind | MIT | local search indexer + lazy runtime |
| photoswipe | MIT | lightbox gallery |
| khroma | MIT (package `license` file) | transitive color utility |
| yaml | MIT | Site config parsing |
| typescript | Apache-2.0 | type checking |
| @axe-core/playwright | MPL-2.0 | Playwright axe WCAG runner (dev/test only) |
| axe-core (transitive via @axe-core/playwright) | MPL-2.0 | accessibility engine used by a11y.spec.ts |

The composed output can contain third-party material including Svelte runtime,
Pagefind assets, theme code and selected icon data. The contents depend on the
Site and enabled features; this list is not exhaustive. Site owners are responsible
for the rights to their own content and assets.

## Outstanding release evidence (#75)

| Risk | Disposition and evidence |
|---|---|
| Asset rights | **NOT VERIFIED for final acceptance.** The P0 audit excludes upstream media without separate rights evidence ([P0 acceptance](docs/p0/P0-ACCEPTANCE.md)). The raster fixture `sites/demo/assets/lighthouse.png` entered in commit `a5f2bae108458f21578060063343483652dc2c7e`; that commit does not establish its authorship or redistribution grant. Confirm its provenance or replace it before claiming an authorized asset inventory. External Site assets and build-time provider content require their own rights review. |
| Fancyapps UI | **REMOVED.** `@fancyapps/ui` is no longer a dependency or redistributable. The lightbox runtime uses MIT `photoswipe@5.4.4` via the retained `FancyboxHandler` compatibility façade. Fancyapps is not shipped in lockfile, themes, or built assets. |
| Dependency and source licenses | **PARTIAL.** Shirone's pinned source ledger and license are retained, but the selected dependency list above is not a transitive license inventory or a final source-license scan. The historical [CNB evidence](docs/cnb/CNB-REVIEW.md) says SourceSCA was not configured for those runs; those older results do not establish current-head acceptance. |
| Credentials | **NOT VERIFIED for final acceptance.** The workflow documents read-only Site credentials and disables persisted checkout credentials ([site-ci.yml](.github/workflows/site-ci.yml)); marker-boundary tests exist in `scripts/tests/secrets-boundary.test.mjs`. These controls and tests do not prove that the current tree, history, artifacts or logs contain no secrets. A scoped secret review and remediation of any finding remain necessary. |
| Supply chain and build | **PARTIAL.** The lockfile pins resolved dependencies, and historical CNB evidence describes earlier vulnerability and license checks. Current-head dependency risk review and disposition, plus source-bound PR and remote CI evidence, remain outstanding. |


