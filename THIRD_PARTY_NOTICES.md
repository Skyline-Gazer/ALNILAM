# Third-party code and asset notices

**Initial bootstrap:** No implementation code or bundled third-party imagery from KIRARI, Fuwari, Mizuki, Firefly, or SHBlog Next has been directly copied into ALNILAM. The demo SVG is newly authored for this repository.

For any future code migration:
1. Identify exact upstream repository, path, commit and license.
2. Preserve original copyright/license text for MIT-origin code.
3. Retain applicable Apache-2.0 notices and mark modifications.
4. Verify asset/font licenses independently.
5. Update this file in the same PR before merge.

Upstream license summaries (not substitutes for their actual license texts):
- KIRARI, Firefly, SHBlog Next, Fuwari: MIT.
- Mizuki: Apache-2.0 with separate original MIT/third-party notices.
- ADS is pinned by Git Submodule; its guidance is read in place. The generic production-boundary guard and fixtures listed below are copied under MIT.

## ADS production-boundary policy code

Source: [Skyline-Gazer/ADS](https://github.com/Skyline-Gazer/ADS/tree/2af17d9e1d816844c49835ae91b784405765ad46), stable v0.4 commit `2af17d9e1d816844c49835ae91b784405765ad46`.

- `templates/consumer-devtools/check-production-boundary.py` → `scripts/check-ads-devtools-boundary.py` (unchanged).
- `templates/consumer-devtools/production-boundary.yml` → `.github/workflows/ads-devtools-boundary.yml` (unchanged).
- `tests/test_consumer_devtools_boundary.py` → `scripts/tests/production_boundary_test.py` (only the consumer script path adjusted).

Copyright (c) 2026 ADS contributors. MIT license text: [LICENSES/ADS-MIT.txt](LICENSES/ADS-MIT.txt). This does not relicense ALNILAM.

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
| smol-toml | MIT | Site config parsing |
| typescript | Apache-2.0 | type checking |

The composed static output embeds: the Svelte island runtime (client JS),
Pagefind's lazy-loaded index and UI assets under `/pagefind/`, and theme CSS.
Static HTML pages themselves carry no third-party content beyond the above.


