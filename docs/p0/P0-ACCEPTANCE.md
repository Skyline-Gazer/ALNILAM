# ALNILAM Next — P0 Acceptance & Decision Report

**2026-10-26 · G0-R evidence only · verdict: NOT_READY for G0-F / P1.** Owner acceptance, Spec freeze and P1 scope remain separate explicit decisions. This report is evidence and recommendations, not a second product specification. The sole Draft Plan/Spec stays in [PR #77](https://github.com/Skyline-Gazer/ALNILAM/pull/77). [Audit PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85) and [ADS adoption #84](https://github.com/Skyline-Gazer/ALNILAM/pull/84) remain unmerged.

Status vocabulary: capability `NOT_FOUND / DETECTED / INSTALLED / CONFIGURED / VERIFIED / BLOCKED`; test `PASS / PARTIAL / FAIL / BLOCKED / NOT_RUN`. A skipped branch check, installed App, local Git fixture or green build is never a live integration PASS. The [execution receipts](evidence/execution.json) identify exact code SHA, run IDs, outcomes and artifacts; canceled superseded runs are not successful evidence.

## A. Baseline

| Fact | Verified result |
| --- | --- |
| ALNILAM dev | `5fd74cea8197dc91d8391e7ee677eacbc32d3234` |
| ALNILAM main / v0.1.3 | `07fac43cba0c3d303c930c098b6e2124b2c79e4a`; published release retained |
| Prior Core for actual two-version test | v0.1.0 `52a5d13f98c981fdf5aaed1ae217c85d65c0a345` |
| Product source difference dev vs release | None: only HANDOFF differs; existing source/tests/fixtures/workflows preserved |
| ADS actual dev pin | v0.3 `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`; materialized with authorized maintainer access |
| ADS proposed stable pin | v0.4 **commit** `2af17d9e1d816844c49835ae91b784405765ad46` in Draft #84; annotated tag object is not the gitlink |
| CNB candidate | `13c50f072d3f2b6aa95ca7387a8cff3dc0b606a1`, independently exported/tested; never adopted as project gitlink |
| Rulesets | `alnilam-dev` 25809723 / `alnilam-main` 25809753, Active; PR-only, no deletion/non-fast-forward, strict required `verify` from GitHub Actions, zero bypass actors |
| Pages | Workflow build, source main, published URL `https://skyline-gazer.github.io/ALNILAM/`; deploy.yml triggers main push or manual dispatch. Neither triggered by this task |
| Existing Draft heads at start | #77 `1349f1720ba6777f7513be6c5124eb43b101735f`; #84 `994a8e65a156304943ab0b4b7a7b06429fc6a71b` |
| Runtime | ALNILAM pnpm10.19.0/Node>=22.23.4; frozen lock already resolves Astro7.4.2, Svelte5.57.2 and Tailwind4.3.3 (manifest Astro ^7.3.5). CI Node24; no production dependency/lockfile change in P0. Root package version remains0.1.0, distinct from release tag0.1.3 |
| Site | Demo/legacy are fixtures, no personal Site used. Provenance binds Core SHA + Site SHA-256 digest; a second Site **Git SHA** is caller/CI responsibility, not embedded by current compose |

Raw read-only facts: [baseline.json](evidence/baseline.json). Project #17 was actually queried: ID `PVT_kwDOEwGMMc4Bomrx`, title **Dev Contron**, 17 historical items all Done, Status options Todo/In Progress/Done, no custom Phase field, no repository milestones. Next P0 items were absent. [Native relationship query](evidence/next-issue-relations.json) confirms selected Next Issues have no milestone/parent/sub-issues. Markdown Parent labels are not native relationships. No board/hierarchy/milestone mutation was made before G0-F; no duplicate Project or Issue was created. See [tracking](../PROJECT_TRACKING.md).

## B. Upstream evidence

| Source | Full fixed SHA | License / runtime | Actual verification |
| --- | --- | --- | --- |
| Shirone | `55a84b2322bdfb634a59ca6383bb242e5ce646bf` | MIT; pnpm11.28.2; Astro7.3.8; Svelte5 | Detached clean reference, source audit; isolated original and7.4.2 build/type/lint/Node tests; browser receipts below |
| Firefly | `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` | MIT code; pnpm11.22.0; Astro7.3.2; Node>=22.23.0 | SHA/remote/clean/license/source PASS; build/browser NOT_RUN (targeted reference only) |
| KIRARI | `5700bcdeb965de87a1818d5d9aec6bf8e227523d` | MIT; pnpm9.14.4; apps/site Astro7.3.5 | SHA/remote/clean/license/source PASS; build/browser NOT_RUN; gateway/edge not proposed baseline |
| Mizuki | `14da4262d8aa1d93dc8cff11705f14918ed7369f` | Apache-2.0 + inherited MIT files; pnpm11.5.3; Astro7.1.3 | SHA/remote/clean/license/source PASS; build/browser NOT_RUN |

[Manifest](evidence/source-manifest.json) includes remotes and license-file SHA-256. Local pristine snapshots are siblings under `ALNILAM-ref/`, and remote snapshots are under `$RUNNER_TEMP/ALNILAM-ref`; neither is vendored. Runtime copies are separate from pristine sources. Frozen install uses `--ignore-scripts` to avoid the upstream `preinstall` npx launcher; declared audited check/build/test scripts run explicitly. Package native bindings loaded successfully in actual builds. No floating source HEAD was substituted.

Both versions pass681 Node tests, typecheck and the original build; non-mutating lint fails with5 errors/1 warning/5 infos across443 files (including AnimeSection iterable-return, icon import order, thumbnail implicit-any and calendar assignment diagnostics). The original480-test browser run timed out after10minutes around test98/99. After preserving that PARTIAL attempt, all4 isolated single-worker shards per version completed: **415 PASS /17 FAIL /48 upstream-declared SKIP =480**, identically for7.3.8 and7.4.2. [Complete per-shard results and failing test names](evidence/upstream-e2e.json). No tests were removed or marked skipped by P0. Same observed failure set does not establish complete upgrade compatibility.

Failures include three `tests/site/motion.spec.ts` navigation/sidebar icon assertions (inline path expected true, received false), two taxonomy icon metadata assertions and twelve `tests/site/visual.spec.ts` snapshot failures (missing expected baselines and article screenshot mismatches). Trace/screenshot/error-context artifacts are retained; no baselines were blindly regenerated. These are baseline test/implementation mismatches requiring diagnosis, not proof all visible pages are broken. The first custom smoke also exposed a harness URL-before-Swup-content race, fixed by waiting for article content; its rerun passes both versions.

| Executed check | Result |
| --- | --- |
| Published ALNILAM contracts/check/build/external Site/old-new rollback | PASS |
| Four upstreams + release SHA/remote/detached/clean/license manifest | PASS |
| Shirone typecheck /681 Node tests /original build, each version | PASS |
| Shirone lint, each version | FAIL,5 errors each |
| Full upstream browser suite, each version | FAIL,415 passed/17 failed/48 upstream skips |
| Production-preview desktop/mobile/theme/article/Pagefind/back/no pageerror, each version | PASS |
| Isolated Astro7.4.2 full compatibility | PARTIAL: same observed failure set as original, no production adoption |
|9 stable boundary fixtures + two-round DAG +2 docs checks | PASS;12 consumer policy/doc tests total |
|19 candidate ADS provider/review/sync tests | PASS local; live CNB NOT_RUN |
|116 ADS extension tests +docs validation/remote CI | PASS; extension still a proposal |
| Historical actual main production boundary | FAIL; corrected task candidate PASS |
| Official CodeGraph provenance /RTK freshness | BLOCKED |
| Real dual-platform review/protection/credentials/event-loop gates | BLOCKED/NOT_RUN; offline Git PASS only |

Shirone actual build = content sync → Astro → local Pagefind CLI → font validation. Its no-config content source is local/no-op; font subsetting **still requests Meting song text by default** (`fontConfig.allowRemoteText=true`, mixed music enabled), with an8-second warning fallback. Therefore baseline build PASS does not prove network-free or deterministic output. The original lockfile stays pristine; a separate run creates an isolated Astro7.4.2 lockfile and reinstalls frozen. Static production-preview smoke now PASS on **both** versions:1440×1000 desktop and390×844 mobile, real Light/Dark clicks, list→/posts/guide/ Swup navigation, actual Pagefind query returning that article, browser back navigation and no pageerror events. [Per-viewport browser receipts](evidence/shirone-browser.json). Allocated output measured by du -sk:74076KiB original /73804KiB7.4.2; these are disk blocks, not transferred/gzipped bundle sizes or a speed benchmark. Screenshots and exact lockfiles/dependency lists stay in the corresponding run artifacts. Full-page images can retain offscreen animation state; no pixel-diff, full accessibility or motion-equivalence PASS is inferred. Exact results are not inferred from upstream README.

Source/browser path crosswalk:

| Capability | Source evidence and reuse implication |
| --- | --- |
| List, cover-right, pagination | S `src/config/postListConfig.ts` defaults list/right/pageSize8; `src/pages/[...page].astro`, organisms/PostPage.astro. No Firefly import needed for this layout |
| Theme, design controls | S config/siteConfig, organisms/LightDarkSwitch and atoms. Use one theme store/token system |
| Articles/MDX/TOC/series | S pages/posts/[...slug] and [...permalink], plugins/markdown. One Markdown pipeline; trusted-author MDX only |
| Search/comments/Bangumi | S organisms/Search, comment/CommentSection/Giscus, pages/anime and scripts/anime/providers/bangumi. Adapt ALNILAM validated config/provider behavior rather than introduce duplicates |
| External content | A already uses external glob; S content sync copies/prunes source mounts and timestamp-locks. Preserve A controller; only stage if a specific asset/font import requires it |
| Locale taxonomy | S categories/tags point to archive query filters. K `apps/site/src/pages/[lang]/categories/[...category].astro`, tags/[tag], archive are closer to Draft; do not import K's entire custom router |
| LLM v2/source Markdown | S llms.txt/full and F recent20 directory are basic indexes. K `[...path]/index.md.ts`, utils/llm-content.ts/llm-markdown.mjs and Layout discovery links are closest source references. K full aggregate is HTML-derived and encryption exclusions are not equivalent to S; separate privacy tests required |
| Transitions | S @swup/astro and Layout lifecycle hooks cover navigation/TOC/comments. K ClientRouter plus Swup fallback is not a drop-in single-manager solution |
| Differentiated optional modules | F/M provide additional candidates only. Baseline inclusion does not authorize gallery/moments/music or new external services |

License acceptance is **PARTIAL** for future imports, PASS for this P0's source identification. MIT code copyrights: S saicaca2024/matsuzaka-yuki2026; F saicaca2024/CuteLeaf2025; K saicaca2024. M has Apache main LICENSE, LICENSE.MIT and per-file Firefly notices for CodeGroupManager/DiagramManager/wiki-link/PlantUML/styles. Firefly README explicitly assigns character imagery to miHoYo. Shirone's Yozai TTF has no separately established redistribution license in this audit. Do not import demo images, music, covers, logos, mascot or fonts on the strength of the repository code license. Only generic ADS guard/workflow/tests were copied in P0, with source commit/paths and full [MIT text](../../LICENSES/ADS-MIT.txt) recorded in [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md).

## C. Existing ALNILAM reuse

The complete file-level [Reuse Decision Record](REUSE-DECISIONS.md) covers scripts, core/types, UI islands, app/routes/loaders, theme, assets, fixtures, tests, workflows, schema, provenance, docs, notices and history. It includes upstream/official alternatives, decisions, evidence, migration risk and rollback. **KEEP** controller/contracts/tests/CI/fixtures/history; **ADAPT** renderer/schema mappings/locale/SEO/budgets; **WRAP** normalized config and existing providers; **REPLACE none now; RETIRE none now.** Future retirement of a redundant full Editorial runtime is conditional on browser/contract equivalence and Owner P1 approval.

Actual regression findings remain visible:

1. **FAIL — nested-base canonical/link correctness.** Rebuilt unchanged product code with `ALNILAM_SITE_URL=https://skyline-gazer.github.io/ALNILAM/` and fixed epoch. Generated homepage canonical is host `/`; posts canonical is host `/posts/`; posts-index links escape to `/posts/...`. [Crawl evidence](evidence/legacy-nested-crawl.json) gives exact artifacts. No production mutation occurred.
2. **FAIL — disabled Bangumi route absence.** Default demo has no enabled Bangumi config, yet the generated tree contains `/opt/bangumi/index.html`. Conditional injected `/bangumi/` does not prevent Astro discovering the source under pages/opt. Historical “no route/stub” claims are not established.
3. **PARTIAL — zero-runtime claim.** Generated post pages contain one astro-island (Search). Artifact checker scans external script tags but misses inline hydration/component-url. Keep it, correct its claim, and propose reviewed runtime budgets for S; never remove the gate merely for green CI.
4. **PARTIAL — i18n/SEO coverage.** Existing translated paths/metadata are not locale-scoped listings/categories/search/feed completeness; sitemap omits some dynamic routes. No dedicated Bangumi/provider, base/SEO or browser-search test exists among the13 original contracts.
5. **PARTIAL — provenance.** Compose enforces immutable config/content/assets/data digest and Core revision; Site Git identity is independently pinned by caller. `ALNILAM_CORE_REV` is an asserted override, not authenticated attestation. Rollback test does not rebuild the new Core twice.

These are migration regression requirements, not P0 product fixes or authorization to delete old code. Historical #34/#35 remain open/unresolved unless their actual acceptance is later met.

## D. Engineering decisions

[ADR0001](../adr/0001-shirone-core-site.md) is **PROPOSED**: Shirone is the sole frontend; retain ALNILAM's working platform and wrap it with read-only Site v1 mappings. No schema conversion or frontend import occurred. Selection order is existing ALNILAM → official stable primitive comparison → S frontend → K engineering gap → F/M specific gap → minimal custom adapter.

| Capability | Stable official option / limit | Proposed choice and evidence |
| --- | --- | --- |
| Content/config | `glob` can load files outside src; `file` handles JSON/YAML/TOML; collections use astro/zod | Preserve A external loader and normalizer, adapt S field contract; official helpers do not own Site Git/publish lifecycle |
| i18n | `astro:i18n` + configured locales/default-prefix control | Use official URL primitives with real translationKey/taxonomy entity mapping. Helpers do not establish translated content or canonical correctness |
| Static routes/pagination | getStaticPaths/paginate | Already present in A/S; preserve legacy aliases and base, no second router |
| RSS/sitemap | @astrojs/rss and @astrojs/sitemap | Reuse S official integrations only after parity and partial-translation tests. Filtering/reciprocal alternates remain project policy |
| Images/assets | astro:assets Image/Picture/getImage | S already uses ImageWrapper. External Site assets require read-only staging/import mapping; current A as-is assets remain compatible |
| Page transitions | Native cross-document CSS transitions; ClientRouter adds state persistence/lifecycle obligations | Keep S Swup as observed baseline. Compare alternatives later; do not run two managers or infer equivalent lifecycle from build |
| Search | Pagefind is third-party | Retain one CLI/index lifecycle and strict index failure; locale/base/CJK real-browser tests |
| LLM v2 | Proposal at llmstxt.org, not Astro built-in or SEO ranking guarantee | #78 remains integration work: locale/subpath indexes, source-backed Markdown, alternate/describedby, draft/private/encrypted negatives; full export separate policy |
| Build optimization | Stable7.4 timings; incremental/parallel still experimental | Compatibility experiment only; do not enable flags. #83 remains Future outside release gates |

Primary references checked2026-10-26: [Astro7.4](https://astro.build/blog/astro-740/), [loader API](https://docs.astro.build/en/reference/content-loader-reference/), [i18n](https://docs.astro.build/en/guides/internationalization/), [routing](https://docs.astro.build/en/guides/routing/), [RSS](https://docs.astro.build/en/recipes/rss/), [sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/), [images](https://docs.astro.build/en/guides/images/), [transitions](https://docs.astro.build/en/guides/view-transitions/), [LLMs v2](https://llmstxt.org/). Official docs/source were cross-checked with Context7 and fixed Astro7.4.2 file-loader source. Source/API availability is not ALNILAM integration acceptance.

Performance/security limits: upstream default modules/network fonts, substantial S runtime, MDX build execution, mutable third-party API data, asset rights, legacy base defects and missing regression cases. No SSR/database/runtime service added. No experimental accelerator or production dependency upgraded.

## E. ADS governance

| Capability | State / test | Evidence and action |
| --- | --- | --- |
| Stable Gitlink proposal | CONFIGURED / PASS after CI repair | #84 exact stable commit; original CI hardcoded v0.3. Repaired pin check in `fdae422f89a80a8a45f1031baa14305fba92cf97`; verify PASS. No merge |
| Public CI independence | VERIFIED / PASS | Existing and new workflows checkout submodules:false, persist-credentials:false; no private cross-repo token added |
| CodeGraph operation | CONFIGURED / PASS | CLI1.0.1; correct active MCP project; source exploration worked; native sync automatically increased61→69 indexed files and594→683 nodes after P0 additions. A pending edited file persisted at final preflight; one explicit project-local sync was used for recovery and freshness rechecked |
| CodeGraph official provenance | BLOCKED | Installed package is @colbymchenry/codegraph1.0.1, ADS official channel is andysom25/codegraph. npm official latest actual404 and Releases empty. Approved upstream fallback SHA is `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata1.1.1/MIT), not a published stable release. No authorization to replace global install was inferred |
| Full RTK edition | VERIFIED / PASS | Installed1.0.1 official Homebrew archive matches binary and both CLI/engine licenses; engine methods work; log sample1280→581 bytes; sentinel exit7 preserved |
| RTK latest stable | BLOCKED | Official stable v1.1.0 published2026-10-25T18:00:11Z. Existing global1.0.1 is outdated; update requires Owner grant |
| Developer-only configuration | PARTIAL | Existing ignored local indexes and RTK host integration work; no new generated/config/host artifacts committed. No manifest pretending official provenance complete |
| Production boundary fixtures | PASS | Exact stable ADS guard +9 positive/negative fixtures copied with MIT; offline DAG additionally runs actual guard on both release trees |
| Existing exact main / corrected audit candidate | FAIL historical main; PASS task candidate | Stable guard rejects historical tool-specific .gitignore entries. #85 removes those two entries and keeps local generated-data exclusions in untracked Git info/exclude. The exact staged candidate is exported and checked with the unchanged guard; actual main remains unmodified and failing until a reviewed adoption |
| Required enforcement | CONFIGURED in #85 | Actual guard now runs within required `verify`, with trusted branch context; the built dist/site is separately scanned as a production artifact on every verify. Dev target prints SKIP, never production PASS. Separate generic workflow also checks main PRs; no Ruleset changed |
| ADS candidate code | PASS locally, live NOT_RUN | Stable boundary9 tests; candidate provider/review/sync19 tests. Safe mirror script remains incompatible with the new release-authority direction |
| Native delegation | VERIFIED bounded read-only use | Three source/governance audit workers and one follow-up review. Shared host has unrestricted filesystem: no OS confinement or model-cost/speedup claim. Only parent wrote/integrated changes and ran experiments |

RTK archive SHA256 `4aae2f60cfc49c9e81b8c8c57020aa0cb824da608c78b4f0cf5c0988e19e824e`; binary `3c74b98caa71b0aa2a1832d287492638d12d5e1b6e6d9fdb2be1a82e32746c49`. Full RTK CLI Apache-2.0 and engine BUSL terms remain independent of ALNILAM; no rtk-oss substitution. [Official editions](https://www.rtk-ai.app/docs/resources/editions/), [v1.1.0](https://github.com/rtk-ai/rtk/releases/tag/v1.1.0).

Released ADS STANDARD/SAFETY/QUALITY still say0.3 candidate; record as historical title drift. Forward-only correction and new pilot design are proposed in [ADS Draft #67](https://github.com/Skyline-Gazer/ADS/pull/67), based on candidate13c50f. Immutable v0.4 tag/history unchanged. #67 passes116 tests and docs validation; it **does not implement new sync adapters** or grant cutover.

## F. CNB + Greptile pilot

**Overall PARTIAL / NOT_READY for cutover.** CNB login DETECTED as pony-gazing; user-facing repository inventory showed four existing repositories and no ALNILAM or designated P0 sandbox. No unrelated repository, credential store or production ref was modified. No secret was opened. Platform permission enforcement and a scoped target pair remain BLOCKED/NOT_RUN.

Greptile GitHub App **INSTALLED/CONFIGURED**: repository GitHub Apps UI and installation155415547 show Only select repositories → Skyline-Gazer/ALNILAM. Existing permissions include read actions/deployments/metadata/security alerts and write checks/code/status/issues/PRs; an additional permission request is pending and was not accepted. The API installation listing returned403, resolved by read-only UI rather than interpreted as absence. The authenticated Greptile dashboard exposed only a different organization, not Skyline-Gazer; ALNILAM billing/credits/OSS eligibility therefore remain UNVERIFIED. No organization addition, paid upgrade or quota assumption.

Current-SHA review gate remains **UNVERIFIED**: observed #77/#84 checks were GitHub Actions verify, formal reviews empty; no current-SHA Greptile result was established. Rulesets require only verify. [Official Greptile config](https://www.greptile.com/docs/code-review/greptile-config-reference) supports statusCheck and review-on-source-update, but comments/score alone are not a required gate. Keep auto-approval/auto-merge disabled; a future trusted verifier must bind actual installed App identity, current SHA and unresolved severity to the protected required gate. Account fee/OSS conditions are not inferred from public pricing.

Proposed authority: CNB dev daily PR/review/fix; GitHub Issues/Project17 tasks; GitHub dev candidate integration; GitHub main sole release; CNB main published-release copy. Freeze candidate → unprotected GitHub release/cnb-<SHA> → merge-commit PR into dev → separate merge-commit dev→main with Greptile/CI/license/security/boundary/Owner approval → controlled exact release/tag copy to CNB main → reviewed CNB dev reconciliation. No direct push to protected GitHub branches, no force/wildcard tags, no automatic bidirectional sync.

**Two-round offline PASS:** `python3 -m unittest discover -s scripts/tests -p '*_test.py'` includes two consecutive rounds over two local bare remotes, feature/preparation/import/release/reconciliation merge ancestry; first release ancestor of second candidate; candidate/release Tree equality with explainable merge SHA differences; actual guard on production trees; exact annotated tag object; idempotent repeat; interruption after main before tag; rejected backward branch and tag replacement preserving refs. This fixture has no CNB/GitHub review, server protection, trusted credentials, event-loop or existing ADS adapter execution. Those remain NOT_RUN.

Candidate sync only supports CNB-authoritative main→GitHub main; requested direction and protected transfers are incompatible. [ADS #67](https://github.com/Skyline-Gazer/ADS/pull/67) records schema/adapter/authority/recovery requirements separately under #63; no silent relaxation. A further decision is needed if CNB main protection forces an extra merge commit instead of exact-SHA fast-forward copy. Same Tree must not be called same Commit. Existing candidate tests do not prove two rounds or live interruption/protected-credential recovery.

## G. Plan / Spec and documentation changes

- #77 remains the only Draft Plan/Spec; evidence/corrections are applied there, not cloned into a competing specification. Correct selection priority, S existing list/right layout, real default font network, per-file/media licensing, K dual-router/source-vs-full export limits, and legacy defects.
- ADR0001 is proposed, not frozen. Reuse matrix distinguishes immediate preservation from future conditional retirement.
- PRODUCT light-mode/shipped-scope and MAINTAINERS link/check wording corrected. ROADMAP/HANDOFF explicitly separate historical P0–P4 from Next P0–P6. PROJECT_TRACKING now cites actual Project/item/native-relationship read-back. Root version/status corrections remain in separate #84.
- Markdown relative-link checker with deliberate missing-link negative fixture joins required verify. Legacy Site config/schema fixtures are unchanged. No product source removal, imported frontend or dependency upgrade.
- P0 Issues remain open where Owner decision or real acceptance is missing; GitHub Project is not marked synchronized/Done. Experimental #83 remains Future.

G0-F freeze candidate needs Owner decisions on (1) Shirone design plus exact list/mobile contract; (2) v1 adapter and legacy URL aliases vs future opt-in v2; (3) enabled optional modules, privacy/export and asset/font selection; (4) runtime/a11y/performance budgets replacing overbroad historical zero-JS claims through stronger tests; (5) official tool replacement/update grant; (6) provider pilot authority and isolated target, separately from any production cutover.

## H. P1 proposal — not authorized

| Order / dependency | Existing Issue / PR split | Acceptance before advancing | Risk |
| --- | --- | --- | --- |
| 0 Owner P0/G0-F + mandatory tooling | #36/#82; retain #77/#84 review boundaries | Accept evidence/risks and frozen requirements; approve official tool provenance/freshness actions | No inferred approval |
| 1 Finalize independent S baseline/7.4 choice | #47/#79, separate compatibility PR from frontend import | Resolve actual upstream browser failures/gaps; desktop/mobile/theme/search/nav/MDX/assets evidence; pinned lock | Upgrade and upstream defects |
| 2 Single S assembly with retained controller | #37/#46/#80; one small integration PR | Same13 contracts and old/legacy Site, no original input mutation, one route/index/theme/transition owner | Route/content coupling |
| 3 Site-v1 adapter and compatibility URLs | #48/#51–#56 as frozen traceability permits; separate config/content and asset PRs | External Site root/subpath, digest/provenance, upgrade/rollback and no writeback; explicit aliases | Breaking public links/schema |
| 4 Lifecycle/UI parity and budgets | Candidate P3 tasks only after preceding tests | Layout/keyboard/reduced-motion/theme/navigation/search; no duplicate manager; measured output budgets | Hydration/performance/a11y |
| 5 Later locale taxonomy/SEO/LLM v2 | #40/#62–#65/#78; later Phase authorization | Real language-filtered routes, partial translation negatives, canonical/base/sitemap/RSS, private/draft/encrypted export exclusions | Privacy and indexing |

Milestone M1–M3 / native hierarchy remains proposed in #77, not created or claimed completed. This table orders dependencies; it does not authorize later Phases. Each implementing PR must update its affected docs and retain the source-specific RDR/rollback. No CNB production cutover or Greptile paid setup is prerequisite to evidence review.

## I. Final verdict / Owner gate

**NOT_READY** for unconditional G0-F freeze or P1. Existing platform and isolated build proofs are valuable PASS results, but mandatory tool provenance/freshness, real-browser completeness, historical main boundary pending merge, legacy base/module regression requirements, media/font rights and real dual-platform gates are unresolved. CNB/Greptile live limitations block a provider cutover, not completion or review of this P0 evidence report. Final workflow outcome is FAILURE, retained alongside the independent PASS checks. Full individual outcomes are in [execution.json](evidence/execution.json), including failures/timeouts; no result is upgraded to PASS by another green check.

Owner must explicitly accept the P0 findings, freeze the sole Plan/Spec, and authorize an exact P1 scope. All PRs remain Draft/open. No main mutation, release tag, production Pages dispatch, provider cutover, global install, App permission update, Ruleset bypass or paid service occurred. Work stops at this Acceptance Gate.
