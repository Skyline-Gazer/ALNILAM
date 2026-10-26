# ALNILAM Next — Product and Engineering SPEC (proposal)

> **DRAFT / NOT FROZEN — 2026-10-25.** Implementation begins only after explicit G0 review. The words MUST/SHOULD describe target behavior, not capabilities already shipped in v0.1.3. Linked plan: [00-PLAN.md](00-PLAN.md).

## Normative product requirements

| ID | Priority | Requirement | Verifiable acceptance |
| --- | --- | --- | --- |
| PRD-01 | MUST | Existing ALNILAM repo/identity, commit history, release/tag and dev/main PR rules retained. | No history rewrite; PR from dev; no direct-push to release main; v0.1.3 remains untouched. |
| PRD-02 | MUST | Shirone-derived **single** frontend base; Firefly, KIRARI, Mizuki are reference sources, not parallel full applications. | One Astro root, design system, navigation lifecycle, content contract and search pipeline; selected-source provenance documented. |
| PRD-03 | MUST | Main post list is one post per row; desktop text left / cover right (~28%); mobile cover above. | 1440px/390px browser screenshots for ordinary, long title, missing cover and mixed-language fixtures. |
| PRD-04 | MUST | Actual end-to-end usability of homepage, posts, archives, taxonomy, nav, search and article detail. | Browser flows from homepage through search/article/category/tag/archive with nontrivial post corpus; no 404. |
| PRD-05 | MUST | Dark and light palette with predictable interactive, keyboard and reduced-motion states. | Keyboard navigation; no flash/mismatch and no broken touch controls across page transitions. |
| PRD-06 | SHOULD | Shirone M3E semantics and component reuse form a coherent visual language. | Single token set, no duplicate components of the same job unless ADR justifies an exception. |
| MIG-01 | MUST | **Shirone is the sole frontend base, but the existing ALNILAM codebase is reused first**, with no blank-project rebuild or gratuitous deletion. | Reuse Decision Record (RDR) for existing compose/schema/rollback/artifact/tests/CI/search/comments/Bangumi, KEEP/ADAPT/WRAP by default, justified replacement plus prior/current regression evidence; same repo/Git history retained. |
| MIG-02 | MUST | A new source/theme integration never silently removes working ALNILAM user features, stable Site inputs or legacy URLs. | File-level before/after list, v1 legacy Site tests, migration and rollback guide, real root/base E2E; deletions receive explicit independently reviewable proof. |

## Content and Core/Site contract

| ID | Priority | Requirement | Verifiable acceptance |
| --- | --- | --- | --- |
| CS-01 | MUST | Core owns executable program; independent Site owns content/configuration/data/assets. | Build against a Site checked out in a different directory/repo; Core checkout does not require Site material inside its source tree. |
| CS-02 | MUST | Source Site is immutable input and **never** a staging output. | Byte hash of every Site file before and after build is equal; build stages derived assets/content elsewhere; failure preserves prior successful output. |
| CS-03 | MUST | Core and Site revisions are independently pinned; composition output records provenance. | Core git SHA + Site Git SHA/digest in artifact metadata; reproducible repeat-build test on pinned inputs; no git checkout/reset/push to Site by builder. |
| CS-04 | MUST | v0.1.x schema v1 Sites remain compatible or have explicit, user-controlled version migration. | Existing v1 and legacy fixtures run or fail with documented migration and tests; version change never silently rewrites user config. |
| CS-05 | MUST | Build does not imply publish. | CI build/preview lacks production token and cannot ship public production without separate approval and protected environment gate. |
| CS-06 | SHOULD | Site-side content config can be validated without writing to its source. | Read-only validation of bad schema, broken links, path traversal, asset collision, protected content and known optional providers. |

## Blogging, search and metadata

| ID | Priority | Requirement | Verifiable acceptance |
| --- | --- | --- | --- |
| BLOG-01 | MUST | Posts/pages support Markdown, trusted MDX, date, draft, cover, tags and a **distinct category** model. | Sample Site with at least 12 posts, 2 categories, mixed tags, drafts and translated articles; public routes correct. |
| BLOG-02 | MUST | Archive, category/tag listing, stable slugs, pagination and series if in finalized scope. | Page 2, category detail, tag detail, old URL migration rules if URL format changes; no duplicate slugs. |
| BLOG-03 | MUST | Pagefind local search is lazy and returns valid navigable results. | Search with actual fixture corpus on root domain and `/ALNILAM/` subpath; no index requests before feature is used when lazy policy applies. |
| BLOG-04 | MUST | SEO URLs, hreflang, RSS, sitemap, robots, canonical/OG/JSON-LD and internal links honor the deployment base path. | Crawl *generated output*, parse each URL, browser-click real pages under both `/` and `/ALNILAM/`; regress old #34 issues. |
| BLOG-05 | MUST | Local and remote image behavior does not break Site immutability or violate licenses. | Correct paths, responsive dimension/CLS, alt, no unintended third-party fetch or embed; image generation only in isolated staging. |
| BLOG-06 | MUST | i18n UI, translated content, locale-aware taxonomies and feeds use **one canonical route registry**, including default-locale unprefixed / other-locale prefixed rules. | Route examples and missing-translation behavior specified in 04; zh-CN/en/ja fixtures; only real equivalent hreflang, localized taxonomy pages and Pagefind language separation. |
| BLOG-07 | MUST (opt-in feature) | Support **llms.txt v2** locale/subpath indexes, source-backed Markdown page views and HTML discovery when enabled. | /llms.txt, /en/llms.txt, article index.md, alternate/describedby, disabled=absent, root and /ALNILAM/ tests; optional full aggregation separately configured. |

### Reuse-first and document-governance normative annex

**[06-REUSE-DOC-GOVERNANCE.md](06-REUSE-DOC-GOVERNANCE.md) binds every Phase.** Preserve the existing `Skyline-Gazer/ALNILAM` repository and working Core/Site, CI and tests while using Shirone as the ONE product frontend base. Every destructive code change requires a Reuse Decision Record and proof; copying upstream code does not imply rewriting ALNILAM. Maintain documents and evidence with the corresponding code PR, not as a release-end afterthought. ADS v0.4 is pinned in separate Draft PR #84, and experimental build acceleration is only a post-stable TODO #83.

### Official-Astro-first implementation criterion

[05-UPSTREAM-ASTRO-AUDIT.md](05-UPSTREAM-ASTRO-AUDIT.md) maps every capability group to actual pinned reference source and Astro 7.4 official APIs. **Before coding, the relevant Issue must identify (i) Astro official function/integration, (ii) existing upstream source+SHA, (iii) the smallest missing ALNILAM-specific contract and why custom code is warranted.** Avoid a duplicate localization router, content system, static RSS/sitemap generator or image engine when official Astro features satisfy the acceptance behavior; protect vendor compatibility and prove any proposed substitutions.

### Route/SEO/AI content normative annex

[04-ROUTING-SEO-LLMS-V2.md](04-ROUTING-SEO-LLMS-V2.md) is the detailed reviewable contract for **ROUTE-01–07, TAX-01–06, SEARCH-01–03, SEO-01–09 and LLM-01–08**. This annex overrides ambiguous high-level wording in this table. In particular URL basePath, locale prefixes, category/tag IDs, canonical/hreflang, search isolation and llmstxt.org v2 are not optional guesses left to implementers.

## Optional modules and privacy

| ID | Priority | Requirement | Verifiable acceptance |
| --- | --- | --- | --- |
| MOD-01 | MUST | Optional modules are individually switchable from Site config, default OFF unless owner explicitly authorizes otherwise. | Disabled route/widget has zero SDK/network requests, zero empty placeholder DOM and no unnecessary JS/CSS in shared bundle; verify browser network and built assets. |
| MOD-02 | MUST for approved scope only | Comments/Bangumi integration works when enabled with correctly scoped config and static-first behavior. | Enabled preview exercises real interaction or fully isolated deterministic provider fixture; provider failures degrade safely; no secrets in public files. |
| MOD-03 | PENDING scope | Gallery/album, moments/dynamics, music are candidate modules; historical “declined” note is not independent authorization proof. | Owner-approved scope record must precede implementation or formal deferral; nonselected items are not misreported as shipped. |
| MOD-04 | SHOULD | Feature sources are chosen via functionality/license comparison, not by feature quantity alone. | Per-feature implementation owner (Shirone vs Firefly vs Mizuki) documented; duplicate engines removed. |

## Quality, compliance and delivery

| ID | Priority | Requirement | Verifiable acceptance |
| --- | --- | --- | --- |
| NFR-01 | MUST | Public CI is remote-first and needs no access to private ADS submodule or production credentials for PR validation. | PR checks install frozen lockfile, type-check, unit + integration + browser tests and reproducible output. |
| NFR-02 | MUST | Project milestone/phase/task completeness reflects evidence, not merely merged PR or green unit tests. | Every task links source SHA, PR, CI run URL and relevant screenshot/browser report; Phase Gate uses independently verified proof. |
| NFR-03 | MUST | Code and assets obey source licenses and attribution requirements. | File-level source/commit provenance, retained MIT notices/Apache-2.0 obligations; no unlicensed illustrative images, character assets, music or font redistribution. |
| NFR-04 | MUST | Baseline security: no public keys/secrets, unsafe arbitrary build plugin claims, uncontrolled privileged network access or unwarranted third-party scripts. | Secret scan, dependency audit, CSP/privacy review; document trusted MDX scope and provider permission boundary. |
| NFR-05 | MUST | Accessible keyboard/touch experiences, reduced-motion support, mobile readability and stable runtime lifecycle. | 390px & 1440px cross-page E2E, repeat nav/scroll/search tests, no critical axe issues, screenshots and measured CLS. |
| NFR-06 | SHOULD | Realistic performance budgets are established *from measured Shirone/ALNILAM baselines*, not invented values. | Record LCP, CLS, INP where measurable, JS/CSS/image/font weights and page count; define explicit CI fail thresholds after baseline measurements and justification. |
| NFR-07 | MUST | Main/tag/production deploy are separate owner-authorized operations. | PR to dev for work, then explicit release PR and authorization; no automatic production promotion or secret deployment. |
| NFR-08 | MUST | **Document governance**: correct single-source Plan/Spec/ADR, current-vs-draft labels, implementation-driven README/PRODUCT/ARCHITECTURE/SITE_ONBOARDING/HANDOFF/ROADMAP/RELEASE/NOTICE, traceability and docs CI. | #81 document inventory, link/schema/version checks, updated owner-and-Site docs in same functional PR, historical evidence preserved, CI with negative fixture. |
| NFR-09 | MUST | ADS consumer governance follows **v0.4** rather than old v0.3, with CodeGraph and **official full RTK** development-only checks and real production boundary. | Gitlink commit matches v0.4 `2af17d9...`; public CI does not need private ADS clone; dev-only CodeGraph/RTK, production-boundary negative tests, verified preflight/hook status, explicit approval for installs; #82 and Draft PR #84. |
| NFR-10 | MUST | Experimental Astro incremental/parallel build acceleration is **out of current release scope** until officially stable and independently validated. | Future-only #83 has no M1/M2/M3 Milestone or Phase Gate; revisit stable release proof, Shirone compatibility, representative performance and reproducibility after stabilization. |

## Acceptance scenarios (Gherkin-style)

### S1 — External Site immutability
Given a pinned Core SHA and a separate pinned Site SHA with a documented schema
When a remote CI build composes them into an isolated output directory
Then Site digest and Git worktree do not change, and the resulting provenance records both inputs.

### S2 — Existing Site upgrade and rollback
Given an unmodified schema-v1 Site
When Core is upgraded between two tagged/test commits and then rolled back
Then the Site remains unchanged, public routes remain valid or migration steps are explicit, and rollback serves the prior valid output.

### S3 — Nested Pages deployment
Given `https://skyline-gazer.github.io/ALNILAM/`
When a reader opens a category, follows pagination, searches for an article and opens RSS
Then all navigation and canonical/OG/sitemap URLs retain the `/ALNILAM/` prefix while external URLs remain external.

### S4 — Base design
Given the representative 12-post fixture
When rendered in 1440px desktop and 390px mobile, dark and light
Then one post appears per feed row, cover positions match the agreed composition, no side overflow occurs, and all interactive controls work with keyboard or touch.

### S5 — Disabled features
Given all optional third-party modules disabled
When the site builds and is opened in a fresh browser context
Then no third-party SDK/script/iframe or empty placeholder module is loaded; disabled-module CSS/JS are not bundled into global initial payload.

### S6 — Provenance and licensing
Given one chosen Firefly or Mizuki implementation imported into Shirone-based Core
When the integration PR is reviewed
Then it identifies the source commit/files, why Shirone's existing capability was insufficient, source notices, and a specific regression test.

### S7 — Localized taxonomy + SEO
Given zh-CN/en/ja fixture articles and stable taxonomy IDs
When generated for root hosting and /ALNILAM/ Pages subpath
Then only available locale taxonomy pages are emitted, they display local language posts, self-canonical URLs, accurate mutual hreflang, correct pagination and no broken links.

### S8 — llms.txt v2 discovery
Given LLM publishing is enabled and an article with code/math/images has locale-specific source Markdown
When the static site is built under /ALNILAM/
Then an exact path- and locale-aware llms.txt index links to a source-backed index.md, page head alternate/describedby point to real output files, nonpublic content is absent, and disabling the feature removes all outputs/discovery.

## Stage gates and readiness

**Read-only P0 evidence discovery does NOT require the final frozen Spec.** It generates the evidence needed to freeze it: pinned reference source checkouts, existing ALNILAM behavior/tests, pristine Shirone browser baseline, Reuse Decision Record, risk and licensing. Existing P0 Issues may be investigated/propose documentation without implementing a changed production feature or merging releases. **G0-F Spec freeze** then authorizes execution-ready P1–P6 feature tasks after per-Phase Ready review. Full status/gaps: [07-PHASE-READINESS.md](07-PHASE-READINESS.md).

## Definition of Ready for an implementable Issue
- [ ] Linked Plan and frozen Spec requirement IDs.
- [ ] Implementation owner/source selected and conflicts resolved.
- [ ] Explicit scope / non-scope, dependencies, tests, expected evidence and rollback.
- [ ] Credentials/environment needs enumerated *before* agent starts; missing ones cannot block independent work.
- [ ] No task spans multiple unrelated releases just to mark a Phase complete.

## Definition of Done and phase exit
- [ ] Issue-linked PR into `dev` with code review and automated evidence.
- [ ] Remote CI results and real browser preview/screenshots for user-facing changes.
- [ ] Contract, external Site, static path, license and privacy regression tests as relevant.
- [ ] Acceptance owner records PASS / PARTIAL / FAIL / NOT VERIFIED.
- [ ] Project fields and parent/sub-issue progress accurately reflect actual state.
- [ ] No production/tag work without release-specific owner approval.

## Review-needed product decisions (not implementation blockers yet)
1. The Shirone M3E + Firefly/Fuwari-list visual contract replaces or coexists with the older cinematic SHBlog Next inspiration; record approved screenshots or design tokens.
2. Historic gallery/moments/music deferral vs reopening for ALNILAM Next; select/defer each explicitly.
3. Which user-level Site customization interfaces are vNext MUST vs later SHOULD, after comparing actual upstream code.
4. Which optional third-party providers require a live preview rather than a deterministic fixture.

**Status discipline:** all requirements are targets until code and verification evidence exist. The 39 active candidate task Issues remain candidate backlog until this Spec is reviewed and frozen.

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
