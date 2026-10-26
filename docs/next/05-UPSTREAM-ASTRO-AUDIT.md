# ALNILAM Next — Upstream implementation and Astro 7.4 audit

> **2026-10-26 — REVIEW PROPOSAL, NOT AN IMPLEMENTATION PASS.** Companion to 00-PLAN, 01-SPEC and 04-ROUTING-SEO-LLMS-V2. This addresses two questions: is every planned capability already implemented in the four references, and does the latest official Astro offer a better direct implementation? Source-file review and official documentation do not constitute a working integration, user acceptance or full E2E verification.

## 1. Pinned reference snapshots and framework baseline

| Source | Pinned commit | Declared Astro | Position |
| --- | --- | --- | --- |
| Shirone `LyraVoid/Shirone` | `55a84b2322bdfb634a59ca6383bb242e5ce646bf` | `7.3.8` | Main product/design/code baseline |
| Firefly `CuteLeaf/Firefly` | `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` | `7.3.2` | Layout and candidate modules |
| KIRARI `markd3ng/KIRARI` | `5700bcdeb965de87a1818d5d9aec6bf8e227523d` | `7.3.5` | Provenance, external Site, LLM v2 and locale taxonomy |
| Mizuki `matsuzaka-yuki/Mizuki` | `14da4262d8aa1d93dc8cff11705f14918ed7369f` | `7.1.3` | Selective fallback source |
| ALNILAM `dev` at audit | `5fd74cea8197dc91d8391e7ee677eacbc32d3234` | `7.3.x` (check exact lockfile at execution) | Existing Site immutability and Git history |

Astro's **7.4** release was published 2026-10-15; Astro upgrade docs list **7.4.1** at review time. Initial migration SHOULD preserve the known-compatible upstream Shirone lockfile, followed by **a separate isolated Astro 7.4.x compatibility PR** using official `@astrojs/upgrade` and real regression tests. Do not mix framework upgrade with main-base import or use floating `latest` for production. Docs: https://astro.build/blog/astro-740/, https://docs.astro.build/en/upgrade-astro/.

## Implementation priority correction: preserve functioning ALNILAM before substituting upstream

**Product base = Shirone. Existing codebase/platform = ALNILAM.** Before replacing anything with official Astro functionality or imported KIRARI/Firefly code, audit the **actual ALNILAM implementation** and behavior. Keep/Adapt/Wrap existing working Core/Site builder, CLI, old/new Core rollback, contracts, artifact checks, Pagefind and optional modules; only remove source after equivalence/reproducibility tests, licencing and docs migration. A newer Astro API is an implementation candidate, not automatic permission to rewrite. See [06-REUSE-DOC-GOVERNANCE.md](06-REUSE-DOC-GOVERNANCE.md) and P0 #80.

ADS v0.4 is independently verified (official tag commit `2af17d9e1d816844c49835ae91b784405765ad46`) and upgrades via draft #84; runtime CodeGraph/full RTK proof remains under #82. Experimental Astro incremental/parallel build acceleration is outside releases until official stable state, tracked by future #83.

## 2. Verified source inventory and official-first decision matrix

Legend: **Existing source** = inspected upstream code/doc exists; **Adapt** = cannot drop into ALNILAM unchanged; **New integration required** = no single reference implements ALNILAM's exact contract. **Official** means Astro or official `@astrojs/*` integration. The original planning review had not executed tests. P0 #85 now supplies actual pinned baseline evidence, with individual failures retained below; this does not prove ALNILAM integration.

| Phase/capability | Known-source evidence | Astro official/current path | Decision / remaining gap |
| --- | --- | --- | --- |
| P0 Git/ADS provenance, license inventory, owner scope | ALNILAM `AGENTS.md`, `docs/MAINTAINERS.md`; MIT Shirone/Firefly/KIRARI, Apache-2.0 Mizuki | **Not an Astro feature** | **New project governance integration**; historical authorization and asset rights must be checked |
| P1 Shirone blog UI | Shirone `src/pages/`, `src/integration/index.ts`, `src/components/`, `package.json` | Astro file routing, `integrations`, `@astrojs/svelte` | Reuse Shirone; run upstream E2E first, do not rewrite router |
| P1 npm/installable Astro package | Shirone `docs/npm-package-mode.md`, `src/integration/routes.ts` | Astro Integration API (route injection/hook support) | Reuse existing adapter if needed; **npm distribution is not mandatory** until owner decides |
| P2 external Content + config | ALNILAM `scripts/compose.mjs`, KIRARI `apps/site/scripts/site-contract-v2.mjs`, Shirone `scripts/content/sync.mjs` | **Astro Content Layer `glob()` external dir**, `file()` JSON/YAML/TOML, `getCollection()`, Zod schema | **Official loader first for posts/taxonomy.** Staging/materialization only when needed for image/fonts/legacy import; no blind copy of Shirone's sync-back behavior |
| P2 read-only Site, dual SHA, rollback, staging | ALNILAM compose, KIRARI `external-site-build.test.mjs`, `composition-provenance.test.mjs` | No built-in immutable Git Site / rollback controller | **Project-specific integration required**, reuse proven logic, not new full engine |
| P2 image build assets | Shirone `docs/asset-pipeline.md`; KIRARI image tests | Astro `<Image/>`, `<Picture/>`, `getImage()`, Sharp / new 7.4 split service | **Official image pipeline first**; Site source remains immutable, custom adapter only for external-asset paths and reproducibility |
| P2 build speed/caching | KIRARI tests and Shirone performance tools | Astro 7.1 `deferRender`, 7.2 **experimental incremental build**, 7.4 `--timings` and **experimental** parallel prerender | Use timings and measurements first; experimental caches/parallel only after deterministic/isolated Site tests |
| P3 M3E / UI | Shirone `docs/m3e-standard.md`, `src/components/atoms/` | Astro CSS/layout/components, `@astrojs/svelte` | Reuse Shirone design; no native M3E kit |
| P3 Fuwari one-row / cover-right | Shirone `src/config/postListConfig.ts`, Firefly `src/components/layout/PostCard.astro`, ALNILAM Editorial | Astro presentation components | **Existing**, adapt design tokens and required fixed default |
| P3 transitions/swup/lifecycle | Shirone/Firefly Swup; KIRARI dual-path `transition-manager.ts` (source reference only; do not import its two-manager model) | **Prefer native MPA view transitions**; use `astro:transitions` `ClientRouter` only if persistent state needed. Native reduced-motion support. | **Do not immediately carry two JS routers**. Compare no-router / native MPA vs ClientRouter and Swup with page-jump, audio, keyboard and browser regression. Preserve existing behavior until tested |
| P3 theme controls | Shirone `LightDarkSwitch`, M3E tokens | Browser color-scheme CSS, Astro islands, Svelte | Reuse; no competing site-wide theme stores |
| P4 i18n routing | KIRARI `apps/site/src/utils/i18n-utils.ts`, `src/pages/[lang]/`; Shirone translations and UI language files | **`i18n` config, `astro:i18n` `getRelativeLocaleUrl/getAbsoluteLocaleUrl`, `Astro.currentLocale`** | **Official locale routing first**. Custom code only for translationKey-to-real-content identity, locale slugs, versioned alias policy |
| P4 categories / tags | KIRARI `src/pages/[lang]/categories/[...category].astro`, taxonomy.json; Shirone `src/pages/categories.astro` + `src/pages/tags.astro` | Content Layer collection + Zod schema + `getStaticPaths()` | **Adapt**: Shirone current category/tag pages point to archive query filters, not the intended independent per-locale taxonomy detail routes. KIRARI most relevant. Stable machine IDs + translations + indexing must be composed from Site data |
| P4 blog pagination | Shirone/Firefly list UI; ALNILAM paginated posts | **`paginate()`** native; Astro 7.1 **`format` URL override** | Use Astro-native `paginate()`; custom code only for taxonomy filtering, page metadata and link validation |
| P4 Markdown/MDX/math/diagrams | All four upstreams | Astro Markdown pipeline, **official `@astrojs/mdx`**, integration plugins; Content Layer `entry.body` | Reuse a SINGLE pipeline. Remark/Rehype for special syntax; never layer four pipelines. Avoid untrusted MDX execution |
| P4 Pagefind search | All relevant themes with Pagefind; KIRARI & ALNILAM browser-tested | **Not Astro built-in**: Pagefind's own official multilingual index via `<html lang>` | Retain Pagefind. No custom per-language indexing engine; use official feature + real CJK tests and valid `base` URLs |
| P4 RSS | Firefly `src/pages/rss.xml.ts`, KIRARI localized feeds | **`@astrojs/rss`** | Prefer official generator; feed selection/locale metadata and canonical item URLs are product-specific |
| P4 sitemap + multilingual alternates | Shirone/Firefly `@astrojs/sitemap`, KIRARI alternate helpers | **`@astrojs/sitemap` `filter`, `serialize`, `i18n`** | Prefer official sitemap generation. **DO NOT assume simple i18n mode handles partial translations correctly**; compare against actual published equivalence map, use `serialize` if needed |
| P4 canonical/OG/JSON-LD/hreflang | KIRARI, Shirone, Firefly layout helpers | `Astro.url`, `Astro.site`, `astro:i18n`, standard HTML tags and JSON-LD. No Astro core end-to-end SEO automation | Custom metadata policy needed; centralize actual source of published URL identities, not duplicate Astro path helper logic |
| P4 Github Pages base prefix | ALNILAM `withBase`; KIRARI `import.meta.env.BASE_URL` | **Astro `site` + `base`**, `astro:i18n` helpers | Configure native base; avoid a second hand-built generalized locale router. Only domain-specific route registry for slug/taxonomy and legacy aliases |
| P4 legacy redirects | ALNILAM pre-existing `/posts/en/.../` URLs | Astro redirects and 7.4 **experimental custom static redirect page** | **No universal 301/308 on GitHub Pages**; host-specific redirects vs HTML fallback and canonical; decision must be tested with actual host |
| P4 LLMs.txt v2 | **KIRARI P6/#101** `llm-content.ts`, `llm-markdown.mjs`, tests; Shirone has only `llms.txt`/full aggregator; Firefly root `llms.txt` | **No Astro core v2 generator**; use static `GET` endpoints, collection source bodies and shared URL helpers | Adapt KIRARI source-backed, locale-aware v2; Shirone's regex-cleaned full aggregate should **not** be treated as v2 |
| P5 album/moments/music/Anime/comments | Shirone `src/components/`, `src/pages/` + media widgets; Firefly rich modules; Mizuki alternatives | No native complete products. Svelte/Astro islands and framework integration exist | Reuse already-functional module candidates with separate selection; provider secrets, licenses and external network verification still need real tests; scope awaits owner |
| P6 QA / a11y / snapshots | Shirone `tests/`, `playwright.config.ts` and Lighthouse; KIRARI `apps/site/scripts/tests/` | Astro `astro check` / `--timings`, runtime accessibility features; **Playwright/axe/Lighthouse are external** | Reuse tests and extend Site root/subpath, cross-browser and privacy assertions; no framework guarantees PASS |
| P6 license/security/provenance/release | ALNILAM and KIRARI release/CI docs, Shirone CI | Astro official features help CSP (7.1) and bundling but **no license/CI/release governance automation** | Existing project-specific mandatory work remains |

## 3. Mandatory corrections to current Plan/Spec

1. **Framework choice:** Shirone-first means `7.3.8` initial known-good import; create a *separate* `Astro 7.4.x compatibility and official integration replacement` investigation/task. Use version pinning, not permanent freeze of older framework.
2. **Routing choice:** Change “implement a single home-grown route generator for everything” to **Astro `i18n` config + official `astro:i18n` URL helpers + a thin content-identity registry** for taxonomy/slug/translationKey. Source-of-truth for HTML routes stays Astro's file-based routing/getStaticPaths. Do not promise one magical helper handles all slugs, locale selection, SEO alternates and legacy route migrations automatically.
3. **Content import choice:** Attempt Astro Content Layer `glob({base: externalSitePath})` and `file()` first, preserving build-only staging for files that need asset processing or config transpilation. Regression gate must show original Site digest unchanged.
4. **SEO choice:** Use official `@astrojs/sitemap` with filtering/i18n/serialize as applicable, official `@astrojs/rss`; no extra custom sitemap/RSS formatter unless there's a demonstrated gap. Incomplete translations need **real route-inventory** validation before emitting alternates.
5. **Pagination choice:** Use `paginate()` (7.1+ `format()`) instead of hand-written next/previous math and URLs, after verifying output under root and GitHub Pages subpath.
6. **Transitions:** Test **traditional MPA/native browser View Transitions first** before importing full Swup lifecycle; evaluate Astro `ClientRouter` for retained music or other persistent state; do not break Shirone by mass deletion without browser proof.
7. **Images & fonts:** Prefer Astro's supported Image/Picture/getImage and Font API where they actually meet the Site asset and CJK requirements. Shirone's CJK font subsetting is more specialized and may remain needed; benchmark instead of declaring native fonts superior.
8. **LLM v2:** Preserve separate #78. KIRARI has closest existing source-backed v2, while Shirone/Firefly implementations are basic indexes/aggregation. Astro offers static endpoints and content source access, not full llmstxt.org v2.
9. **Build performance:** Astro 7.4 `--timings` for evidence. 7.2 incremental and 7.4 parallel are **experimental**: do not make either a baseline architecture dependency or compromise deterministic external-Site builds.
10. **Upgrade/publishing governance:** Keep Core/Site SHA/digest/rollback and owner authorization because neither Astro nor any single reference combines ALNILAM's exact versioned contract.
11. **Test before replacing:** Each official-first substitution is an ADR/comparison with explicit conditions: source evidence, official API version, migration cost, fixture compatibility, browser proof, bundle/perf measurement, and rollback.

## 3A. No automatic experimental build acceleration

Astro incremental build and parallel prerendering are intentionally deferred under #83 until their respective official stable releases. Do not enable experimental flags during Shirone migration or the current release candidate. Preserve current deterministic compose, public CI, output digest and Site isolation, then benchmark if a stable feature truly improves performance.

## 4. What is not confirmed yet

- No integrated build or 1:1 browser test of all four references into ALNILAM has occurred during this audit. “Has implementation” means a source location exists; not “drop-in compatible” or “production accepted”.
- Dynamic multi-language taxonomy translation-key slug contract as written in SPEC does NOT exactly exist in one reference; KIRARI is nearest, requires a Site Schema migration.
- Cross-host redirect status codes and Pages static fallback require target-host trials. No universal Astro server redirect in GitHub Pages SSG.
- Astro 7.4.x behavior in Shirone's own Integration/overlays has not yet been executed; it is a separate proof point.
- The original explicit owner decision on reintroducing gallery/moments/music is still unresolved; modules in source do not create product authorization.
- Performance of native View Transitions vs Swup, Astro font API vs Shirone font subsets, and Astro external glob vs staged materialization must be **measured**, not inferred.

## 5. Gate decisions and references

**G0 Plan/Spec gate:** Require every Phase's candidate task to state **official API first / upstream code reference / custom gap + why** and a concrete acceptance fixture. Projects must not mark tasks execution-ready until this exists.

Official:
- Astro 7.4: https://astro.build/blog/astro-740/
- Astro 7.1 pagination + CSP: https://astro.build/blog/astro-710/
- Astro 7.2 incremental (experimental): https://docs.astro.build/en/reference/experimental-flags/incremental-build/
- Astro Content Layer: https://docs.astro.build/en/reference/content-loader-reference/
- Astro i18n URLs: https://docs.astro.build/en/reference/modules/astro-i18n/
- Astro native View Transitions: https://docs.astro.build/en/guides/view-transitions/
- Astro sitemap incl i18n: https://docs.astro.build/en/guides/integrations-guide/sitemap/
- Astro RSS: https://docs.astro.build/en/recipes/rss/
- Astro images: https://docs.astro.build/en/reference/modules/astro-assets/
- Astro fonts: https://docs.astro.build/en/guides/fonts/
- Pagefind multilingual: https://pagefind.app/docs/multilingual/
- llmstxt.org v2: https://llmstxt.org/changes.html

Upstream source Git references are pinned in section 1. This audit revises implementation method, not approved feature scope, and does not authorize PR merging or production release.


## P0 G0-R execution receipt — 2026-10-26

Authoritative audit and exact evolving receipts: [ALNILAM P0 Acceptance & Decision Report](https://github.com/Skyline-Gazer/ALNILAM/blob/chore/p0-evidence-preflight/docs/p0/P0-ACCEPTANCE.md), [file-level RDR](https://github.com/Skyline-Gazer/ALNILAM/blob/chore/p0-evidence-preflight/docs/p0/REUSE-DECISIONS.md), [Draft PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85). This supplements these existing Draft documents; it does not create a second Spec or freeze any requirement.

- Published v0.1.3 tests/check/build/external Site/two-version upgrade-rollback pass on an ephemeral runner. Product source at dev5fd74ce and release07fac43 is identical; retain it and every old test. Provenance is Core SHA + Site digest; separately pinned Site Git SHA is caller responsibility.
- All four fixed references and v0.1.3 are materialized detached/clean outside Core. Shirone7.3.8 and isolated Astro7.4.2 pass typecheck,681 Node tests and build. Non-mutating Biome lint has5 actual errors in both. Initial480-test single-worker browser run exceeded10minutes; complete suites are separately sharded on isolated runners, and a Swup content-wait flaw in the P0 preview harness is corrected. Consult exact outcomes rather than Actions continue-on-error step conclusions. No production dependency changed.
- Shirone already defaults list/right; Firefly is not needed for that layout. Shirone default font subsetting requests Meting text; build is not proven offline/deterministic. Its sync writes/prunes Core staging/mounts and timestamp-locks; preserve ALNILAM's immutable external Site controller.
- KIRARI locale taxonomy/source Markdown is useful source evidence, but its ClientRouter/Swup dual mechanism is not imported. Its llms-full is HTML-derived and does not automatically inherit source-export/privacy guarantees. No upstream is a complete drop-in ALNILAM contract.
- Repository code licenses do not clear media/fonts. Firefly imagery includes miHoYo rights; Mizuki has per-file inherited MIT notices; Shirone Yozai font clearance is unverified. No upstream frontend/media imported.
- Existing ALNILAM generated nested-base canonicals/post-list links escape /ALNILAM/, default disabled Bangumi still emits /opt/bangumi/, and Search hydrates on posts despite a weaker script-tag guard. These are regression requirements, not authorizations to rewrite/delete old code.
- #84 stable ADS pin remains separate/unmerged; its stale CI pin assertion is repaired with verify PASS. Official CodeGraph provenance and RTK latest-stable compliance remain blocked; exact stable production guard rejects historical tool-specific .gitignore entries. No global install or gate relaxation.
- Actual Project17 read-back has17 historical Done items, no Next membership, no Phase field, no milestones or native Next hierarchy. Existing tracker structure remains unchanged pending G0-F.
- CNB Development + GitHub Release Gate is a distinct proposed extension, not ADS v0.4 or the current CNB-authoritative mirror. [ADS Draft #67](https://github.com/Skyline-Gazer/ADS/pull/67) records the incompatibility/forward-only version-title correction. Two-round offline Git mechanics pass; real protection/credentials/review/event-loop acceptance remains NOT_RUN/BLOCKED. Greptile App is installed for ALNILAM, but current-SHA review/required-check and account entitlement remain unverified.

**Owner Gate stays closed:** accept P0 findings, decide G0-F frozen Plan/Spec and authorize an exact P1 scope explicitly. No CI result, Issue state, this document update or proposed ADR grants implementation/release/cutover permission. Optional modules, runtime budgets, legacy aliases, Site schema migration and tool installation still require the recorded relevant decisions.


### Final baseline receipt

[Completed run40284029959](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40284029959), P0 harness `bf6a5871aed39d87f0232e8e360c343ff3362566`: both original7.3.8 and isolated7.4.2 have681 Node tests/typecheck/build PASS, production-preview desktop/mobile/theme/real Pagefind/article/back PASS, lint5errors FAIL, and complete upstream E2E **415pass/17fail/48upstream skips out of480**. Motion/sidebar icon, taxonomy icon and visual snapshot failure sets match; no blind snapshot update, skipped test or production upgrade. Compatibility remains PARTIAL. Exact shard names/diagnostics/artifact digests and the NOT_READY Owner verdict stay in #85's report.

The stable guard also detects old main's historical tool-specific ignore rules. #85 repairs only its task candidate by moving local generated-data exclusions to untracked Git info/exclude; the exact exported candidate and built distribution are checked without relaxing the guard. Actual main remains unchanged. Official CodeGraph provenance/RTK freshness and real provider cutover remain separate unresolved gates.
