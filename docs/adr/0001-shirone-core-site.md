# ADR 0001 — Shirone frontend on retained ALNILAM platform

**Status: ACCEPTED for bounded P1 by G0-F on 2026-10-26.** Related #36/#44/#46/#80; normative Plan/Spec was frozen in [PR #77](https://github.com/Skyline-Gazer/ALNILAM/pull/77). P1 authorization does not authorize a production release or P2.

The current ALNILAM platform has independently owned Site v1 inputs, staging, provenance, upgrade/rollback and regression fixtures. Shirone has the selected frontend design and broad blog UI; its content sync materializes/prunes Core mounts and writes a timestamped lock. Replacing the whole repository or importing that controller directly would discard verified guarantees.

Propose retaining ALNILAM compose/site-contract/core/tests/CI and wrapping Shirone's one integration/route/content/UI system with a thin read-only Site v1 adapter. Map frontmatter/config only in memory or disposable staging. Prefer existing working ALNILAM behavior, then official stable Astro primitives, Shirone frontend implementation, KIRARI engineering gaps, and specific Firefly/Mizuki gaps. Keep one route tree, index lifecycle, token/theme store and transition manager.

Alternatives rejected for this proposal: greenfield repository/history reset; multiple complete themes; automatic Site v2 upgrade; wholesale KIRARI runtime/dual-router import. Swup remains the upstream baseline during P0; native MPA/ClientRouter is a later measured alternative requiring lifecycle equivalence, not an immediate replacement.

Consequences: preserve existing fixtures and URL compatibility; a schema v2 requires an opt-in versioned migration proposal; isolate framework upgrade from frontend migration; preserve blocking Pagefind failures. Draft locale/taxonomy/SEO/LLMs contracts need real-content translation mapping and privacy negatives beyond official helpers. Review every imported file/license/media grant.

Rollback selects the old Core commit against the unchanged Site. Reconsider this decision only if a measured incompatibility prevents the retained controller from safely composing Shirone; attach failed equivalence tests, the smallest alternative and a new Owner decision. See [reuse decisions](../p0/REUSE-DECISIONS.md) and [acceptance report](../p0/P0-ACCEPTANCE.md).
