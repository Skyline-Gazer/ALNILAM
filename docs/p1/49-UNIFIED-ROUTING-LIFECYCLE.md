# P1 #49 — Unified dependencies, routing and browser lifecycle

**Status:** implementation and evidence are proposed in [PR #97](https://github.com/Skyline-Gazer/ALNILAM/pull/97); review and merge remain pending.

**Issue:** [#49](https://github.com/Skyline-Gazer/ALNILAM/issues/49) · **Parent:** [#37](https://github.com/Skyline-Gazer/ALNILAM/issues/37) · **Base:** `dev` at `1f382aa72052eedbe8a2809011e5a36a82f697d0` (post-#95).

## Dependency inventory

| Area | Before | After | Decision |
| --- | --- | --- | --- |
| Workspace | pnpm 10.19.0; frozen `pnpm-lock.yaml` | unchanged | **KEEP**; no lockfile resolution churn |
| Astro | `^7.3.5`, lock resolves 7.4.2 | unchanged at 7.4.2 | **KEEP**; compare with Shirone 7.3.8 in isolated #79 |
| Astro integrations | `@astrojs/mdx` 8.1.1; `@astrojs/svelte` 9.1.1 | unchanged | **KEEP**; one MDX and one Svelte integration |
| Svelte | 5.57.2 | unchanged | **KEEP** |
| Search | Pagefind 1.5.2; generated once after Astro into staged output | unchanged | **KEEP** the indexer and lazy client import |
| Theme package edge | `@alnilam/editorial` declared by `apps/web` but not imported | removed from the web app dependency list | **ADAPT** the dependency graph; retain `themes/editorial` in the workspace as the release rollback package |
| Runtime router | Astro file routes; no Swup, `ClientRouter` or `astro:transitions` dependency | unchanged | **KEEP** native multipage navigation |

The package declares Node `>=22.23.4`; the repository pins pnpm `10.19.0`. Existing CI uses Node 24. The tested local runtime is recorded with the command results below. No Astro, integration, Svelte or Pagefind version was changed in this Issue.

## Route and URL audit

Astro file routing is the only route owner:

- `/` — home.
- `/posts/` and `/posts/<page>/` — native `paginate()` with page size 5.
- `/posts/<slug>/` and `/posts/<locale>/<slug>/` — article detail, selected through `[...slug].astro` and the existing Site v1 locale helpers.
- `/archives/`, `/tags/`, and `/tags/<tag>/` — archive and taxonomy pages.
- `/rss.xml`, `/sitemap.xml`, `/robots.txt` — static discovery endpoints.
- Bangumi is conditionally injected from `src/modules/bangumi.astro`; it has no route when disabled.

The current Site v1 locale contract uses default-locale `/posts/<slug>/` and non-default `/posts/<locale>/<slug>/`. The future `/en/posts/...` contract in the frozen Next specification is not claimed as implemented here. Existing `withBase`, canonical and translation-alternate helpers remain in place for root and nested deployments.

A published default-locale post with a canonical numeric slug from `2` through the current last pagination page collides with `/posts/<page>/`. Astro previously logged the conflict and omitted that article from static output. The article route now fails the build with the conflicting slug and pagination URL. This preserves existing pagination URLs and leaves the Site unchanged; the affected Site owner can rename the colliding slug.

## Browser lifecycle decision

Keep traditional native MPA links. The current source and complete dependency tree have no Swup or Astro client router, and the existing browser flow covers direct routes, navigation and browser Back. No evidence in #49 demonstrates a product requirement that justifies adding a second navigation manager. Native view transitions and `ClientRouter` remain unselected; #50 owns the broader navigation, scroll, focus, reduced-motion and layout-shift evidence.

Theme initialization remains the existing early `data-theme` script plus one change handler. It continues to use the existing storage key and comments event. No second preference store was added.

## Pagefind lifecycle defect and change

The existing search island and compose-time index are retained. The lazy import could initialize the same Pagefind module more than once when the dialog was closed and reopened while the import was pending. Search responses could also arrive out of order and replace results for a newer query; destroying the component did not cancel its debounce or invalidate an outstanding response. The component now guards initialization, ignores stale responses, clears the pending timer and invalidates requests on destroy. The undocumented `window.__rs` debug writes were removed.

The focused browser regression delays Pagefind import, closes/reopens search during the load, checks one `init()` and one `options()` call, then forces two queries to return out of order. Root/nested index URL and output generation remain covered by the existing compose and browser checks.

## Feeds, sitemap and images

Keep the existing RSS and sitemap endpoints. The current generated canonical and base-path behavior is exercised by root/nested output checks; an official-integration migration has no demonstrated parity or maintenance benefit in this scoped diff. Record future `@astrojs/rss`, `@astrojs/sitemap` and Astro image API adoption as capability-specific comparisons under #79 or the appropriate later Issue. Site-owned images remain static source assets with explicit dimensions; no image pipeline or dependency is added.

## Reuse matrix

| Source before | Decision | Change and evidence |
| --- | --- | --- |
| Astro file routes and `paginate()` | **KEEP / ADAPT** | Keep route ownership and page size; add one shared page-size constant and a fail-fast numeric collision check. Contract fixture reproduces the dropped-page case and confirms the external Site digest is unchanged. |
| `packages/ui/src/Search.svelte` and Pagefind 1.5.2 | **ADAPT** | Fix initialization, response ordering and teardown in the existing island. Focused Playwright regression covers repeated open and stale result behavior. |
| `themes/shirone` and MPA browser links | **KEEP** | No theme or router replacement. Broader route/viewport evidence is assigned to #50. |
| Early theme initialization and theme-change handler | **KEEP** | Existing persistence and theme browser coverage remain; no second store. |
| `themes/editorial` source | **KEEP** | The package remains in the workspace and repository for rollback; only its unused dependency edge from `apps/web` is removed. |
| Site v1 compose, digest, provenance and rollback | **KEEP** | Tests operate on disposable copies; production Sites and `sites/demo` are not edited. |
| Custom RSS/sitemap and static images | **KEEP** | No proven gap requiring replacement in #49; evaluate official equivalents separately. |

## Verification and evidence

Local checks ran sequentially because Astro build and compose share the web package's generated cache. Runtime: Node 22.23.4, pnpm 10.19.0; hosted `verify` uses Node 24.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS, 15/15; includes the numeric-slug failure and Site-digest assertion |
| `python3 -m unittest discover -s scripts/tests -p '*_test.py'` | PASS, 20/20 |
| `pnpm check` | PASS, 0 errors, warnings or hints |
| `pnpm build` | PASS; 13 pages, Pagefind indexed 13 pages in 3 languages, artifact budgets PASS |
| Nested-base compose, artifact check and internal URL scan | PASS; 13 pages, base-prefixed links and Pagefind index |
| Production artifact boundary, root and nested outputs | PASS |
| `pnpm browser` | PASS, 3/3; includes root/nested navigation, mobile card layout and delayed/out-of-order Pagefind lifecycle |
| External Site two-Core upgrade/rollback | Pending exact committed head |
| GitHub Actions `verify` and retained browser artifact | Pending exact PR head |

## Compatibility, rollback and limits

No Site schema, content, configuration, URL format, asset, or released `main` code changes. The rollback is a normal `git revert` of the #49 implementation commit(s), followed by a rebuild with the prior Core revision and the same Site; existing compose verifies Site digest and provenance. The numeric-slug check diagnoses a real collision but does not rename user-owned content. P1-wide mobile/accessibility/performance evidence remains in #50, and 7.4.2 versus pinned upstream 7.3.8 remains in #79.
