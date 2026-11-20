# ADR 0003 — Owner requirement delta: YAML-only vNext Site

> **Historical decision snapshot:** the 2026-10-27 pending-implementation and GitHub-primary statements below describe the original decision, not current state. The current Site contract is YAML-only schema v2; TOML-only Sites fail closed without automatic migration. See [Site onboarding](../SITE_ONBOARDING.md), [Site contract](../../scripts/site-contract.mjs), and [HANDOFF](../HANDOFF.md) for implementation and current development authority.

**Status: Owner-approved requirement delta (2026-10-27); implemented in GitHub `dev` at `d56b2d4bb5d3577a9d09d3168ebce310dbedc85e`.** Refs #94, #37, #49, #50. This ADR preserves the decision snapshot; see the current Site contract and onboarding docs for implementation.

New vNext Site contracts and samples target YAML only. The current Site v1 TOML fixtures remain historical regression inputs. Their successful composition does not promise future TOML support. There is no TOML-to-YAML migration engine in this change.

The [YAML contract example](../pilots/fixtures/vnext-site.yaml) captures the original format and ownership requirements. The current YAML-only schema v2 contract, unsupported-field errors, immutable input, separate Core revision and Site digest, root/nested base and rollback behavior are implemented and checked by the current Core and CI; the example is not itself an executable Site.

#49 resumes the retained Shirone routing/dependency/lifecycle work after the Owner's CNB gate. It must not silently implement this independent format migration. #50 carries actual browser, accessibility, enabled-module and performance acceptance forward. ALNILAM remains GitHub Primary.
