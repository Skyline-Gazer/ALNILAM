# ALNILAM — Current Agent Handoff

## Live-state update — 2026-11-13 · Demo deployment verified

This section records the current CNB `dev` revision and the verified public Demo
runtime. Earlier UX, product and issue evidence remains below.

### Source and CI

- The Demo was built from CNB `dev` `1cd67c47b7cab200f8bc4d25f7c359ef26dfe0f2`
  (tree `5ab0827df5c41ed5a1bb099e7f5e27578cc23fe9`). The `dev` push pipeline
  `alnilam-independent-site` succeeded in 105s. PR #122's exact-merge trusted
  consumer succeeded in 29m49s: 201 browser tests passed, 1 intentional skip;
  root and `/ALNILAM/` were covered.
- GitHub `dev` remains `39ca829f97a60247f4c6a14e619dd847a5e895eb`; it was not
  synchronized. GitHub PR #132 remains open and unmerged. CNB `main`, tags and
  the ADS pin were not changed.
- CNB PR #124 remains open. Its latest target trusted run failed after 202 tests
  passed and 1 intentional skip: `tests/browser/shirone.spec.ts` hit the
  5-second timeout while capturing the root desktop screenshot. The run did
  not report a product assertion failure. GitHub Actions run 43403806749 belongs
  to the open mirror-sync PR #132; it is not PR #124's trusted consumer.

### Artifact and deployment

- Project `xxxx` deployment `dpl_8Qqz1ySC2EGtt7crjkxvv3pDdM7p` is READY on the
  production target. The prebuilt output came from the source SHA above;
  `vercel build --prod` generated 75 pages, `artifact-check` verified 74 pages,
  and the artifact budgets passed.
- `dist/site/alnilam-provenance.json` records Core revision
  `1cd67c47b7cab200f8bc4d25f7c359ef26dfe0f2` and Site digest
  `6854784b7e62aa9d3337045678576396fc15062ecf5e1aa791782e17bf4ee9e6`.
  The sorted `.vercel/output` file manifest SHA-256 is
  `ab253c866e8b997c6be46af3120d33cba57912948035ace3879ba1f80a0bec6c`.
- Public `https://xxxx-beryl-theta.vercel.app` now resolves to that deployment;
  its `/alnilam-provenance.json` response matches the build. The previous
  deployment was `dpl_GLi7EKtnRPatd9M87bntojBsKTJB`. Only the existing stable
  alias was assigned with `vercel alias set`; no project-wide promotion ran.

### Stable URL verification

- A public browser session loaded the home page and `/posts/`; opened the series
  index and detail; followed both article directions and confirmed each article
  carries the two-item series context.
- Pagefind search for `ALNILAM` returned four results, including both series
  articles. Selecting the dark theme set `data-theme="github-dark"` and
  `localStorage.theme="dark"`. The browser error log was empty.
- No product route or interaction blocker was reproduced on the stable URL.
  #35 remains Open / In Progress for Owner product acceptance and visual
  sign-off; the finite engineering probe set remains closed.


## Live-state update — 2026-11-13 · UX closeout and series slice

Everything below this update is historical context. This section records the
current CNB `dev` tip, the finite #35 engineering closeout, and the product slice
delivered after the UX probes.

### CNB delivery (verified 2026-11-13)

- CNB `dev`: `38b345c64e110c04a29e809d8516597c48e0bc66`, merged from PR #122
  (`fix(series): render article series context`). Before merge, `dev` was
  `3172f989378444da9c1d33e38870de9b0d4cc731`; PR source was
  `163c01a140c3593bb42da3a8e0357beecc6bbc9e`. The merge was non-force; source
  ancestry and the resulting live `dev` ref were read back.
- The delivered slice advances the series clause in `BLOG-02` of
  `docs/next/01-SPEC.md`: default and localized article routes receive the
  shared Shirone series context, and the demo exposes the two-article series and
  an MDX example. Root and `/ALNILAM/` browser coverage passed.
- Post-merge CNB push on `38b345c64e110c04a29e809d8516597c48e0bc66` succeeded:
  pipeline `alnilam-independent-site`; `Validate pinned independent Site`
  passed (98.2s total build).
- GitHub `dev` still lags CNB `dev`; do not mirror or push. Vercel production,
  `main`, tags and ADS pin were not changed.

### Verification and review status

- PR #122 trusted consumer passed in 29m49s on the exact merge candidate:
  **201 browser tests passed, 1 skipped**; both root and `/ALNILAM/` were
  exercised. Mobile and desktop Lighthouse assertions passed for six URLs
  (home, post list and article, at both bases), three runs per URL and viewport.
  The intentional CLS expected-red control, Node source coverage and evidence
  receipt stages passed.
- Docs-links, comments-browser and accessibility-browser candidate checks
  passed. The optional AI review advisory errored after 13.3s; no platform review
  was recorded, and no review approval is claimed. The advisory is not a required
  development approval under the current Owner workflow.
- The pre-fix trusted run reproduced Back/Forward restoring the nested article
  position 32px away from recorded `scrollY` (contract: ≤2px; 198 passed,
  1 skipped, 1 failed). PR #122's `fix(nav): share history restoration runtime`
  resolved it in the passing exact-merge run; no gate was relaxed.

### #35 engineering exit

- #35 remains Open / In Progress for Owner product acceptance and visual
  sign-off. Its finite engineering probes are complete; the current PASS,
  SUPERSEDED and OWNER_PENDING classifications plus the resolved scroll result
  are recorded in [the 2026-11-13 Issue update](https://github.com/Skyline-Gazer/ALNILAM/issues/35#issuecomment-6845988169).
- Core/Site, PhotoSwipe and P6 evidence remain referenced from their existing
  records; they were not re-audited. Do not start another broad #35 UX loop.

### Continuation

- Select the next product item from the live Project #17 and current roadmap/spec
  state. Do not infer completion from this handoff; #67–#69, #83, #88 and #89
  remain outside this round's authorization.


## Live-state update — 2026-11-12 · offline Pages CMS PoC merged (current tip)

Everything from "## Live-state update — 2026-11-12 · UX finalization closed" downward is
retained historical evidence. This section is the authoritative tip for the offline
Git-based authoring PoC (Issue #88) and the current `dev` commit.

### Git / remotes (verified live 2026-11-12)

| Ref | Value |
| --- | --- |
| CNB `dev` | `240cf1f05c8a251d5320dfe3b01fc151c2dbcdb1` — fast-forward from PR #117 (previously `1e2cdc1…`, and `efc336ab…` before #116) |
| Round commits | #116 `fa46ae6` → … → `1e2cdc1`; #117 `559680d` → `b495803` → `b4aff01` → `240cf1f`; each merged as one fast-forward tip |
| GitHub `dev` | lags CNB; **do not mirror/push** |
| Vercel Production | unchanged (project name `xxxx` — not a commit SHA — production branch `dev`, tracks the stale GitHub `dev`) — read-only |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |

### This round — Issue #88 offline PoC

| PR | Effect | Trusted consumer |
| --- | --- | --- |
| [#116](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/116) | Isolated Site `.pages.yml`, offline `verify`/`edit`/`init` adapter, category-drift detection and dual-base compose tests; zero Core/product changes | green on the final head `1e2cdc1` (31m33s); merged fast-forward |
| [#117](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/117) | `create` verb (declared fields only, validated required values/types/select options, no overwrite, confined to `content/posts`) and the corresponding docs/tests | merged with the gate red for a **target-owned test defect** (see below); the repair ships in this PR |

### Verification

- `pnpm test` **265/265** (serialized); `python3 -m unittest discover -s scripts/tests -p '*_test.py'` 14/14; `pnpm check` 0 errors / 0 warnings / 0 hints; `pnpm build` + `artifact-check` + `seo-check` green; demo Site digest `23d159e4…` unchanged by `.pages.yml`.
- `scripts/tests/pages-cms.test.mjs` **16/16** locally: field mapping against the demo Site's real posts, unknown-key/comment/MDX byte roundtrip, root + `/ALNILAM/` builds with `artifact-check`/`seo-check`, CMS removal digest/provenance equality, CLI entry guard under a spaced path, missing `content/posts` diagnostics, `--out` confinement, out-of-root media rejection, frontmatter split boundaries (body starting with `---`, block scalars, EOF without a trailing newline), `component` fields, the shared schema template, `create` (declared fields only, refusals), `init` taxonomy generation/`--force`, stale-select drift repair, and the no-catalog free-text fallback.
- Candidate pipelines (docs-links, comments/a11y browser) are green on every head; the dev push pipeline is verified on the merged tip.
- **Trusted-gate incident and repair:** after #116 merged, the target-owned `pages-cms.test.mjs` started running in the trusted consumer and failed in `before()` — `fs.cpSync` preserves the read-only fixture modes, so unlinking `.pages.yml` from the copy hit `EACCES`. The hook fails before any candidate code and reproduces locally with a read-only fixture, so no PR could turn the check green until dev carried the fix. #117 therefore merged with that check red, after documenting the candidate-independent cause; `copySite` now normalizes the copied root and the second copy uses the same helper. The follow-up verification PR must show the trusted consumer green.
- A trusted-consumer run failed once in the target-owned `navigation-lifecycle` browser spec (`browserContext.close` after a 90 s timeout, 2/4 cases). The same spec passes 4/4 locally in 1.1 min, and the change adds no browser surface; the gate was re-run with a new SHA rather than weakening any check.

### Status and tracks

- **#88** In Progress: offline PoC delivered and extended with post creation (compatible-by-design / PoC-verified). Hosted Pages CMS and its GitHub App permissions, a real external Site, deletion and concurrent-edit behavior, and the Decap/Keystatic comparison stay Owner-authorized; nothing is integrated or in production.
- **#89** remains a separate post-launch headless-CMS assessment (not started).
- **#67–#69, #83** remain deferred. **#35**, **#73/#74**, **#81**, **#94** keep their Owner/CI-infra tracks.

### Next task

Continue the product lane on CNB `dev`. The offline PoC is additive and inert
(Core never reads `.pages.yml`); do not treat it as an integration. Any further
CMS work that needs an external service or repository permission stays
Owner-gated.

## Live-state update — 2026-11-12 · UX finalization closed, product lane resumed

Everything from "## Live-state update — 2026-11-11 · product development round" downward is
retained historical evidence. That section records the closed #35 engineering probe set and the
resumed product-development lane.

### Git / remotes (verified live 2026-11-12)

| Ref | Value |
| --- | --- |
| CNB `dev` | `b1355573b689b8238d9988b7dd8a4c54b317a461` — fast-forward from PR #114. PR #113 (`12b1abae…`) preceded it. This HANDOFF lands with PR #115, which advances the tip by the search empty state, its review fix and the documentation commits |
| Round commits | #113 `e6d46ba`→`12b1aba`; #114 `b135557`; #115 `6ead210` (search empty state) + the NPC review fix, changelog and this HANDOFF; each merged by fast-forward |
| GitHub `dev` | lags CNB; **do not mirror/push** |
| Vercel Production | unchanged (`xxxx`, production branch `dev`, tracks the stale GitHub `dev`) — read-only |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |

### This round — #35 engineering exit

| PR | Effect | Trusted consumer |
| --- | --- | --- |
| [#113](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/113) | `i18nForLocale()` gained a defined contract (Site override → locale dictionary → English dictionary → key name), a regional locale falls back to its base language, and the navigation landmark got a stable `#main-navigation` id so the shared contracts no longer depend on its accessible name | success 28m44s ([cnb-tvb-1k76o6p89](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-tvb-1k76o6p89#001)) |
| [#114](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/114) | The `Main navigation` and drawer navigation landmark names follow the page language in all ten dictionaries, also after a client-side language switch | success 38m18s ([cnb-74f-1k76pvvjn](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-74f-1k76pvvjn#001)) |
| [#115](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/115) | A finished search that matched nothing states it in the page language instead of showing an empty box (mobile) or closing without feedback (desktop); Issue #131 | trusted receipt in the PR |

### Verification

- **Locale contract**: `scripts/tests/i18n-translation.test.mjs` — 46 parameterized cases over the ten
  dictionaries (key-set equality, every key resolving to a non-empty string, the header labels per
  locale, regional variants, unknown-locale fallback, Site override precedence/isolation/typing,
  missing-key degradation).
- **Reduced motion**: `tests/browser/reduced-motion.spec.ts` — navigation, drawer, search and theme
  switch under `prefers-reduced-motion: reduce`, root and `/ALNILAM/`.
- **Search empty state**: `tests/browser/search-empty-state.spec.ts` — 8/8. The same spec fails 6/6
  on the pre-feature build (`element(s) not found`); the layout-switch cases fail 2/2 on the
  pre-review-fix build and pass 2/2 after the fix (the NPC review finding that the message followed
  either input instead of the visible one).
- **Unit suite**: `pnpm test` — 249/249 (serialized). Running the same files **without**
  `--test-concurrency=1` on a many-core host runs the compose-based tests in parallel; they then
  collide in the shared `apps/web/.astro` build cache (`ERR_MODULE_NOT_FOUND` on prerender chunks).
  Use `pnpm test` locally, as the CI runner (2 CPUs) serializes by default.
- **Local browser**: full suite at the round tip — **195 passed, 1 skipped (196 tests)** (the skip is
  the intentional `cnb-negative` probe); `pnpm check` 0 errors / 0 warnings / 0 hints; Site digest
  `23d159e4…` unchanged at every tip.
- **dev push**: the independent pinned-Site pipeline is green at every merged tip of this round.

### Status and tracks

- **#35** In Progress: the limited engineering probe set is closed and the acceptance list is
  classified PASS / SUPERSEDED / OWNER_PENDING in the Issue. Owner subjective visual sign-off,
  deployed-host evidence (#73), Field CrUX and screen-reader pass (#74), docs governance (#81) and
  the CNB pilot exit criteria (#94) stay with their owners.
- **#131** (search empty state) is delivered by PR #115.
- Product development continues on CNB `dev` through ordinary Issue-linked PRs; #67–#69, #83, #88 and
  #89 stay deferred.

### Next task

1. Continue the product lane on CNB `dev`: the next authorized, non-deferred feature from
   Project #17 and the frozen Plan/Spec.
2. Do not reopen a full UX audit loop for #35; the Issue stays open only for the Owner sign-off.

## Live-state update — 2026-11-11 · product development round (current tip)

Everything from "## Live-state update — 2026-11-11 · RC acceptance" downward is
retained historical evidence. This section is the authoritative tip for the
merged UX/accessibility round (#106–#112) and the current `dev` commit.

### Git / remotes (verified live 2026-11-11)

| Ref | Value |
| --- | --- |
| CNB `dev` | `6b55622040023e11d0e6983b3f6df8ed35b2dfb9` (tree `a53d8146…`) — fast-forward from #112. Round start was `3e061315…`; no force pushes or deletions were used. This HANDOFF lands as docs-only PR #109, which advances the tip by that documentation commit only |
| Round commits | #106 `bbe06230…` → #107 `756bd09a…` → #108 `449d2d18…` → #110 `699b7d7a…` → #111 `18989c03…` → #112 `6b556220…`; each merged by fast-forward |
| GitHub `dev` | lags CNB (handoff snapshot `39ca829…`); **do not mirror/push** |
| Vercel Production | project name is literally `xxxx` (confirmed actual name; project id `prj_2eRtFJHWRJPlM90z2CPT5kJA1XNg`), `link.productionBranch="dev"`, repo `Skyline-Gazer/ALNILAM` — read-only |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |

### Merged this round (user-visible effects)

| PR | Effect | Trusted-consumer |
| --- | --- | --- |
| [#106](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/106) | A menu tap that lands before the drawer island hydrates is replayed, so the first tap always opens the drawer; opening moves focus to the first drawer item | success 32m03s ([cnb-vi1-1k74ghbbp](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-vi1-1k74ghbbp#001)) |
| [#107](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/107) | The open drawer behaves as a modal: Tab/Shift+Tab stay inside the panel, Escape or a press outside closes it and returns focus to the menu button, and `aria-expanded`/`aria-controls` render before hydration | success 36m29s ([cnb-boh-1k74iduc1](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-boh-1k74iduc1#001)) |
| [#108](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/108) | Menu, display-settings, search and theme-switch accessible names follow the page language in all ten dictionaries, including client-side language switches; a press anywhere outside the drawer panel dismisses it | success 28m17s ([cnb-r6e-1k74n8cq6](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-r6e-1k74n8cq6#001)) |
| [#110](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/110) | `aria-expanded` flips only after the drawer is visible and focus is inside; Tab in the opening frame can no longer escape to the page | success 26m ([cnb-eu2-1k758t7ai](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-eu2-1k758t7ai#001)) |
| [#111](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/111) | Closed search/display-settings panels leave the accessibility tree and tab order, and their toggles expose `aria-expanded`/`aria-controls` (kept correct after Escape or an outside click) | success 27m ([cnb-bci-1k75al3q5](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-bci-1k75al3q5#001)) |
| [#112](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/112) | The header and page content are `inert` while the modal drawer is open, so assistive technology and scripts cannot reach the obscured page | success 36m ([cnb-4j5-1k75c9kb7](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-4j5-1k75c9kb7#001)) |

### Verification

- **Independent Site**: the `dev` push pipeline succeeded at all three tips (`bbe0623…`, `756bd09…`, `449d2d1…`) against the pinned Test-Site `6c0246f31cf6af04167c9ec7d09237731167c38d`, root and `/ALNILAM/`; compose, artifact budgets, SEO and provenance passed and the Site digest stayed `23d159e4…`.
- **Full browser suite** at the final tip `6b556220…` (LOCAL): **185 passed, 1 skipped (186 tests)**.
- **Remaining skip**: `tests/browser/cnb-negative.spec.ts` — `intentional browser failure probe`. It is skipped unless `CNB_BROWSER_FORCE_FAILURE=1`, which the separate negative check uses to prove the browser gate fails closed.
- **`pnpm check`**: 0 errors / 0 warnings / 0 hints on every head of this round.
- **New regression specs**: `drawer-hydration`, `drawer-focus-trap`, `nav-labels`, `panel-disclosure`, `drawer-background` — each failed on its pre-fix commit and passes on the merged tip (root and `/ALNILAM/`).

### Historical scrim-test failure and resolution

PR #108's first trusted run (`cnb-nc7-1k74lcg69`) failed the two
`drawer-focus-trap` scrim cases and timed out once in
`navigation-lifecycle /ALNILAM 390`. Cause: on the runner the drawer's open
class lands one frame after `aria-expanded`, so the click at the scrim
coordinates hit a surface that was not yet hit-testable. Resolution (in the
same PR): the drawer now dismisses on any pointer-down outside the panel and
restores focus on the following click, because mousedown's default action
would otherwise steal it. Verified locally by removing the open class before
the press. The merged run `cnb-r6e-1k74n8cq6` is green.

The same run also exposed an ordering race that surfaced later on the
docs-only PR #109: `aria-expanded` was announced one frame before the panel
was visible and focused, so a Tab in that frame left the modal. #110 sets the
attribute inside the visibility-gated focus step and keeps Tab inside while
no focusable item is visible yet; `drawer-focus-trap` is 12/12 with
`--repeat-each=3` and the related regression set is 32/32 at that tip.


### Status and tracks

- **#35** In Progress: the three engineering defects are fixed and evidenced; **Owner subjective visual acceptance is still outstanding** and is not claimed here.
- **#42 / #73 / #74 / #81 / #94** unchanged on the RC/P6 track: deployed host still serves the stale mirror and 404s the nested base (#73); Field CrUX and manual screen reader not run (#74); ADR inventory and named doc owners incomplete (#81); CNB browser pilot exit criteria open (#94).
- **Engineering development** continues on CNB `dev` through ordinary Issue-linked PRs.
- **Owner release** is separate: mirror sync, production deploy, Vercel branch policy, tags and visual sign-off remain Owner-only.

### Next task

1. Continue targeted #35 product investigation (mobile navigation and modal behaviour, i18n, keyboard, search interaction, reduced motion).
2. Keep #67–#69, #83, #88 and #89 deferred until their authorization conditions change.

## Live-state update — 2026-11-11 · RC acceptance (superseded by the development round above)

Everything from "## Live-state update — 2026-11-09" downward is retained
historical evidence. This section records the RC acceptance state at
`3da170e…` before the #106–#108 UX round; use the section above for the
current tip.

### Git / remotes (verified live 2026-11-11, re-read 2026-11-11T02:0x UTC)

| Ref | Value |
| --- | --- |
| CNB `dev` | `3da170e…` (tree `37c262ea…`) at the time of this reading. `2b7d18f… → e239835…` was the authorized test-only FF (#105); `e239835… → 3da170e…` is the #91 docs/CI merge (FF, trusted `cnb-sgb-1k749ovs5`, 36m29s). This HANDOFF itself lands as docs-only CNB PR #104; merging it advances the tip by that documentation commit only. Product code is unchanged from `2b7d18f…` through the #91 merge |
| GitHub `dev` | lags CNB (handoff snapshot `39ca829…`); **do not mirror/push** |
| Vercel Production | project name is literally `xxxx` (not a placeholder; `vercel projects list --json` returns `{"name":"xxxx","id":"prj_2eRtFJHWRJPlM90z2CPT5kJA1XNg"}`, and `GET /v9/projects/prj_2eRtFJHWRJPlM90z2CPT5kJA1XNg` returns `link.repo=ALNILAM`, `link.org=Skyline-Gazer`, `link.productionBranch="dev"`; read-only, 2026-11-11) |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |

### Resolved: target-owned skip budget deadlocked every PR (fixed by FF at `e239835`)

`scripts/ci/cnb-trusted-gate.mjs` copies `tests/browser` from the **target**
checkout (`prepareTrustedTests`), so candidate test edits never reach the trusted
run. Target `dev` carries 5 skipped tests, while
`scripts/ci/cnb-browser-audit.mjs` allows at most 1:

- 4 × `adblock-recovery.spec.ts` (`test.skip` added by `a094a95` when
  `ADS_FIXTURE`/`CONSENT_FIXTURE` are unset)
- 1 × `cnb-negative.spec.ts` (intentional)

Observed on CNB PR #105 trusted-consumer
[`cnb-pss-1k745dd7l`#001](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-pss-1k745dd7l#001):
163 passed, 5 skipped, `REPORT_INVALID: Playwright report contains 5 skipped test(s)`.
PR #91 (same diagnostic on its own trusted run)
and PR #104 ([`cnb-r4o-1k7456n34`#001](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-r4o-1k7456n34#001))
fail identically; all three have green candidates.

Resolution: CNB PR #105 registered the fixture cases inside
`if (process.env.ADS_FIXTURE === "1")` / `if (process.env.CONSENT_FIXTURE === "1")`
instead of `test.skip`, matching the existing adsense/GA4 pattern. Because the gate
executes target-owned tests, the only landing path was a non-force fast-forward of
the test-only commits onto `dev`; the Owner authorized that integration on
2026-11-11 and it was performed as `2b7d18f… → e239835…` (no force, no deletion).
Verified LOCAL before landing: with fixtures 19/19 (`analytics-ga4` 8,
`adblock-recovery` 5, `consent` 6); without fixtures 1 pass + 1 skip
(`cnb-negative`). Post-landing PR runs are the verification of record.

### Product acceptance this round (verification classes in parentheses)

| Claim | Evidence | Class |
| --- | --- | --- |
| categories/ArchivePanel `preScoped` retained | taxonomy unit 2/2, content-model 9/9, `archive-taxonomy` 14/14 | LOCAL |
| core `/` + `/ALNILAM/` regression | full local suite at `e239835`: **163 passed, 1 skipped (164 tests)**; `archive-taxonomy`+`native-shirone-base`+`a11y` 45/45 | LOCAL |
| dual-path compose + budgets | `compose.mjs` + `artifact-check.mjs` + `seo-check.mjs` OK for root and nested base | LOCAL |
| independent Core/Site | dev-push CI at `e239835` re-proved pinned Test-Site `6c0246f…` (digest unchanged, root+nested compose/artifact/SEO, provenance) — now CI, not only local | CI |
| Core upgrade/rollback | `upgrade-check.mjs --old 7abc75b` at `e239835`: Site digest `23d159e4…` unchanged, outputs differ as expected | LOCAL |
| optional modules with fixtures | `analytics-ga4` + `adblock-recovery` + `consent` 19/19 after #105 fix | LOCAL |
| #74 lab perf/a11y | local, gitignored `artifacts/lighthouse/{mobile,desktop}` (2026-11-11): 6 URLs × 3 runs, LCP medians 2727–3303 ms, CLS medians ≤ 0.0016; negative gate `EXPECTED_RED_VERIFIED` | LAB (local) |
| trusted gate | after the #105 fix: #91 PASS ([cnb-sgb-1k749ovs5](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-sgb-1k749ovs5#001), 36m29s); before it, `REPORT_INVALID` (163 passed / 5 skipped) on #91, #104, #105 | TRUSTED |
| empty taxonomy | a config category with zero posts emits no route and no index entry (fixture compose at `e239835`) | LOCAL |
| deployed host | `https://xxxx-beryl-theta.vercel.app/` serves `core.revision=39ca829…` (GitHub `dev` snapshot, 2026-11-07); `/ALNILAM/` → 404 | DEPLOYED (stale) |
| Field CrUX / manual screen reader | not executed | NOT_VERIFIED / NOT_RUN |

### Owner blockers (do not self-clear)

- Mirror sync / production deploy while Vercel Production tracks GitHub `dev`
  (`productionBranch="dev"`, verified above).
- Deployed-host E2E (#73); screen-reader manual and Field CrUX/RUM (#74);
  Owner subjective visual sign-off (#35); #94 pilot exit criteria.

### PR state

| PR | Head | Scope | Candidates | Trusted |
| --- | --- | --- | --- | --- |
| [#105](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/105) | `e239835` | GA4 `page.evaluate` + adblock skip-budget fix | green (`cnb-ujf-1k745dd7k#002`) | landed by non-force FF (Owner-authorized) |
| [#91](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/91) | `3da170e` | #81 docs-links (rebased on `e239835`) | green (`cnb-ln9-1k749ovs4#002/#003/#004`) | PASS; merged `3da170eefba92d8b94ac780bebcba756697b7336` |

### Known flake (test-side, tracked)

`native-shirone-base.spec.ts` `/ALNILAM 390` failed once in the first trusted run after the rebase (receipt kept in the PR checks; `.site-drawer__nav` link 'Categories' not found) and passed on the retried run `cnb-sgb-1k749ovs5`.
(`.site-drawer__nav` link 'Categories' not found) and passed on retry `cnb-sgb-1k749ovs5`.
Root cause: `#nav-drawer-switch` dispatches `site-drawer:toggle` from an inline handler, while only the
hydrated island listens; a click inside the hydration window loses the event. Local evidence:
`--repeat-each=2` on that spec is 20/20 at `e239835`, and the full local suite is 163 passed / 1 skipped.
No product code change was made for this.

### Next task

1. Owner: decide Vercel `productionBranch` / mirror-sync / deployed-host E2E (#73); run the manual screen-reader pass (#74).
2. Keep #42 open while #73/#74/#81/#94 have unmet exit conditions.
3. Do not develop #67/#68/#69/#88/#89/#83 ahead of Owner RC review.

## Live-state update — 2026-11-09 (current, supersedes 2026-11-08 below)

Everything from "## Live-state update — 2026-11-08" downward is retained
historical evidence. This section is the authoritative tip for the PhotoSwipe
lightbox cutover.

### Git / remotes (verified live 2026-11-09)

| Ref | Value |
| --- | --- |
| CNB `dev` | `51db84172d5a8fd0e3b80016c9065b149ba94801` (tree `15c5870bc37eb12ef0f5c9bf5a2bf0bb85aa47b5`) — PhotoSwipe #92 + thumb-full #96 |
| PhotoSwipe PR | [#92](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/92) merged `dff6740…`; trusted-consumer [success](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-3cp-1k6vmmflp#001) |
| Thumb-full fix | [#96](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/96) merged `51db841…`; Markdown image-only original links open lightbox; trusted-consumer [success](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-i0k-1k6vrgqtd#001) |
| Raster-open | [#94](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/94) merged `ba0da9d…`; trusted-consumer [success](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-qj9-1k6vc4jds#001) |
| Dual-compat tests | [#93](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/93) on `dev` before #92; target-owned harness stayed green against PhotoSwipe |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |
| GitHub `dev` / Vercel Production | lag CNB; do not mirror/push without Owner authorization |

### PhotoSwipe lightbox cutover (this round)

- Replaced `@fancyapps/ui@6.1.15` with MIT `photoswipe@5.4.4` behind the retained
  `FancyboxHandler` / `initFancybox` / `openFancyboxGallery` / `dataset.fancyboxReady`
  public API (filenames unchanged for Shirone fork stability).
- URL policy: HTTPS + site paths only; protocol-relative `//` → `https:`; same-origin
  http preview assets treated as site paths; signed query preserved; no image proxy.
  Ordinary text links that wrap images navigate (no lightbox hijack); page-like hrefs
  are never treated as originals.
- Prefetch CSS + PhotoSwipe ctor at init so open is synchronous for the target-owned
  dual-compat harness. Image-only anchors with a safe image `href` (Markdown thumb→full)
  open the lightbox; text links that wrap an image still navigate.
- Dimension probe with 8s timeout + original-link degrade; generation-token abort for
  Swup races; delegated document click/keydown; PhotoSwipe caption via `textContent`.
- HTTPS fixture matrix lives on `sites/demo/content/posts/lightbox-fixtures.md` (older
  pubDate) so hello-alnilam stays the first postcard with two bare local rasters.
- Local proof: `pnpm check` 0 errors; dual-compat harness smoke **15/15** against
  PhotoSwipe product (`body images` / carousel / close / theme / stylesheet retry).
- Purge: `@fancyapps/ui` absent from lockfile/`node_modules`. Remaining "Fancybox*"
  symbols are intentional compatibility façade names + `data-fancybox` grouping attrs.
- #91 (docs governance) remains open/parallel — not a PhotoSwipe gate.
- Outstanding: #73 deployed-host; #91 docs-links `git` fix. `main`/mirror/ADS pin untouched.

## Live-state update — 2026-11-08 (superseded by 2026-11-09 above)

## Live-state update — 2026-11-08 (current, supersedes earlier 2026-11-08/#76 section below)

Everything from the previous "## Live-state update — 2026-11-08" (#76 onboarding RC)
downward is retained historical evidence. This section is the authoritative tip for
P6 final convergence (#74/#73/#42).

### Git / remotes (verified live 2026-11-08)

| Ref | Value |
| --- | --- |
| CNB `dev` | `e9fa901d1fddbca6ab6aa0fb845b8954199bc451` (tree `f3894a47edec8cbad16421b336524c94db92c5b6`) — PR #88 merge, [dev push CI success](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-76c-1k6tnckt5) |
| GitHub `dev` | `39ca829f97a60247f4c6a14e619dd847a5e895eb` (tree `ce57903119b6783713a53d3ffdf088344c27a42d`) — **lags CNB by 43 commits** at this snapshot; Vercel Production tracks this tip → do not mirror/push without Owner authorization |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — release-only; Owner-authorized changes only |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |
| GitHub Issue #34 | **CLOSED** (superseded); not an open authorization for deployed-host acceptance |

### #74 perf/a11y (this round)

- [CNB PR #88](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/88) merged source `02cb8fdbc491501b79584156d68239302dec94ad` into `e9fa901d1fddbca6ab6aa0fb845b8954199bc451`.
- Preview gzip harness + Fancybox CSS `?url` defer; axe candidate suite/CI wiring. The current candidate [trusted-consumer](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-i0k-1k6tchb3h#001), a11y and comments CI succeeded.
- Current candidate LCP remeasurement: mobile receipt `b9d4558…`, desktop receipt `fa6e227…` (documentation-only delta), all 12 three-run medians below 4000 ms. Reports are local under `artifacts/p6-74/current/`; the earlier summary identified its uncommitted candidate's base `a7e3dd4…`. Field CrUX **NOT VERIFIED**; SR **NOT RUN**.
- #74 stays Open/In Progress: screen-reader testing and full original cross-phase matrix are not yet evidenced. Do not interpret lab metrics as full acceptance.
- #73 remains Open/In Progress: deployed hosts lag CNB tip.

### Prior tip — #76 onboarding RC (historical)

- Merged via CNB PR [#84](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/84) onto the tip above.
- Draft RC retained at `docs/RC-2026-11-08-P6-ONBOARDING.md` (pins below that file's original section are historical).
- Issue #76 Project status: Done.

## Live-state update — 2026-11-05 (superseded by 2026-11-08 above)

Everything from "## Historical snapshot — 2026-11-04" downward is historical
(2026-11-03/04). This 2026-11-05 section is retained evidence, not the tip.

### Git / remotes (verified live 2026-11-05)

| Ref | Value |
| --- | --- |
| CNB `dev` | `f35059c…` (tree `b9501d5…`) — Phase-0 baseline `d3b58a9…` + PRs #59/#60/#61 |
| GitHub `dev` | `d3b58a9…` — **pending one authorized mirror push**; do not auto-push (Vercel Production tracks this tip) |
| CNB `main` | `285a62ce…` — untouched; release-only, Owner-authorized changes only |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |

### Product changes this session (merged to CNB `dev`)

- **Lightbox empty-frame fix** — CNB PR [#59](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/59),
  head `a5f2bae…`, merge commit `78284b6…`. Root cause: Fancybox v6.1.15 ships no sizing CSS for
  `.f-panzoom__wrapper.is-fullsize`; the Panzoom wrapper collapsed to 0×0 and the viewport pinned
  at `scale(0)` (empty frame). Fixed in `fancybox-custom.css` + `fancybox-handler.ts`
  (`syncArticleImageSrcTargets`), ledgered in `SOURCE.json`. GitHub Issue
  [#123](https://github.com/Skyline-Gazer/ALNILAM/issues/123) closed with browser proof.
- **Archive/category detail UX restore** — CNB PR
  [#60](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/60), head `d9a9e9f…`, merge commit
  `6978882…`. `/categories/<slug>/` and `/tags/<tag>/` render the native Shirone ArchivePanel
  timeline (pre-scoped SSR filter, explicit-params-only `onMount`, localized label maps,
  `preScoped` for the app's alias/series membership); nested-base `CategoryBar` hide fixed.
  GitHub Issue [#124](https://github.com/Skyline-Gazer/ALNILAM/issues/124) closed with proof.
- New fixtures: `sites/demo/assets/lighthouse.png` + body images in `hello-alnilam.md`.
- New specs: `tests/browser/lightbox.spec.ts` (14/14), `tests/browser/archive-taxonomy.spec.ts`
  (10/10); `content-model.test.mjs` 9/9; `pnpm test` 145/145; `pnpm check` 0 errors;
  `cnb-quality`/`navigation-lifecycle`/`native-shirone-base` green.

### Online truth (do not conflate with `dev` merges)

- GitHub Pages still serves old build `0591e4b4…` — older than the Phase-0 baseline.
- Vercel Production tracks the **GitHub** `dev` tip (`d3b58a9…`), so it does **not** host either
  fix yet. Publishing requires an Owner-authorized sync/deploy of CNB `dev` (`f35059c…`).
- Repair + deployed-site acceptance remains open as Issue #34.

### Project / audit

- `docs/AUDIT-P0-P6-2026-11-05.md` (merged via CNB PR #61, `de9465c…`) is the live P0–P6 evidence
  audit; statuses read from live Issues, not from old HANDOFF prose.
- GitHub Project #17 (renamed **ALNILAM Dev**) rebuilt: native sub-issue trees
  (#37←#47–#50,#79; #38←#51–#56; #39←#57–#61,#123,#124; #40←#62–#66,#78; #41←#70,#71;
  #42←#72–#76,#81,#90–#94), statuses per audit (P3 `Done`, P4 `In Progress`, P5/P6 `Todo`),
  views `Roadmap`/`Hierarchy`/`Active` created via API (`Active` filters `Status in (Todo, In
  Progress)`), `Start date`/`Target date` fields created, release items `v0.1.0`–`v0.1.3` dated
  2026-10-25 (tag-commit-date-derived; no recorded release date found).
- Remaining UI-only steps (no GraphQL API; no GitHub web session in this DevBox):
  Roadmap view → select `Start date`/`Target date` as the date fields; Hierarchy view → enable
  native "Show hierarchy". One click each in the web UI.

### Branches

- CNB: 48 → **4** (`dev`, `main`, `codex/agent-pr-source-20261030` — unique unmerged #94 work,
  `codex/mirror-release-acceptance-20261030` — one-off mirror acceptance evidence).
- GitHub: 26 → **5** (`dev`, `main`, two `codex/mirror-*-acceptance-20261030` evidence branches,
  `sync/cnb-main` — prepared main-sync state ahead of `main`; keep until an authorized promotion).

### Next task

**#63 — pagination + Pagefind end-to-end** (P4/T02). No blocker Issue ahead of it was found in
the audit. Branch from the post-merge CNB `dev` tip (`f35059c…` or later).

---

## Historical snapshot — 2026-11-04 (superseded)

The remainder of this document is the **2026-11-03 historical snapshot**. Its PR,
Issue, CI and next-task statements are stale; check live CNB and Project state first.

## Live-state update — 2026-11-04

The remainder of this document is the **2026-11-03 historical snapshot**. Its PR,
Issue, CI and next-task statements are stale; check live CNB and Project state first.

- CNB PR #47 (native Shirone) was merged; #53 (derived-state lifecycle), #55
  (independent Site CI) and parent #38 are closed. Project #17 records P2 #51–#56
  and #38 as Done. No open P2 Issue was found at this update.
- #55 records both [Site push](https://cnb.cool/KoolingMachine/Test-Site/-/build/logs/cnb-cl4-1k6ims308)
  and [Core push](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-f5o-1k6iuqj87)
  validation of the independent Test-Site. A separately authorized GitHub
  [`workflow_call` run](https://github.com/Skyline-Gazer/Test-Site/actions/runs/41836937453)
  passed with Core `bc02fc2dea5c35218100fb320f695b7127fdf6ad`, Site
  `6c0246f31cf6af04167c9ec7d09237731167c38d` and unchanged digest
  `74fa5cd5b8ba0f0ce0658a5760539fbe63ddb4986fd23825cf85c78267aa3a42`.
  The public test Site called the Core workflow at an exact SHA with its read-only
  `GITHUB_TOKEN`; root and `/ALNILAM/` outputs and provenance passed. GitHub `dev`
  does not yet contain this workflow; the authorized non-production Core ref is
  `tmp/site-ci-core-bc02fc2`. No production mirror or deployment was performed.
- [CNB PR #53](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/53) merged the
  local-first test and evidence-upload workflow as `68e80e4b34b4b69308b37399dbd527567f5d5291`.
  Its pre-merge [trusted gate](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-8oj-1k6j70sg8)
  passed in 24m44s using the preceding target-owned harness. It does not prove that
  the merged harness itself has run; consult subsequent CNB runs.
- Use the local commands in [README](../README.md#local-browser-and-performance-checks)
  before pushing relevant changes. A 101 MiB synthetic attachment was uploaded,
  downloaded and SHA-256 verified using the official plugin on PR #53's source commit.
  That transport sample is not product-test evidence. Lighthouse reported LCP warnings
  and missing LCP values in the local audit; do not call those measurements a pass.

现场核实：2026-11-03 06:45 UTC。产品终态：**TRUE_RUN_INCOMPLETE**。
本文为零上下文接手入口，取代本文件旧版的“下一任务”清单；旧记录仍保存在 Git 历史。
功能证据绑定下述产品 SHA，本次交接文档提交不构成功能 CI 通过或合并。

## Task — 接手任务

继续既有 ALNILAM 开发链：先完成真正以 Shirone 为前端代码 Base 的集成，
在现有 CNB PR #47 修复原生派生状态清理及实际功能缺陷，恢复受影响的浏览器、
CLS、性能和资源验收，然后按有效合并要求普通合并到 dev。
按实际完成范围关闭 Issue / 更新 Project，再选择具备条件的既有产品任务。
普通开发无需 Owner 再逐项说“继续”；本次交接本身只提交文档，不合并功能代码。

## Context — 为什么需要这次交接

Owner 要求 Shirone 是实际 pages/layout/main-components 基座，ALNILAM 保留
Core/Site 契约与构建能力。前期实现却使用本地自绘布局，只借用了 M3E 样式，
并将旧界面的测试通过误当作 Shirone 目标完成。Owner 已明确纠正。

现在候选代码确实使用锁定上游的原生布局、页面、卡片、侧栏、设置、HCT 配色与抽屉。
但这不是已经发布或验收完毕：dev 仍是旧界面，原生修正在 WIP PR 中。
先前合并/CI 成功是其对应旧实现的历史事实，不能挪作原生基座的完成证据。

## Current state — 实时 Git、PR 与执行状态

| 项目 | 实时核实值 |
| --- | --- |
| 开发权威 | [CNB ALNILAM](https://cnb.cool/KoolingMachine/ALNILAM) |
| 任务权威 | [GitHub Project #17](https://github.com/orgs/Skyline-Gazer/projects/17/) + Issues / Owner 决定 |
| 当前分支 | `feat/61-visual-baseline`，沿用现有链，不新建重复 PR |
| 已合并 CNB dev | `046f251d0092adee8d7d7e091df6bce82dd3ac16` |
| 当前产品候选 | `d6a21217c4c260f9afe77f754042a162a0aa77d2` |
| 当前 [CNB PR #47](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/47) | Open / WIP / **未合并**，base 为上述 dev |
| 候选实测合成提交 | `7b03aa32b852bcabfa3d7d8796e4d439dde4735d` |
| CNB main | `285a62cecd87f8f20276c7cc989537a391f488c8`；未操作生产 |
| GitHub dev | `0d11757e111a4a5169d3a473b736ed2918bd3d2e`；不可当 CNB dev 的当前副本 |
| 有效 ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`；不升级、不操作 ADS 上游 |
| [CNB PR #43](https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/43) | ADS 独立维护提案，Open / 未合并；不要顺手合并 |
| 工作区 | 写交接前干净；交接提交只允许文档变化，产品代码仍以上述候选为基准 |
| Goals 自动续跑 | 本次 get_goal 回读仍为 `usageLimited`；普通工具可用。它不是 ALNILAM/CNB/ADS 组件，不保证结束会话后自动继续 |

本次文档提交 SHA、远端读取确认和新触发的文档头 CI 状态记录在 PR #47 交接评论。
不要将产品候选的测试直接宣称为文档新 HEAD 的同 SHA 功能 CI。

### 当前 CI：整体 ERROR，不能声称 PASS

- [功能 CI cnb-lev-1k6fohpd8](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-lev-1k6fohpd8#001)：
  **ERROR，8m23s**，绑定产品候选/合成提交如上。
- 实际已通过的阶段：Astro check 18 files / 0 diagnostics；Node 导入源码覆盖率
  85.2768%；13 页原生 compose 成功，Site digest 不变。
- 实际失败位置：`demo-artifact` 产物预算，32 项；不是仍缺 esbuild。
  首页 9 islands / 93.5 KiB；文章 10 islands / 8 script refs；列表最大 101.8 KiB。
  当前旧阈值为最多 2 islands / HTML64 KiB / posts 零运行脚本。
  图片尺寸、单一 h1、skip-link 等已修复，不属于本次剩余预算错误。
- [CodeBuddy 流水线 cnb-j9a-1k6fohpd7](https://cnb.cool/KoolingMachine/ALNILAM/-/build/logs/cnb-j9a-1k6fohpd7#001)：
  success，2m54s；实际 review `2117465473759801344` 仍给出意见。
  **插件退出/流水线成功不是 reviewer approval。** 实质处置见 PR 评论
  `2117468028619419648`、`2117501399970054144`、`2117507628498907136`。
- 已批准 G0-F 要求预算来自实测 Shirone/ALNILAM 基线。修正真实问题、测量合理预算；
  不允许仅提高上限、禁用检查/JS/图片来掩盖失败，也不为旧测试恢复已退役界面。

## Issue / Project — 当前完成状态

下表来自实时 Issue 与 Project 回读；不是从 roadmap 或旧 HANDOFF 推断。

| 范围 | 当前状态与含义 |
| --- | --- |
| #37 P1 | 重新 Open / In Progress；历史 2026-10-28 Owner 签收保留，不重写为“从未批准” |
| #48 / #50 | 重新 Open / In Progress：真正基座迁入与新的浏览器/Lighthouse 基线待验收 |
| #38 P2 | Open / In Progress；P2 没有全部完成 |
| #51 / #52 / #54 / #56 | Closed / Done；Core 契约、不可变构建、双 SHA/回滚、YAML/边界实现保留，本轮复验支持其基础功能 |
| #53 | 重新 Open / In Progress：原生新增缓存/生成文件生命周期不完整，具体复现如下 |
| #55 | Open / In Progress：真实独立 Site CI 未完成，且可执行入口待落实，不只是缺一个 token |
| #39 P3 | Open / In Progress；父清单 #57–#60 已取消勾选 |
| #57 / #58 / #59 / #60 | 重新 Open / In Progress：令牌、阅读卡片、导航设置、生命周期/CLS 必须在原生运行路径重新验收 |
| #61 | Open / In Progress：原生截图已有，但整体功能、归档及相关缺口未闭环 |
| #62 | Issue Open，属于 **P4** 内容/分类/标签/系列；本次完整 Project items 回读未列出该项，不能宣称已同步 Board |

只重做/迁移受影响实现和验收，不推倒全部 Core，不回滚所有已合并 PR。
P2 配置 `routing/categories/tags` 仅校验、保留；没有完整消费语义。
分类页面、多语言 taxonomy/series 属 P4 #62，不能因为配置存在就宣称功能已交付。

### 已合并的历史开发记录（保留，不等于原生版本验收）

| Issue / CNB PR | 实际 dev merge SHA |
| --- | --- |
| #57 / PR #42 | `1353df3e39a5f521c88cfb79b00ff3ef6c103f0f` |
| #58 / PR #44 | `c3f554144d0baed8a2d0a0d110b7567b1fdffdb7` |
| #59 / PR #45 | `d4df50e97b7c55f0eb814fa08e5a2f68ab9a720b` |
| #60 / PR #46 | `046f251d0092adee8d7d7e091df6bce82dd3ac16` |

这些当时的 CI 成功与截图保留；关闭完成的判断现已因基座纠正而重新打开。
PR #41 的历史 refs-moved ERROR 也保留，不能刷为成功或拿来阻塞无关任务。
P2 的 CNB PR23/33/35/37/38/39 已回读为已合并，对应实现均在当前 dev 祖先链。
#54 历史审查流程事实更正仍以其 Issue 评论 `6566977485` 为准，不改写历史。

## Relevant files — 接手代码地图

- [AGENTS.md](../AGENTS.md)：当前项目规则和 Owner 2026-11-02 开发覆盖决定。
- [G0-F 决定](next/08-G0-F-DECISION.md)、[复用边界](next/06-REUSE-DOC-GOVERNANCE.md)：
  单一 Shirone 基座、Core/Site 保留、从实际基线建立性能预算。
- `themes/shirone/upstream/`：真正上游源码，原始 MIT、480 个源文件原哈希；
  `SOURCE.json` 固定 `LyraVoid/Shirone@55a84b2322bdfb634a59ca6383bb242e5ce646bf`，
  当前 18 个消费补丁逐项列明。纯上游源码独立提交为
  `59097e72bdc3947de3ddfae5718d3c0690cd911d`。
- [主题入口](../themes/shirone/README.md)、`themes/shirone/package.json`：公共导出指向原生实现。
  `themes/shirone/src/` 是旧自绘适配，不是当前活动主题；旧 token 测试不证明新主题正确。
- `themes/shirone/adapter/site-config.mjs`：只读已校验 Site 的 public 配置映射；
  原生 provider comment 关闭，现有 Core Comments 通过 slot 接入，避免重复 SDK。
- `apps/web/astro.config.mjs`：仅一个 Astro/Svelte/Tailwind 栈；关闭上游重复 route 注入、
  bundled integrations、Pagefind writer 和字体 subset。Vite 仅给浏览器提供解析后的 public
  配置，不能导入 Node YAML/fs loader。Svelte5 原生处理 type-only TS，保留 Stylus 预处理。
- `apps/web/src/content.config.ts`：外部只读 glob，内存映射 `pubDate/published`、
  `cover/image`；保留旧字段供 Core feed/路由使用。disabled 集合为空 stub，不表示已有其字段契约。
- `apps/web/src/pages/`、`apps/web/src/modules/bangumi.astro`：原生页面与 Core 地址/SEO/开关适配。
  首页仍以相对路径直接导入**同一原生**布局和 PostPage，公共导出一致性清理尚待做。
- `packages/ui/src/Comments.svelte`：仍使用的 Core provider，适配 native theme-change，
  文章 slot 外层保留340px 初始空间；不是旧 Search/旧主题 runtime 的回归。
- `packages/core/src/`、`scripts/compose.mjs`、`site-contract.mjs`、`site-ref.mjs`、
  `upgrade-check.mjs`、`build-lock.mjs`：P2 主实现，本轮确认候选与 merged dev 未修改这些运行文件。
- `themes/shirone/upstream/src/integration/resolve/paths.ts`、
  `resolve/load-config.ts`、`vite/icon/regeneration.ts`：#53 新派生状态缺口的入口。
- `tests/browser/native-shirone-base.spec.ts`、`visual-baseline.spec.ts`：原生局部功能及截图矩阵。
- `tests/browser/shirone.spec.ts`、`navigation-lifecycle.spec.ts`、`cnb-quality.spec.ts`：
  含旧 DOM/主题/菜单绑定，需迁移并保留真实行为断言，不能只删断言让它变绿。
- `scripts/ci/cnb-metrics.mjs`：共享 LayoutShift 采集、来源、会话窗口 `calculateCLS` / budget。
- `.github/workflows/site-ci.yml`、`scripts/tests/workflows.test.mjs`：#55 已存在的合同代码，
  代码存在不等于真实外部 Site 的工作流已经执行。
- `scripts/artifact-check.mjs`：当前真实红预算；`scripts/ci/cnb-consumer-build.mjs` 与
  `cnb-trusted-gate.mjs`：target-owned harness。不要为了候选代码绕过 trusted gate。

上游字体、插画、demo 内容、音乐、sync 脚本没有复制。使用系统字体和 Site 自己的内容/资产，
保留 [第三方声明](../THIRD_PARTY_NOTICES.md)。图片仍有 ALNILAM 品牌不代表页面仍是旧模板。

## Evidence — 已验证什么、没有验证什么

### 原生候选 d6a2121

- root / subpath / enabled 三份 raw compose 成功，provenance 都绑定完整产品 SHA。
  普通 demo Site digest：`5fe6379c403641e98934ab41a8a4700b8e477cf4b336a2c7c4eaf6875e0294be`。
- 原生页面/真实搜索/键盘与截图组合本地 **16/16**；其中8个视觉矩阵为
  1440×1000 / 390×1000 × dark/light × root/subpath，共56张 gallery 图片。
  另有路由截图；13页内部 href 检查无404。#62 分类路由明确404，不用 tags 冒充。
- 启用 Comments/Bangumi 的受控探针2/2：viewport1440/390、高600、root；
  offscreen 评论可见前0请求、滚动后1请求、实际 iframe 挂载和 dark→light 消息通过。
  Bangumi 使用已有 build-time mock，**不是 live provider 验收**。
- 完整旧 UI 行为验收、原生完整 Lighthouse、原生完整 CLS 矩阵、field p75 均未完成。
- 当前 CNB 未运行到浏览器：先在 artifact 阶段失败。新增 candidate-only 测试尚未自动进入
  target-owned suite，不能把本地16/16写成当前远端浏览器16/16；必须实际验证后续 CI 归档采用。

### CLS 测量更正（必须保留）

原 PR46 旧 UI 的共享会话窗口算法记录仍是其旧界面的证据。
后来新增的原生小探针却用了原始 LayoutShift 累加值并误称 CLS，该表述已纠正。
原21MB截图包中的早期 probe/README不能当作标准CLS或完整#60验收。

随后已用现有 `observeLayoutShifts` + `assertCLSBudget/calculateCLS` 会话窗口算法重测：
两个 root-only 小场景窗口值为桌面0、手机0.00324258547008547。
手机事件源为 `floating-controls` 初始位置变化，不能归因为评论 iframe 独立 CLS，
也不代表跨源 iframe 内部或真实生产指标。
#60 仍需首载/滚动、10次文章列表往返、back/forward、主题/菜单/搜索/TOC、
图片/字体/懒加载、评论 off/on，在1440/390和root/subpath下做完整行为与位移来源回归。

### P2 本轮定向复验

- YAML/契约20项、锁/Site ref/workflow12项、固定输入原生重建与失败保留2项通过。
- 真实运行现有 `upgrade-check --old 046f251d0092adee8d7d7e091df6bce82dd3ac16`：
  当前 d6a2121 和旧046f251都实际构建同一个临时 YAML Site，exit0；各阶段 Site摘要不变。
  当前输出hash `85bf39dd30a28af476edc3e65d1d34dd4b7a5372d5818e756459237182eaa09c`；
  旧Core输出hash `49af55c9f8e3d26a87960c6d62fbe75b73db38177ac0ca0a1b2b27adb23fc646`。
  输出因渲染变化而不同，**没有宣称两版本逐字节相同**。临时旧Core worktree已移除。
- #53 具体复现：native cache 位于 `apps/web/.shirones/loaded`，图标写入
  `apps/web/src/generated/local-icon-collections.ts`；不在现有 `--clean-cache` 覆盖范围。
  临时假Core树实跑清理 exit0：托管cache被删除，等价native路径仍在。
  这证明清理覆盖不足，不代表已观察到 Site 写回或跨版本数据污染。
- #55：GitHub 可见8个 workflows 中没有 Site CI；对应 runs endpoint404，
  `.github/workflows/site-ci.yml?ref=dev` 也404。需确定有效的当前Core验证入口及获授权
  独立Site/只读权限，不能只说“等一个token”；没有真实Site全链路运行证据。

### 可下载的远端证据（不要只依赖 /tmp）

- [精确d6a2121原生截图、报告、构建日志，约21MB](https://cnb.cool/-/files/qFV4QWmSEWRUfrFEOd8XHA/96f60483-8db2-4ba3-a8a2-5c47d331d6cf/alnilam-native-shirone-d6a2121.zip)：
  下载整个包，打开 `index.html`，保留相对图片/主题/宽度对照链接。
- [会话窗口CLS纠正样本及原始事件](https://cnb.cool/-/files/qFV4QWmSEWRUfrFEOd8XHA/10f62265-e1c4-4b5f-9c86-8c67087e3032/alnilam-native-cls-session-recheck.json)。
- [P2定向测试、真实双Core运行和清理探针](https://cnb.cool/-/files/qFV4QWmSEWRUfrFEOd8XHA/2e0014f2-3092-4363-983c-ca410bb44a65/alnilam-p2-recheck-d6a2121.zip)。
- [P2复核主记录](https://github.com/Skyline-Gazer/ALNILAM/issues/38#issuecomment-6597241050)、
  [完整CLS复验待办与测量更正](https://github.com/Skyline-Gazer/ALNILAM/issues/60#issuecomment-6596886402)。

## What was tried — 已尝试与失败原因

1. 本地重画M3E界面然后通过旧CSS/E2E：方向错误，不能作为实际Shirone迁入。
   相关Done已纠正，旧源码/PR/Owner历史记录保留，不 force-revert整条开发历史。
2. Node-only Site loader进入浏览器config，曾出现 `fileURLToPath is not a function`：
   已用public值模块桥接修复，不要撤销桥接后把Node API打进浏览器。
3. native Stylus消费依赖缺失：app显式声明同锁定版本0.64.0；
   18d4055遗漏根锁文件导致冻结安装ERROR，50f79e2已补交，不要改写旧失败为成功。
4. 仅移除脚本预处理未修复 trusted Vite缺esbuild：45398f0功能CI仍ERROR。
   真正原因是native shared config强制esbuild压缩；d6a2121改用现有Vite8
   Oxc/LightningCSS且保留压缩。禁止Vite→esbuild导入的诊断构建与远端13页构建已通过，
   现在失败是预算，不要继续修过时依赖故障。
5. 上游默认 `/archive/`、`/rss/`、`/atom/`、`/sitemap-index.xml`、disabled About入口
   与现有Core不符：已适配有效地址、移除无实现入口；封面尺寸/h1/canonical/skip-link已补。
6. CodeBuddy“slot不能hydrate”“Tailwind没有注入”“getting-started/Guide不存在”
   “cover双前缀必然ENOENT”等结论有实测反证，勿盲目照改。
   已验证CSS含 `.p-6/.w-24/.line-clamp-4`，只保留一次Tailwind注入。
   真实的native导航active状态映射、首页导出边界一致性仍待修，不声称全部意见归零。
7. #55以前被概括为只缺Site token，证据不足；现已记录GitHub入口404这一实际缺口。
   不为修复它擅改main、mirror或生产策略，不因此暂停其他独立功能。

## Decisions — 已确定，不重新争论的边界

- Shirone是实际前端基座；保留Core/Site、YAML-only schemaVersion2、只读Site和历史Git。
- 复用现有Astro7/Svelte5/Tailwind4及锁定版本。原生代码的TS6 metadata警告与当前TS5.9
  仍记录；app check零诊断不等于整个未启用上游功能都已完整type-check，不为警告自动升级。
- 单一MPA生命周期。当前不另开Swup/ClientRouter或第二主题状态源，不恢复旧hero匹配旧测试。
- gallery/moments/music/CMS等延期/候选范围不当作普通博客开发前置条件或擅自开始整站扩展。
- 显示ALNILAM站名、Site文章和自有cover是正确的内容接入；不复制无授权上游插画/字体来
  假装迁入完成。截图仅为人可复核证据，不等于Owner视觉签收。
- 本地测试成功、advisory退出成功、open PR、merged dev、production分别是不同事实。

## Acceptance criteria — 下一接手者应完成的验收

- [ ] 先回读Project/Issues、CNB dev/PR47最新HEAD与实际CI/Review；不相信本文将来仍是最新。
- [ ] 修复#53：新增native派生状态接入现有Core托管生命周期；验证可清理、版本隔离、
  读写归属、相对/外部媒体、失败保留与Site摘要不变，不另造缓存/同步框架。
- [ ] 在native组件补齐#57–#59原需求，迁移真实行为断言（触屏/键盘/焦点/持久化/阅读边界），
  不只是改选择器或删除坏掉的旧测试。
- [ ] 完成#50/#60原生CLS与导航矩阵；使用共享会话窗口算法/来源和既有Lighthouse工具，
  按Phase/实质前端改动跑必要矩阵，不在每个文档PR运行重型审计。
- [ ] 处理实测预算与当前真实红项，保留Node/图片/a11y/provenance检查；不得掩盖失败。
- [ ] 验证实际CNB浏览器与截图归档采用，不把candidate-only本地测试写成target-owned远端PASS。
- [ ] 有效条件满足后普通Merge Commit合入dev：写操作串行，临合并回读refs，再验source祖先和树；
  按各Issue真实验收闭环更新Project，不能把整个阶段批量标Done。
- [ ] #55仅在真实获授权独立Site+有效入口+精确Core/Site SHA+运行链接齐备时关闭。
  不能拿本次临时fixture替代；无条件时继续无依赖功能。
- [ ] #62分类/多语言内容功能按其P4范围与实际授权推进，不拿预留字段或标签截图冒充分类完成。

## Resume commands — 复用现有工具

工作目录 `/home/aa-runner/workspace/ALNILAM`，Node24 / pnpm10.19.0。
本机代理变量曾不可用；外部网络命令需要时用
`env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY ...`。
普通sandbox限制socket/network/git元数据写入时，按实际授权申请工具级执行；不打印凭据。
不要打印upload token；CNB upload-file的公开 `asset_link` 可用于证据。

```bash
# 先读AGENTS、实时refs、Issue/Project；不要reset掉接手时的其他改动。
git status --short
git fetch origin dev feat/61-visual-baseline

# 仅在依赖需要恢复时安装；保留锁版本，普通文档改动不重建环境。
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
node scripts/compose.mjs --site "$PWD/sites/demo" --out "$PWD/dist/site"
ALNILAM_SITE_URL=https://example.com/ALNILAM/ node scripts/compose.mjs --site "$PWD/sites/demo" --out "$PWD/dist/nested-base"

# 现有本机浏览器位置；新环境先检查是否存在，不将/tmp当永久依赖。
PLAYWRIGHT_BROWSERS_PATH=/tmp/alnilam-playwright-browsers pnpm exec playwright test tests/browser/native-shirone-base.spec.ts tests/browser/visual-baseline.spec.ts
node scripts/artifact-check.mjs dist/site

# 与P2相关时使用现有测试；实际双Core工具会创建/清理临时worktree和Site。
node --test --test-isolation=none --test-reporter=spec scripts/tests/rebuild.test.mjs
node scripts/upgrade-check.mjs --old 046f251d0092adee8d7d7e091df6bce82dd3ac16

# 本次文档交接只需这类适度检查，不手动重跑不相关历史pipeline。
python3 -m unittest scripts.tests.docs_test
```

上述功能命令为接手参考，不表示当前全部会绿；artifact-check当前预期会暴露已记录失败。
本机 `.tmp/` 的两个probe和 `/tmp/alnilam-*` 日志可辅助调试，但接手不应只依赖临时文件。
下载前述CNB归档可恢复测试/原始事件，新的验证须标明确切源码与环境。

## Constraints — 授权、风险与停止条件

- Owner已授权既有规划中的普通产品开发、提交推送、CNB PR/缺陷修复、满足有效要求后
  自主普通合并dev，以及基于证据的Issue/Project更新；无需再逐项申请“继续”。
- 不修改/发布main，不做tag/release/生产部署，不改GitHub mirror或保护策略，不操作ADS上游。
  保留有效pin，PR43维持独立维护提案，不能混入本轮交付。
- Site是不可变输入。不开第二套Site配置格式，不支持TOML回退/自动迁移，不把源码sync回Site。
- 当前项目Owner开发覆盖决定优先于pin内较旧严格措辞。不要要求额外审核人员、强制每项平台
  approve、Docker/SCA/SBOM等来阻断普通功能；但实际配置的必需功能检查仍有效，不能绕过真红。
- 不force push/force merge，不启用Auto Merge规避限制。CNB merge API没有expected-head参数，
  临合并回读仍有残余race；合并后必须确认实际source祖先和结果树。
- 只关闭确实完成的任务；Phase历史签收保留，当前重验不等于自动生产批准。
- 不承诺后台自动继续。Goals usageLimited不代表整个API账户/CNB额度耗尽，更不表示ADS在执行。
- 除已授权可执行任务全部完成、无独立任务可做的真实外部阻塞、下一步越权，或执行环境无法
  继续并已保存交接外，不把中间报告当停止指令。始终如实使用TRUE_RUN_PASS、
  TRUE_RUN_INCOMPLETE或BLOCKED_WITH_EVIDENCE；当前产品仍是TRUE_RUN_INCOMPLETE。

完整历史材料可用 `git show d6a21217c4c260f9afe77f754042a162a0aa77d2:docs/HANDOFF.md` 查阅。
旧bootstrap/P1“下一任务”清单、旧GitHub Primary/旧ADS pin、旧Done状态不能覆盖本交接与实时Owner决定。
## 2026-11-05 · P4/T03 #64 — SEO / Canonical / OG / RSS / Sitemap / BasePath

- 基线：CNB `dev` @ `b5cb4339d614e3c48b973a0d55c23563f7ef1e72`（GitHub `dev` 仍落后，不作基线）。
- 分支/PR：`feat/64-seo-base` → CNB PR #64（target `dev`），GitHub Issue #64（Parent #40，Project #17）。
- 实现：`apps/web/src/lib/i18n.mjs`（base 单次前缀、canonical 去 query、hreflang 组）、
  `apps/web/src/lib/seo.mjs`（WebSite/BlogPosting/Breadcrumb/CollectionPage）、
  `apps/web/src/lib/feed.mjs` + `/rss.xml` + `/[lang]/rss.xml`（官方 `@astrojs/rss`，按语言）、
  `apps/web/seo-inventory.mjs` + `@astrojs/sitemap`（按真实产物收集；排除 alias/404/feed；
  lastmod 仅真实更新；alternate 双向）、`apps/web/sitemap-compat.mjs`（`/sitemap.xml` 兼容镜像，
  robots 仍指向官方 index）、`robots.txt`（声明 Pages 子路径不控制 origin）、`404.astro`（noindex）。
- 标签大小写/本地化别名路由保留可达但 `noindex`，catalog slug 页为唯一索引与 sitemap 条目；
  静态输出不能 301，故不声称重定向。旧 `/posts/en/<slug>/` 路由保持 canonical。
- 验证（真实产物，非 helper 快照）：`pnpm test` 151 pass；`pnpm check` 0/0/0；
  `pnpm browser:local` 83 pass / 1 skipped（root + `/ALNILAM/`，1440/390）；
  GitHub Pages 子路径与自定义根域两套 compose 均 `artifact-check` BUDGETS OK、
  `scripts/seo-check.mjs` SEO CONTRACT OK（39 pages、2114 内部引用、34 sitemap URL、3 feeds）。
- 远端 CI：CNB PR #64（https://cnb.cool/KoolingMachine/ALNILAM/-/pulls/64）的
  `pull_request.target` trusted-consumer 与 ai-review-advisory 均为 success；
  被测代码 head `1d05c2271d0201446fb4bc65bcbd560779a81e8f`，merge `4e842ef4`（26m01s）。
  该 PASS 绑定上述代码 head；本地 PASS 不替代远端结果。
- 未完成/边界：locale 前缀路由（`/en/posts/…`）与 locale taxonomy 分页属 #65；无 HTTP 301；
  `/ALNILAM/robots.txt` 不是 origin 级 robots；未改 `main`、tag、生产配置、ADS pin。
