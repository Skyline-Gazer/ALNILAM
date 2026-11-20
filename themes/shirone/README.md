# Shirone frontend Base

The theme package exports the actual pinned Shirone layouts, pages and components
from `upstream/`. Use these exports for new frontend work, for example
`@alnilam/theme-shirone/MainGridLayout.astro` and `PostPage.astro`.
`src/` contains the historical local adaptation; it is not a package export or
an active route dependency. Its old token tests do not verify the native UI.

`upstream/SOURCE.json` binds the original source to
`LyraVoid/Shirone@55a84b2322bdfb634a59ca6383bb242e5ce646bf` and lists every
consumer patch. Preserve the original MIT license and third-party notices.
Do not copy upstream demo content, artwork, fonts or content-sync scripts.

`adapter/site-config.mjs` reads the existing validated immutable Site. The app
publishes resolved public config values to browser modules; it never bundles the
Node filesystem/YAML loader. Content field mappings are in the app's existing
content collection, without changing Site files. ALNILAM retains routing,
optional-module gating, comments, Pagefind generation, composition and provenance.

Migration is WIP in CNB PR #47 / GitHub #61. Native browser behavior and unchanged
Site digests are verified separately from performance budgets and native CI.
Do not equate a successful build, token test or screenshot count with acceptance.
