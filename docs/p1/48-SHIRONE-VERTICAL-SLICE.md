# P1 #48 — Shirone frontend vertical slice

**Status:** implementation candidate for review; this is not P1 closure and not a production release.

**Scope authorization:** [G0-F decision](../next/08-G0-F-DECISION.md), [Issue #48](https://github.com/Skyline-Gazer/ALNILAM/issues/48), parent [Issue #37](https://github.com/Skyline-Gazer/ALNILAM/issues/37).

**Baseline:** `dev` = `e0ff5177b7cb5f4a7803325b5a552883f24cd61a` (merged PR #77). Post-merge CI run: <https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40326089246> (PASS).

**Reference source:** `LyraVoid/Shirone@55a84b2322bdfb634a59ca6383bb242e5ce646bf`, MIT. Upstream fonts, images, demo media, HCT runtime and Swup are not included.

## Slice boundary

This slice moves the user-facing blog pages to a locally owned Shirone-derived theme while retaining ALNILAM Core/Site v1, composition, search and optional-module contracts.

In scope:

- Homepage, posts index, article detail, archives, tags index and tag listing.
- Desktop one-post-per-row layout with text left and approximately 28% cover on the right.
- Mobile cover-before-content ordering.
- Static dark/light M3E token themes, keyboard focus and reduced-motion handling.
- Root-hosted and nested `/ALNILAM/` URL/canonical/search behavior.
- Browser acceptance at 1440px and 390px, including navigation back to the post list.
- Disabled Bangumi route absence for the default fixture.

Not in this slice:

- P1 completion or closure of #37.
- Shirone HCT color generation, Swup, upstream fonts/media/icons or optional gallery/moments/music modules.
- Production `main`, tagging, deployment, provider cutover or new persistent infrastructure.

## Reuse decisions

| Existing ALNILAM asset | Decision | Implementation |
| --- | --- | --- |
| `scripts/compose.mjs`, Site v1 contract, provenance and rollback | **KEEP** | No schema or Site input change; demo digest remains `7e7500946378db5173f52294bf9662744ce40086a526d7cb40c0a3bf4f8a9db5`. |
| Astro routes, content collection, pagination, archive/tag logic | **WRAP** | Existing route logic retained; its presentation imports the Shirone layout/card package. |
| `packages/ui/src/Search.svelte`, Pagefind pipeline | **ADAPT** | Keep the island and index; normalize `BASE_URL` before resolving Pagefind and set the same normalized `baseUrl`. |
| Optional comments and Bangumi | **KEEP** | Configuration and static behavior retained. Bangumi page moved from `src/pages/opt/` to `src/modules/` and is injected only when enabled. |
| `themes/editorial` | **KEEP** | Unmodified and available as the immediate rollback surface. |
| `themes/shirone` | **ADAPT** | New local package containing a static M3E token layer, base layout and post card derived from the pinned reference structure. |
| CI and contract tests | **ADAPT** | Added nested-base URL checks, nested Pagefind assertion, disabled-Bangumi assertion and Playwright browser acceptance. |

No existing production subsystem is marked REPLACE or RETIRE in this slice.

## Verification evidence

Local implementation evidence:

- `pnpm test`: contract tests PASS.
- `pnpm check`: Astro/TypeScript check clean.
- `pnpm build`: demo composed and artifact budgets PASS; 13 pages.
- Nested compose with `ALNILAM_SITE_URL=https://example.com/ALNILAM/`: 13 pages, Pagefind index present, artifact budgets PASS.
- Both generated roots contain zero `bangumi`/`opt` route output for the default fixture.
- `pnpm browser`: root and `/ALNILAM/` desktop flows, 390px mobile flow, dark/light themes, keyboard order, Pagefind search, article return and card geometry PASS.
- Browser network journal confirms nested Pagefind requests use `/ALNILAM/pagefind/` (not origin-root `/pagefind/`).
- Theme choice persists across navigation and is applied to the optional Giscus comments surface; article list markers and table layout have dedicated regression coverage.
- A temporary sixth post is composed under `/ALNILAM/` in the contract suite to verify pagination links contain exactly one deploy-base prefix.

Screenshots are generated in ignored `browser-results/` and uploaded by CI as `browser-evidence`; they are intentionally not committed.

Remote CI, PR and final implementation SHA are recorded in the PR and phase checkpoint after this document lands. Until then, treat those fields as pending rather than PASS.

## Rollback

The Site is unchanged. To return to the released Editorial presentation, restore the prior page markup as well as the six page imports from `@alnilam/theme-shirone/*` to `@alnilam/theme-editorial/*`, then rebuild the same Site revision. Restoring imports alone is insufficient because the routes now use Shirone-specific layout classes. The simplest source rollback is to revert this slice's page commits while retaining the later fixes; `themes/editorial` and the existing Core/Site contract remain present, so this does not require content migration or a Site write.

For an operational rollback, check out the previous Core revision and compose the same unchanged Site into a separate output directory before swapping the served artifact.

## Known limits

- This is one vertical slice, not completion of all P1/#37 acceptance.
- HCT-derived color roles, Swup lifecycle integration and upstream visual assets are deliberately omitted.
- Browser evidence covers the demo Site and the two specified host bases; it is not a complete accessibility audit or performance certification.
- CI browser evidence is retained as artifacts, not reviewed as committed golden screenshots.
