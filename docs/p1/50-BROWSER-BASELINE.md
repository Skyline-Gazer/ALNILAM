# Issue #50 — Browser and performance baseline

Status: **candidate evidence on an unmerged feature branch**. The branch starts at `dev` `1f382aa72052eedbe8a2809011e5a36a82f697d0`; PR #49 is independently open as PR #97. This baseline does not claim that #49 has landed on `dev`.

## Reuse and change matrix

| Area | Before | After | Decision |
| --- | --- | --- | --- |
| Source | Astro owns static routes; Pagefind and conditional Bangumi use existing integrations. Pagination links use Astro's generated URL unchanged; optional build-time Bangumi fetch has no local deadline. | Preserve the route, Site v1, Pagefind, and module-gating architecture. Prefix pagination with the Site base and ensure the generated page link has its trailing slash. Bound the optional Bangumi build-time request to 10 seconds. | **KEEP / ADAPT** |
| Tests | The regular browser suite covers root and nested smoke flows; no isolated P1 external-Site matrix or Bangumi timeout assertion. | Keep the existing suite; isolate the dedicated baseline config. Add deterministic external Site, enabled/disabled/error/timeout Bangumi cases, lifecycle/accessibility checks, and Lighthouse median summarization tests. | **KEEP / WRAP** |
| CI | Required CI builds the demo and a separate external copy but has no P1 browser/performance artifact set. | Add a dedicated workflow that composes the external fixture, runs the route/viewport/theme matrix, performs 3 Lighthouse runs per URL and device class, and retains SHA-bound evidence for 30 days. | **KEEP / ADAPT** |
| Docs | Issue #50 evidence and limitations were not recorded as a single report. | Record the exact scenario coverage, artifact contents, and verification limits here; use the PR checks and its uploaded artifact for the tested SHA and run URL. | **ADAPT** |

## Browser matrix

The dedicated Playwright workflow builds the disposable external Site fixture, then tests these production-build origins and viewports. Each route suite runs in both light and dark themes.

| Site output | Viewport | Theme | Routes and journeys |
| --- | --- | --- | --- |
| Root `/` | 390 × 844, touch | Light, dark | Home, posts, page 2, article, localized article/deep link, archives, tags and tag detail, search/results, disabled Bangumi 404 |
| Root `/` | 1440 × 900 | Light, dark | Same routes and journeys |
| Nested `/ALNILAM/` | 390 × 844, touch | Light, dark | Same routes and journeys with nested URLs |
| Nested `/ALNILAM/` | 1440 × 900 | Light, dark | Same routes and journeys with nested URLs |
| Bangumi enabled | 390 × 844 | Site-configured | Static enabled route at root and nested base; mocked provider data, no browser provider request |

Lifecycle checks include first load, theme persistence, keyboard focus order, reduced motion, deep links with query/hash, Pagefind loading at most once per search lifecycle, ten repeated article/list navigations, Back/Forward, scroll restoration, delayed cover loading, missing covers, and long localized titles. The browser suite records CLS using the largest session window and attaches per-scenario JSON and screenshots; failure traces and screenshots are retained by Playwright.

The enabled Bangumi route and HTTP-error/timeout cases are isolated from the disabled external fixture. Bangumi fetches at build time. The browser check confirms that enabled static output renders without a runtime call to `api.bgm.tv`; 503 and timeout behavior are verified during composition.

## Lighthouse baseline

Lighthouse CI runs three times for each comparable URL on mobile (390 × 844) and desktop (1440 × 900): home, posts, a representative article, and the tags index, at both root and nested base. The workflow stores raw Lighthouse JSON/HTML and a SHA-bound median summary with CLS, LCP, INP when available, accessibility findings, request count, transfer weight, and script/CSS transfer sizes.

These are lab measurements. **Field p75 is `NOT VERIFIED`.** The in-page search interaction is covered by Playwright; it is not a distinct Lighthouse route/state. A local-font substitution is recorded as `NOT VERIFIED` if the host has no suitable local font. Lighthouse findings do not replace manual contrast review.

## Verification record

- Local environment: Node `22.23.4`, pnpm `10.19.0`; exact PR-head CI metadata and Site digest are stored in the workflow artifact.
- The dedicated 7-case Playwright matrix passed locally on the development candidate. Root/nested × mobile/desktop flows and the enabled Bangumi root/nested routes all passed.
- Local contract tests: **19/19 PASS** (includes request timeout and Lighthouse summary checks).
- Local `pnpm check`: **PASS**, 16 files, 0 errors, warnings, or hints.
- Local Python CI tests: **20/20 PASS**.
- Local demo `pnpm build`: **PASS**, 13 pages, artifact budgets pass.
- Local regular `pnpm browser`: **2/2 PASS** against the normal demo output.
- External Site root/nested composition, fixture digest preservation, Pagefind output, disabled Bangumi absence, enabled Bangumi data, provider 503, and bounded timeout: **PASS**.
- `upgrade-check` against the branch base and the unchanged external Site: **PASS**; Site digest remains `0b944adfac1c260984211baf58060bd5d7eaf6e38505cdbd9cb0c65f5b86d764`.
- Remote Lighthouse and the PR-head CI run are the release evidence. Their final run URL, status, metric medians, and artifact link are reported in the PR and final P1 gate; this document does not substitute local timing for those results.

## Limits

- Search interaction is not measured as a separate Lighthouse state; Playwright verifies the full search lifecycle.
- Real-user Web Vitals, field p75, and manual visual contrast are not measured here.
- Late font coverage depends on a local system font; report it as `NOT VERIFIED` if unavailable.
- Delayed runtime optional content and duplicate global-listener counts are not separately verified. Bangumi is build-time/static in this product.
- This is a disposable external fixture based on Site v1, not a private customer Site.
- PR remains unmerged; the combined P1 `dev` gate is not passed.
