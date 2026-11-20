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

The Demo emits offline SVG icon data from Font Awesome 7 Free Solid and Brands
under CC BY 4.0 and Material Symbols by Google under Apache-2.0. The retained
Font Awesome attribution identifies the upstream icon and Iconify package versions.
Site configurations can also select Simple Icons by the Simple Icons Collaborators
under CC0-1.0. Shirone and Iconify select and convert the icons for offline
rendering while preserving the drawings.

- [Font Awesome SVG icon notice](LICENSES/Font-Awesome-Icons-CC-BY-4.0.txt)
- [Material Symbols source and Apache-2.0 license](https://github.com/google/material-design-icons)
- [Simple Icons source and CC0-1.0 license](https://github.com/simple-icons/simple-icons)

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
| svelte 5.57.2 | MIT (see [LICENSES/Svelte-MIT.txt](LICENSES/Svelte-MIT.txt)) | island runtime (search, status) |
| tailwindcss, @tailwindcss/vite | MIT | styling engine |
| pagefind 1.5.2 | MIT (package: [LICENSES/Pagefind-MIT.txt](LICENSES/Pagefind-MIT.txt); web runtime: [LICENSES/Pagefind-Web-Runtime-MIT.txt](LICENSES/Pagefind-Web-Runtime-MIT.txt); included vscode-ripgrep: [LICENSES/Pagefind-vscode-ripgrep-MIT.txt](LICENSES/Pagefind-vscode-ripgrep-MIT.txt)) | local search indexer + lazy JS/WASM runtime |
| photoswipe 5.4.4 | MIT (see [LICENSES/PhotoSwipe-MIT.txt](LICENSES/PhotoSwipe-MIT.txt)) | lightbox gallery runtime |
| katex 0.16.47 | MIT (see [LICENSES/KaTeX-MIT.txt](LICENSES/KaTeX-MIT.txt)) | Markdown math rendering and stylesheet |
| KaTeX fonts (12 families) | SIL OFL 1.1 (see [LICENSES/KaTeX-Fonts-OFL-1.1.txt](LICENSES/KaTeX-Fonts-OFL-1.1.txt)) | bundled Markdown math font assets |
| mermaid | MIT (see [LICENSES/Mermaid-MIT.txt](LICENSES/Mermaid-MIT.txt)) | conditional client rendering for Mermaid Markdown diagrams |
| khroma | MIT (see [LICENSES/Khroma-MIT.txt](LICENSES/Khroma-MIT.txt); package.json omits license) | Mermaid transitive color utility, version 2.1.0 |
| yaml | MIT | Site config parsing |
| typescript | Apache-2.0 | type checking |
| @axe-core/playwright | MPL-2.0 | Playwright axe WCAG runner (dev/test only) |
| axe-core (transitive via @axe-core/playwright) | MPL-2.0 | accessibility engine used by a11y.spec.ts |

The [Demo client dependency notices](LICENSES/Demo-Client-Dependencies.txt)
preserve original texts for components identified in emitted browser bundles and
generated assets, including the Mermaid dependency tree members found in the
bundle and the prebuilt Pagefind JavaScript dependencies identified from its
release sources and packaged assets. Both shipped Pagefind WebAssembly variants
(English and fallback) identify `minicbor` 2.2.1 and `wasm-bindgen` 0.2.117.
Their licenses are retained in the same file. Other Rust dependencies listed in
Pagefind's build lockfile still need to be matched to the emitted binaries.
The KaTeX font notice preserves the copyright and Reserved Font Name declarations
from the font metadata. Site owners remain responsible for their own content and
assets and for accompanying notices when distributing composed output.

## Demo distribution artifacts

Compose copies `LICENSE`, `NOTICE`, `CREDITS.md`, this file, and regular `.txt`
files from `LICENSES/` to `site-assets/alnilam-notices/` in the bundled Demo's
output. The Vercel and GitHub Pages Demo entrypoints both use this path. The copy
is selected by the bundled Demo directory in the Core checkout, so copies of the
Demo elsewhere are composed as independent Sites. The notices are plain files
without an HTML page, navigation entry, footer link, or Site source changes.

The Demo packages the self-contained `orion.svg` introduced in `802e804`,
the lighthouse illustration and its PNG render, and the default social card PNG
rendered from vector markup in `apps/web/src/pages/og-default.png.js`. The latter
contains no font or external image. Gallery examples reference three Unsplash
CDN photos directly from generated HTML. Their image bytes are absent from the
artifact. Original photo pages and photographer identities remain unverified.

## Outstanding release evidence (#75)

| Risk | Disposition and evidence |
|---|---|
| Asset rights | **CURRENT DEMO ARTIFACT REPLACED; HISTORICAL BLOB UNVERIFIED.** The current `sites/demo/assets/lighthouse.png` is rendered from the authored `sites/demo/assets/lighthouse-artwork.svg`, distributed under ALNILAM's Apache-2.0 license. This replaces the undocumented raster from commit `a5f2bae108458f21578060063343483652dc2c7e`; the old blob remains in Git history, so its rights are still unverified and no history rewrite is claimed. External Site assets and build-time provider content require their own rights review. |
| Fancyapps UI | **REMOVED.** `@fancyapps/ui` is no longer a dependency or redistributable. The lightbox runtime uses MIT `photoswipe@5.4.4` via the retained `FancyboxHandler` compatibility façade. Fancyapps is not shipped in lockfile, themes, or built assets. |
| Dependency and source licenses | **PARTIAL.** The Shirone MIT text and 480 original source hashes match the pinned upstream archive. The scoped Demo bundle notices cover the components above. Full source attribution outside the retained Shirone manifest and the remaining Pagefind WebAssembly dependencies are unverified. Historical [CNB evidence](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/cnb/CNB-REVIEW.md) cannot establish current-head coverage. |
| Credentials | **NOT VERIFIED for final acceptance.** The workflow documents read-only Site credentials and disables persisted checkout credentials ([site-ci.yml](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/.github/workflows/site-ci.yml)); marker-boundary tests exist in [secrets-boundary.test.mjs](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/scripts/tests/secrets-boundary.test.mjs). These controls and tests do not prove that the current tree, history, artifacts or logs contain no secrets. A scoped secret review and remediation of any finding remain necessary. |
| Supply chain and build | **PARTIAL.** The lockfile pins resolved dependencies, and historical CNB evidence describes earlier vulnerability and license checks. Current-head dependency risk review and disposition, plus source-bound PR and remote CI evidence, remain outstanding. |


