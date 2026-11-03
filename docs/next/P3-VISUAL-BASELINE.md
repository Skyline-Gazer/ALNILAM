# P3 visual baseline (#61)

Build the demo at root and nested paths; Playwright starts its own previews on
4323 (`dist/site`) and4324 (`dist/nested-base`, mounted at `/ALNILAM/`):

```sh
node scripts/compose.mjs --site "$PWD/sites/demo" --out "$PWD/dist/site"
ALNILAM_SITE_URL=https://example.com/ALNILAM/ node scripts/compose.mjs --site "$PWD/sites/demo" --out "$PWD/dist/nested-base"
pnpm exec playwright test tests/browser/visual-baseline.spec.ts
```

The same test is automatically discovered by the existing target-owned CNB browser
harness after it lands on dev. Its first PR does not run candidate-only tests in
that trusted harness; use the labelled local artifact initially, then verify actual
native screenshot retention on the next ordinary feature PR. No CI framework change.

Eight fixed scenarios cover 1440×1000 / 390×1000, dark/light, root and `/ALNILAM/`.
They capture the served build with reduced motion, loaded fonts and loaded images.
The manifest records actual build provenance separately from test-runner HEAD;
these fields do not certify a clean source checkout. Each scenario captures home, post list, article, search
with real results, tags, a tag detail and archives. HTML galleries pair desktop and
mobile captures and link the opposite theme; JSON records URLs, build provenance, runner HEAD and missing
routes. Explicit batch keys identify pairs; missing/self-pointing reports fail. Download the full archive to retain relative image links.

These are human-reviewable captures, not automatic visual approval or pixel-diff
assertions. Compare the same page across width/theme pairs. Scope and outcomes:

| Severity | Meaning | Current evidence |
| --- | --- | --- |
| P0 | Unusable page or data loss | None observed in sampled rendered pages |
| P1 | A core action is blocked | None observed in sampled rendered pages; behavioral checks remain separate |
| P2 | Functional gap | Independent category page missing; tracked by #62; tags are not category evidence |
| P3 | Cosmetic difference | Cover moves from right to top on mobile; title wraps and prose narrows as intended |

Historical local-adaptation inspection (superseded by the actual native Base): light desktop home retains one card per row with a right
cover; dark mobile search stays within the viewport over the page; light mobile
article has readable code/title wrapping and a native TOC. Screenshots for other
states remain in the archive for review; this sampling is not Owner visual signoff.

#61 remains open until independent category captures and native CI archival are
verified. P3 Phase #39 remains open too. #55 external Site acceptance and live Giscus
are not established by this fixture. Reuse #60's actual component/mock-provider CLS
and native CI evidence rather than claiming this screenshot suite tests live services.
