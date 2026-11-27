---
name: alnilam-web-evidence
description: Collect browser evidence for ALNILAM UI changes, Demo audits, navigation timing, or flaky Playwright focus and hydration scenarios.
---

# ALNILAM web evidence

Read the relevant Issue and `AGENTS.md`. Use the existing Shirone layout,
native controls and Material 3 tokens. Run the closest
`pnpm browser:local tests/browser/<spec>.spec.ts` check and exercise the affected
interaction in a browser. Check both deployment bases for routing changes.
Reuse built outputs with `pnpm browser <spec>` when their inputs are unchanged.

For hydration or focus bugs, check what renders before hydration, which code owns
state across navigation, and when listeners are removed. Inspect active focus,
connection or inert state, and nearby browser events as needed. Capture a
screenshot or trace when it helps explain the failure.

For live or performance comparisons, record the served Core revision. Match
route shape, browser, viewport, cache and motion settings. Report lab timings
separately from field data and identify the candidate and Demo revisions.
