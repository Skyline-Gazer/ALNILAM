# Issue #74 — P6 performance and accessibility evidence

Updated 2026-11-23. This note separates worker-local verification, the supplied exact-head remote run, and remaining unverified work.

## Source and remote exact-head run

- GitHub `dev` source audited: `9c77453cfc8da6ff5432aa8e61954b4b57c10f52`.
- Demo Site digest: `1761ca3abb68de22ddffc157b1763b20dd847ffa0fb9b9bfedb56d9f1d65c4db`.
- The supplied worker receipt records workflow run [45151400441](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/45151400441), dispatched with `performance_audit: true` on the unchanged SHA. Both `verify` and `P6 browser and Lighthouse acceptance` succeeded.
- The remote browser report had 279 expected cases, one intentional `cnb-negative` skip, zero unexpected cases and zero flaky cases.
- The remote Lighthouse artifact has 60 reports: ten root and `/ALNILAM/` URLs, three runs each, mobile and desktop. Median LCP was 2.808 s mobile and 2.807 s desktop. Maximum normal CLS was 0.002458822; accessibility score was 1.00; maximum TBT was 80 ms mobile and 56 ms desktop. Negative controls measured CLS 0.123539 mobile and 0.431101 desktop against 0.10.
- These remote metrics describe the original exact-head run. That run predates the worker-local validator change below and does not verify that change.

## Gate coverage audit

- **CLS:** `lighthouserc.cjs` supplies the 0.10 budget. Before this worker change, the normal P6 path only checked that each report had a numeric CLS result; the baseline assertion was `warn`, and the 0.10 limit was not blocking. The isolated negative control did use an `error` assertion, which proved the control could fail but did not reject an over-budget normal report. Reproduction before the fix:

  ```text
  node --input-type=module -e 'import {validateLighthouseReports} from "./scripts/ci/cnb-evidence.mjs"; const now=Date.now(), url="http://fixture/", lhr={requestedUrl:url,fetchTime:new Date(now).toISOString(),audits:{"cumulative-layout-shift":{numericValue:0.5}}}; const accepted=validateLighthouseReports(Array.from({length:3},()=>({url})),()=>lhr,[url],now,3); console.log(`baseline validator accepted ${accepted.length} reports; max CLS=${Math.max(...accepted.map(r=>r.audits["cumulative-layout-shift"].numericValue))}; configured P6 budget=0.1`)'
  baseline validator accepted 3 reports; max CLS=0.5; configured P6 budget=0.1
  ```

  The P6 collector now checks every normal report with `assertLighthouseCLSBudget` using the configured budget; any report above 0.10 fails. Equality at 0.10 passes. The separate negative-control validation remains in place.
- **LCP:** the configured Lighthouse assertion remains a `warn` at 4000 ms. The exact-head remote medians were below it. This is a warning threshold, not a blocking assertion.
- **Rendered HTML:** `scripts/artifact-check.mjs` checks each emitted HTML document and fails above 64 KiB.
- **Islands and images:** `artifact-check` fails above six islands on article-class pages or five on other pages, and fails any `<img>` without explicit `width` and `height`.
- **Other byte reporting:** the Lighthouse summary records total, script, CSS, image and font transfer bytes. Issue #74 asks for these as a baseline but specifies no byte ceiling for them. The only declared byte ceiling found is rendered HTML at 64 KiB; no additional threshold was invented.

## Worker-local verification

Root build command:

```sh
pnpm build
```

Observed: Compose succeeded at Core `9c77453cfc8da6ff5432aa8e61954b4b57c10f52`, Site digest `1761ca3abb68de22ddffc157b1763b20dd847ffa0fb9b9bfedb56d9f1d65c4db`; `artifact-check` reported 92 pages and `BUDGETS OK`; `seo-check` reported 93 pages, 6038 internal references, 81 sitemap URLs and 3 feeds, then `SEO CONTRACT OK`.

Nested build and checks:

```sh
ALNILAM_SITE_URL=https://example.com/ALNILAM/ pnpm compose --site sites/demo --out dist/nested-base
node scripts/artifact-check.mjs dist/nested-base
node scripts/seo-check.mjs dist/nested-base
```

Observed: the same Core revision and Site digest; `artifact-check` reported 92 pages and `BUDGETS OK`; `seo-check` reported 93 pages, 6038 internal references, 81 sitemap URLs and 3 feeds, then `SEO CONTRACT OK`.

Direct article HTML inspection: root output was 61,828 bytes and nested output was 62,581 bytes (both below 65,536); each had one `<h1>`, five `<img>` elements and zero images missing `width` or `height`. An initial hand-written inspection expression was over-escaped and falsely counted all five images as missing dimensions; the corrected check above and the repository artifact check both passed.

The focused validator test command was:

```sh
node --test scripts/ci/cnb-evidence.test.mjs
```

Observed: 6 tests passed, 0 failed. The new cases reject CLS 0.5 against 0.1, reject an invalid negative budget, and accept exactly 0.1.

The Chromium command was:

```sh
flock /tmp/alnilam-parallel.MYTjuw/browser-ports.lock pnpm exec playwright test tests/browser/a11y.spec.ts tests/browser/reduced-motion.spec.ts tests/browser/drawer-focus-trap.spec.ts tests/browser/lightbox.spec.ts tests/browser/cnb-quality.spec.ts --grep 'axe critical/serious .*390/posts/hello-alnilam/|reduced motion keeps the drawer and search usable (?:/|/ALNILAM/)|reduced motion keeps navigation and the theme switch usable (?:/|/ALNILAM/)|drawer keeps keyboard focus inside while open (?:/|/ALNILAM/)|keyboard a11y trap and caption root 390|CNB navigation and CLS / 390'
```

Observed: 10 passed in 34.3 s. Axe critical/serious scans passed on the article at 390 px on both bases; drawer keyboard focus passed on both bases; reduced-motion drawer/search and desktop navigation/theme interactions passed on both bases; the PhotoSwipe keyboard/caption fixture passed.

A separate Chromium check opened the actual `/posts/hello-alnilam/` raster image at 390×844 using a private preview on port 4337. Starting from PhotoSwipe Close, eight Tab presses cycled Previous → Next → Zoom → Close twice; every target stayed inside `.pswp`. Escape closed the viewer, focus returned to the invoking image, and no page errors occurred. This run did not reproduce the reported PhotoSwipe focus escape under these route and viewport conditions.

The root mobile CLS session-window output is preserved at `browser-results/artifacts/p6-worker-cls-session.json`. Across six sampled page states, maximum session CLS was 0.0029381386514719847 (on the tags state); the home state measured 0.0016721114276669832. The run recorded no browser errors. Screenshots are under `browser-results/artifacts/cnb-quality-CNB-navigation-and-CLS-390/`.

## Still unverified

- Field p75 remains **NOT VERIFIED**. Speed Insights windows were rejected under the available plan and PageSpeed returned HTTP 429; lab measurements are not field data.
- Manual macOS Safari plus VoiceOver remains **MANUAL_NOT_RUN** on this Linux host. The procedure is [P6-74-MANUAL-SCREEN-READER-CHECKLIST.md](P6-74-MANUAL-SCREEN-READER-CHECKLIST.md).
- The new blocking CLS guard has not been run by remote CI in this worker slice. The supplied exact-head run verifies the measured product output before this working-tree change, not the new guard. Lead should verify the committed change in integration CI; do not treat the earlier run as that verification.
