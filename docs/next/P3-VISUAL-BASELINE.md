# P3 visual baseline (#61)

Run the existing composed demo and nested-path builds, then:

```sh
pnpm exec playwright test tests/browser/visual-baseline.spec.ts
```

The same test is automatically discovered by the existing target-owned CNB browser
harness after it lands on dev. Its first PR does not run candidate-only tests in
that trusted harness; use the labelled local artifact initially, then verify actual
native screenshot retention on the next ordinary feature PR. No CI framework change.

Eight fixed scenarios cover 1440×1000 / 390×1000, dark/light, root and `/ALNILAM/`.
They use the demo content at the recorded source SHA, reduced motion, loaded fonts
and actual loaded images. Each scenario captures home, post list, article, search
with real results, tags, a tag detail and archives. HTML galleries pair desktop and
mobile captures and link the opposite theme; JSON records URLs, source and missing
routes. Download the full archive to retain relative image links.

These are human-reviewable captures, not automatic visual approval or pixel-diff
assertions. Compare the same page across width/theme pairs. Scope and outcomes:

| Severity | Meaning | Current evidence |
| --- | --- | --- |
| P0 | Unusable page or data loss | None observed in sampled rendered pages |
| P1 | A core action is blocked | None observed in sampled rendered pages; behavioral checks remain separate |
| P2 | Functional gap | Independent category page missing; tracked by #62; tags are not category evidence |
| P3 | Cosmetic difference | Cover moves from right to top on mobile; title wraps and prose narrows as intended |

Initial actual inspection: light desktop home retains one card per row with a right
cover; dark mobile search stays within the viewport over the page; light mobile
article has readable code/title wrapping and a native TOC. Screenshots for other
states remain in the archive for review; this sampling is not Owner visual signoff.

#61 remains open until independent category captures and native CI archival are
verified. P3 Phase #39 remains open too. #55 external Site acceptance and live Giscus
are not established by this fixture. Reuse #60's actual component/mock-provider CLS
and native CI evidence rather than claiming this screenshot suite tests live services.
