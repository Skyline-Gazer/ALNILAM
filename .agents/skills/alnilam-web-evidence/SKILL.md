---
name: alnilam-web-evidence
description: Collect browser evidence for ALNILAM UI changes, Demo audits, navigation timing, or flaky Playwright focus and hydration scenarios.
---

# ALNILAM web evidence

1. Read the relevant Issue, `AGENTS.md`, and `docs/HANDOFF.md`. Record the source commit, Core/Site provenance, deployment base, browser version, viewport, locale, and motion preference. Keep published Demo observations separate from local candidate observations.
2. Use the existing Shirone layout, semantic controls, and Material 3 tokens. Review [Astro islands](https://docs.astro.build/en/concepts/islands/), [Svelte lifecycle](https://svelte.dev/docs/svelte/lifecycle-hooks), or [Tailwind theme variables](https://tailwindcss.com/docs/theme) only when the affected code uses them. Check what renders before hydration, who owns state across navigation, and when listeners or observers are removed.
3. Start with the closest `pnpm browser:local tests/browser/<spec>.spec.ts`. Reuse the outputs with `env -u CNB_CANDIDATE_ROOT -u CNB_TRUSTED_TEST_ROOT COMMENTS_FIXTURE=1 CONSENT_FIXTURE=1 GA4_FIXTURE=1 ADS_FIXTURE=1 pnpm browser <spec>` while inputs are unchanged. For a live UI, use an available browser tool in a fresh context. Capture the affected interaction, keyboard focus, computed visibility, accessibility tree, and a screenshot where useful. Check both deployment bases when the change affects routing. Match viewport, cache conditions, motion preference, and route shape when comparing navigation. Report timing as lab evidence.
4. For a flaky focus assertion, collect `document.activeElement`, `document.hasFocus()`, connection and inert state, focus and blur events, and nearby resize, scroll, mutation, or animation-frame events at the failing call. Compare these observations with the assertion's contract. Keep regression expectations until the evidence supports a correction. Use the repository's existing CI and report which tree and scenario ran.

For broader UI review, consult the [pinned Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/434b7f91364665f2f733b310ec54809bf8f37937/command.md) (MIT, linked source). Apply the relevant checks using the project's semantics and theme. If native Skill discovery is unavailable, open this file directly. If browser execution is unavailable, report the missing observation.
