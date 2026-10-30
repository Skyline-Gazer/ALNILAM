# ADR 0002 — Owner requirement delta: YAML-only vNext Site

**Status: Owner-requested requirement, 2026-10-27; implementation pending a separate reviewed Spec amendment.** Refs #94, #37, #49, #50. This records the current assignment's explicit change against the frozen G0-F Plan/Spec; it does not rewrite the v0.1.3 release or authorize a Core rewrite inside the CNB Pilot.

New vNext Site contracts and samples target YAML only. The current Site v1 TOML fixtures remain historical regression inputs. Their successful composition does not promise future TOML support. There is no TOML-to-YAML migration engine in this change.

The [YAML contract example](../pilots/fixtures/vnext-site.yaml) records format and ownership requirements, not a parser-supported Site or a finalized new schema version. The eventual reviewed amendment must define filenames/schema, validation, unsupported-field errors, immutable input, separate Core revision and Site digest, root and nested base, and upgrade/rollback acceptance before implementing the transition. Production operations must never mutate Site.

#49 resumes the retained Shirone routing/dependency/lifecycle work after the Owner's CNB gate. It must not silently implement this independent format migration. #50 carries actual browser, accessibility, enabled-module and performance acceptance forward. ALNILAM remains GitHub Primary.
