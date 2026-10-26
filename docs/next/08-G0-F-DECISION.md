# ALNILAM Next — G0-F Frozen Scope and Owner Decision

**Owner approval:** 2026-10-26 · [Issue #36 Owner authorization](https://github.com/Skyline-Gazer/ALNILAM/issues/36#issuecomment-6416284698) · single Plan/Spec PR [#77](https://github.com/Skyline-Gazer/ALNILAM/pull/77).

**Status:** G0-F scope approved and frozen for the authorized **P1** engineering phase, subject to merging the reviewed docs into `dev` with required CI. This is NOT proof that any P1 product feature has been implemented, that Project #17 native hierarchy is synchronized, or that production deployment is authorized.

## Approved decisions

1. **Preserve the existing platform:** ALNILAM is the existing repository and immutable Core/Site v1 platform with compose, site-contract, upgrade/rollback, search/comments/Bangumi, CI/tests/history. Shirone is the **one and only frontend base**. Keep/Adapt/Wrap first; no greenfield rewrite or unreviewed deletion; Firefly/KIRARI/Mizuki are reference sources only.
2. **Visual contract:** Shirone Material Design 3 Expressive (M3E) visual tokens/components; Fuwari-style **one post per row**, desktop text left/cover right (approximately 28% cover), mobile cover above text. Verify at 1440px and 390px, keyboard/touch navigation, light/dark, motion and TOC. This is not a 1:1 resurrection of the old cinematic SHBlog.
3. **Optional modules:** gallery, moments and music are expressly **DEFERRED** from P1/current release; no generated routes/dependencies for them. Comments and Bangumi are optional Site-configured modules, with absence from built output/network when disabled and actual behavior checks when enabled.
4. **Legacy and upstream FAIL:** old `/ALNILAM/` nested-base/canonical/link defects, disabled Bangumi route leak, runtime/search island, i18n/SEO/provenance gaps, and two Shirone baselines at 415 E2E PASS / 17 FAIL / 48 upstream skips plus five lint errors remain **known audit evidence**. They are not P1-entry blockers, but applicable defects must be fixed and independently retested before a release can PASS; no invented upstream PASS.
5. **Performance/accessibility:** establish target budgets from actual measured Shirone and ALNILAM baselines, not arbitrary thresholds. Require mobile/desktop screenshots, a11y keyboard/touch/reduced-motion, runtime and navigation stability, CLS and output sizing in affected acceptance and release checks.
6. **Source rights:** no unverified or proprietary bundled fonts, brand/character illustrations, demo media or music may be redistributed. Omit or replace with licensed assets, preserve third-party notices and file-level provenance. Final candidate fails closed on assets without sufficient rights evidence.
7. **Provider:** ALNILAM remains GitHub Primary throughout P1. CNB/Greptile live Pilot and dual-platform authority remain ADS `cnb/v0.4.1` / Issue #63 work and are **not** an ALNILAM P1 prerequisite; no provider cutover is approved.
8. **Astro:** Shirone Astro 7.3.8 is the initial known-good upstream baseline; 7.4.x compatibility is a separate, bounded evaluation, not an automatic upgrade. Experimental build acceleration remains deferred (#83).

## Authorized P1 scope and limits

**P1 permitted:** Small incremental PRs from verified `dev` implementing a Shirone-based frontend vertical slice *inside the current ALNILAM repo*. Retain original Core/Site v1 schema and immutability, old build/test/CI contracts, and original repository Git history. Start with pristine pinned baseline and a single end-to-end post listing → article → navigation route using an independent unchanged Site fixture. Verify both root and nested /ALNILAM/ base, canonical, desktop/mobile themes, static outputs, real Node/contract tests and isolated preview. Run change-relevant tests before/after; do not start from a blank project. Adopt components only after existing-source versus official Astro versus pinned upstream comparison with traceable Keep/Adapt/Wrap decisions.

**Not authorized:** automatic P2–P6 completion, speculative module expansion, production `main` merge, publishing tags, deployments, CNB cutover, unlicensed assets, global paid infrastructure, or disabling required checks.

## Gate and evidence discipline

- Preserved authoritative P0 audit: [P0-ACCEPTANCE](../p0/P0-ACCEPTANCE.md); prior PASS/PARTIAL/FAIL remain unchanged as historical observations.
- Verified adoption `dev` baseline **before Plan/Spec integration**: `bcf7c642287af1528cd0e60c0a3388126db7e527`; ADS gitlink = `3abf6025657a5d716476029cc8cbf5239543210b`.
- PR #77 is **documentation-only after reconciling to current dev**; no ADS tool state or existing validated application source is reverted.
- Project #17 existing 18 Done items are historical; new Milestones/parent–subissue links/Next items require actual API operations and readback. Until then status is `PROJECT_UNVERIFIED`; do not block already authorized limited P1 coding on unverified board bookkeeping, but preserve traceability and reconcile when permissions allow.
- Actual frozen implementation authority is this owner decision plus the final reviewed PR #77 merge SHA (once merged). Later material changes require an ADR/Spec PR and new owner decision.
