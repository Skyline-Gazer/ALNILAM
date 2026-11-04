# Third-party code and asset notices

**Initial bootstrap:** No implementation code or bundled third-party imagery from KIRARI, Fuwari, Mizuki, Firefly, or SHBlog Next has been directly copied into ALNILAM. The demo SVG is newly authored for this repository.

## Shirone frontend adoption (P1 #48)

**2026-11-03 correction in progress:** the initial local adaptation is insufficient
as the actual Shirone Base. Native text source at the pinned SHA is being integrated
under `themes/shirone/upstream/`; original MIT text is retained in its `LICENSE`, and
per-file source hashes plus consumer modifications are in `SOURCE.json`. No upstream
content, binary assets/fonts, content-sync scripts or workflows are imported.
Original layout, sidebar, navigation, card, HCT and offline-icon code now drive the
working homepage candidate; full route/runtime/CI validation is still pending.


Source: [LyraVoid/Shirone](https://github.com/LyraVoid/Shirone) at commit `55a84b2322bdfb634a59ca6383bb242e5ce646bf`. MIT license text: [LICENSES/Shirone-MIT.txt](LICENSES/Shirone-MIT.txt).

The initial vertical slice adapts visual structure from:

- `src/components/organisms/PostCard.astro` and `src/components/atoms/blog/PostCard.astro`: one-post-per-row card with text left and 28% cover right on desktop, cover above content on mobile.
- `src/components/organisms/TopAppBar.astro`: sticky Material 3 top app bar, brand mark, centered navigation, and compact light/dark control.
- `src/layouts/Layout.astro` and `src/utils/theme-utils.ts`: M3E surface/role vocabulary and light/dark scheme semantics, implemented here as static CSS tokens without the upstream HCT runtime.
- `src/styles/variables.styl`: token names only; colors and layout are locally defined for ALNILAM.

No Shirone fonts, images, character artwork, demo media, music, or other binary assets were copied. That initial slice did not import the upstream Astro integration, HCT engine or icon runtime. The current correction integrates the original frontend integration, HCT and offline icons; bundled router integrations remain disabled, and system fonts are selected. ALNILAM owns `themes/shirone/src/*` modifications and retains Apache-2.0 licensing for its original code.

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
- ADS is pinned by Git Submodule; its guidance is read in place and no policy code is copied into this repository.

## Runtime and build dependencies (npm)

All dependencies are consumed as unmodified npm packages under their own licenses;
no vendor code is copied into this repository. Summary at v0.1.0 (see
`pnpm-lock.yaml` for exact resolved versions):

| Package | License | Role |
|---|---|---|
| astro, @astrojs/mdx, @astrojs/svelte, @astrojs/check | MIT | static site framework + integrations |
| svelte | MIT | island runtime (search, status) |
| tailwindcss, @tailwindcss/vite | MIT | styling engine |
| pagefind | MIT | local search indexer + lazy runtime |
| yaml | MIT | Site config parsing |
| typescript | Apache-2.0 | type checking |

The composed static output embeds: the Svelte island runtime (client JS),
Pagefind's lazy-loaded index and UI assets under `/pagefind/`, and theme CSS.
Static HTML pages themselves carry no third-party content beyond the above.


