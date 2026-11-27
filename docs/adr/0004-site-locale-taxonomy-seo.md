# ADR 0004 — Preserve Site locale, taxonomy, and SEO contracts

**Status:** Owner-approved target contract through G0-F on 2026-10-26 ([Issue #36](https://github.com/Skyline-Gazer/ALNILAM/issues/36), [PR #77](https://github.com/Skyline-Gazer/ALNILAM/pull/77)). This record does not claim every requirement is implemented; task evidence remains authoritative.

## Context

ALNILAM must support root and `/ALNILAM/` hosting, genuine partial translations, and existing Site URLs. A theme-owned router or symmetric generated locale pages would risk breaking published links or inventing translations. Astro already supplies native routes, locale helpers, and pagination.

## Decision

1. Keep [Site onboarding](../SITE_ONBOARDING.md) as the sole normative source for ROUTE, TAX, SEARCH, SEO, and LLM contracts. [ADR 0002](0002-native-mpa-and-pagefind-lifecycle.md) records the narrower native-MPA and Pagefind lifecycle decision.
2. Prefer Astro's native route, locale, and pagination APIs. Any ALNILAM-specific resolver stays limited to Site content identity and published-route mapping.
3. Preserve existing URLs and root/subpath behavior. Emit locale alternates and taxonomy pages only for real published content. A permalink or schema migration needs a versioned Site plan and Owner review.
4. Treat each linked task's tests and CI evidence as the implementation status; this ADR and its normative annex are not a feature-completion receipt.

## Consequences

Routing, taxonomy, and SEO requirements have one normative home while their architecture rationale stays traceable here. Changes to a URL contract must update the linked requirements, fixtures, and compatibility evidence together.

## References

Issues #49–#65, #73, and #79.
