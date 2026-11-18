# ADR 0005 — Keep optional integrations disabled by default

**Status:** Owner-approved launch boundary recorded in the 2026-10-26 P6 addendum to [Issue #42](https://github.com/Skyline-Gazer/ALNILAM/issues/42); the 2026-11-13 [Gallery authorization](https://github.com/Skyline-Gazer/ALNILAM/issues/67#issuecomment-6854542688) permits scoped engineering, not release acceptance.

## Context

Comments, Gallery, analytics, advertising, consent, Bangumi, and LLM discovery can contact third parties or publish additional routes. Test fixtures can verify local behavior without proving a live account, provider approval, or Production authorization.

## Decision

1. Optional modules are configured through the Site's YAML contract and remain disabled unless the Site explicitly enables them.
2. A disabled module emits no module route, navigation entry, provider script, identifier, or related network request, as applicable to that module.
3. CI uses deterministic local fixtures and mock endpoints. It does not require real publisher, analytics, consent-provider, or comments credentials.
4. Live third-party activation, account approval, Production publication, and custom-domain activation remain separate Owner decisions. Mock/browser PASS is not evidence of those approvals.
5. Keep the detailed feature contract in [Site onboarding](../SITE_ONBOARDING.md), [08-G0-F-DECISION](../next/08-G0-F-DECISION.md), and Issues #67 and #90–#93; this ADR records the shared boundary without duplicating per-module schema.

## Consequences

Optional features can be tested and reviewed without introducing default network activity or storing provider credentials in the repository. A Site opt-in does not authorize ALNILAM to activate a live service on the Site owner's behalf.

## Rollback

Disable the Site module in its own configuration and rebuild the unchanged Site inputs. ALNILAM must not rewrite the Site to perform rollback.
