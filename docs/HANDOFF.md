# ALNILAM — AI Agent Handoff

## Current P1 integration checkpoint — 2026-10-28

P1 implementation is integrated on GitHub `dev` and is **`P1_ACCEPTANCE_READY / OWNER_PHASE_SIGNOFF_PENDING`**. The P1 implementation/evidence baseline is `3f354ecb66a50e693b8c5ef7db4dd2518e3992cb`; `main` remains `07fac43cba0c3d303c930c098b6e2124b2c79e4a` at the latest readback. PRs #95/#97/#98/#99/#101/#102/#103 are merged. Same-SHA verify [40643212450](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212450) and ADS latest-release check [40643212443](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212443) passed on that baseline. Documentation-only status refresh PR #105 later merged at `b0fff8a7af4e8925ecf716b7f1adfe254223be90`; its same-SHA verify [40645005976](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005976) and ADS latest-release check [40645005970](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40645005970) also passed. The PR #103 P1/Lighthouse baseline [40641080507](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40641080507) passed on its tested head; its evidence is not mislabeled as a run on a merged SHA.

P1 browser/Lighthouse evidence: the PR #103 baseline run [40641080507](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40641080507) passed and uploaded [artifact 12796147801](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40641080507/artifacts/12796147801). Its representative root/nested desktop light/dark and mobile screenshots were visually inspected. The post-merge browser artifact [12795883670](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40643212450/artifacts/12795883670) records 3/3 Playwright tests on the merged CI run; the mobile light capture is stable after screenshot animations were disabled. Lighthouse remains lab-only. Field p75 is **DEFERRED** under #74; physical touch hardware, formal contrast measurement and late-font behavior remain **NOT VERIFIED**.

Developer-tool preflight used the primary checkout. Explicit official full RTK `1.1.0` passed 151/151 `verify` checks, but reported **SKIP — host hook not installed**; default PATH still resolves RTK `1.0.1`. An explicit `rtk run` operation preserved stderr and exit code `7`, which verifies the CLI wrapper, not host-hook integration. CodeGraph uses the authorized immutable MIT source fallback `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata 1.1.1; not a published stable release); its existing index is current and a host MCP query succeeded under already-installed Node `22.23.4`. The default Node `26.12.0` is incompatible with that CLI, and the managed task worktree has no CodeGraph index. No tool, PATH, hook or global host setting was changed; RTK host integration is **NOT VERIFIED**.

Project #17 readback: #37 is `In Progress`; #47/#48/#49/#50/#79 are `Done`; #100 is `In Progress`; #38/#51 are `Todo`. Native relationships are #37 → #47/#48/#49/#50/#79/#100 and #38 → #51. No repository milestones exist. Keep #37 open until the Owner's final phase confirmation; #51 is planning-ready but P2 code has not started. Its refreshed baseline and next-PR handoff are recorded in [Issue #51 comment 6462317108](https://github.com/Skyline-Gazer/ALNILAM/issues/51#issuecomment-6462317108).

CNB consumer acceptance and cutover remain **NOT READY**: the connected CNB account could not verify `https://cnb.cool/KoolingMachine/ALNILAM` (the page reported nonexistent or no access; this does not prove absence), and current-head native CI/Review/SCA, credentials, quota and history parity remain unverified. GitHub `main` still has the Pages `push: main` trigger; active Ruleset #25809753 has no bypass and requires PR + strict `verify`. Guard proposal PR [#104](https://github.com/Skyline-Gazer/ALNILAM/pull/104) is open with both CI checks green; it has not changed `main`. Do not merge to production `main`, create a tag/release, dispatch Pages, flip provider or write mirror refs without separate Owner authorization. See [Issue #100](https://github.com/Skyline-Gazer/ALNILAM/issues/100) and [the current cutover preflight](cnb/CUTOVER-READINESS.md). GitHub Issues and Project #17 remain the permanent planning truth. Existing Core/Site v1, compose/provenance, search, optional module boundaries, and Editorial rollback remain intact. The older P0 notes below are historical and may reference pre-P1 branches and v0.4.1; do not treat them as current state.

## Current P0 evidence checkpoint — 2026-10-26

See [P0 Acceptance & Decision Report](p0/P0-ACCEPTANCE.md), merged [PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85) (`b36b61fff8377694f209fcc7488f7457251a2ce9`) and merged ADS v0.4.1 adoption [PR #84](https://github.com/Skyline-Gazer/ALNILAM/pull/84) (`2555c4658599598bfed604fbf0d9b525d24c3ded`; post-merge dev CI [40321449502](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40321449502) PASS). The report supersedes historical status claims below; all earlier entries remain traceability records. Existing platform source is preserved. Draft #77 remains unmerged. Stop at Owner P0 acceptance, G0-F freeze and explicit P1 scope authorization.

### ADS v0.4.1 consumer adoption — 2026-10-26

- `.ads` is pinned to release commit `3abf6025657a5d716476029cc8cbf5239543210b` (v0.4.1); annotated tag object is `e38d01ff176448a13180afe2419c1c9c94a6ab43` and must not be used as the gitlink. The submodule remains private; public CI checks only the gitlink.
- CodeGraph uses the owner-approved official source fallback `bb11bc1226db30233ac9e66a2670c4b16dfa85fa` (metadata 1.1.1, MIT) because official npm `latest` returns 404 and GitHub Releases is empty. It is **not** a published stable release. The previous unrelated `@colbymchenry/codegraph` installation is not accepted as official provenance.
- Full RTK is official v1.1.0, with Apache-2.0 CLI and BUSL-1.1 engine licenses. The previous v1.0.1 remains recoverable outside the repository. Native Codex hook interception, output compression, failure exit code and diagnostic preservation were exercised.
- Development-only integration consists of `.ads-devtools.json`, `.codex/hooks.json`, `RTK.md`, the ADS devtool policy helpers, the latest-release workflow and an optional project-local CodeGraph index. Generated indexes/caches stay untracked; `.git/info/exclude` supplies local exclusions rather than tracked production ignore rules.
- The generic production-boundary guard may remain on production branches. It rejects the manifest, host integration, generated SQLite sidecars, `.codegraph-*` directories, tool-specific workflows/helpers, escaping symlinks and contaminated build outputs.
- Local preflight is `CLI_PASS_HOST_UNVERIFIED` (exit 3); native Host MCP query and RTK interception were verified separately. See [P0 report section E](p0/P0-ACCEPTANCE.md#e-ads-governance) for evidence boundaries and unresolved product risks.

## Identity and baseline
- Core repository: https://github.com/Skyline-Gazer/ALNILAM (Apache-2.0).
- Project tracker: https://github.com/orgs/Skyline-Gazer/projects/17/
- Initial `main` SHA (before bootstrap): `282459adb69f903a0eea4ded35ebf619c7387a31`.
- Development baseline: `dev` created from initial `main`.
- Bootstrap branch: `chore/initial-platform-bootstrap` (PR into `dev`, pending review).
- ADS is a **private repository**; the public CI checkout intentionally omits recursive submodule cloning (no cross-repo credentials). Maintainers with ADS access can materialize it and verify the full rule set.
- Current ADS release `v0.4.1` gitlink: `3abf6025657a5d716476029cc8cbf5239543210b`, located at `.ads`. Historical `v0.3` gitlink was `1e07d6c4bbd296b7d37dcd31934cfc70426f73ac`.
- Do **not** infer latest bootstrap branch HEAD, CI result or Project item status from this document. Query GitHub at start of task.

## Continuation 7: deployment live + P3 modules shipped (2026-10-25) — Issues #6 closed
- **Owner-approved scope**: production deployment + P3 comments & Bangumi only (gallery/moments/music declined, recorded in ROADMAP).
- **PR #24/#27** (comments + Bangumi + deploy enablement, merged): `[comments]` giscus module (fail-closed validation, client:visible island — iframe mounts, verified in Chromium) and `[bangumi]` module (build-time api.bgm.tv fetch → static output; covers hotlinked no-referrer). **Module route gating**: opt pages live in `src/pages/opt/`, injected via Astro integration only when enabled — disabled modules ship no page/stub/JS (verified: demo output has zero giscus/bgm.tv references). Base-path aware builds: `ALNILAM_SITE_URL` override → Astro `base`; `withBase` helper prefixes internal links/assets/pagefind/covers (external URLs untouched; root-hosted regression-verified). 13 contract tests.
- **Deployment**: GitHub Pages `build_type=workflow`; `deploy.yml` runs contract tests → compose → deploy-pages. **Live: https://skyline-gazer.github.io/ALNILAM/** (home/posts/assets 200). Deploy trigger = push to `main` (tag refs rejected by the Pages environment policy at job startup even with matching policy entry — PR #30); manual dispatch retained.
- **Release chain**: PR #25/#28/#31 changelog prep; release PRs #26 (v0.1.1, tag `0591e4b`), #29 (v0.1.2, tag `b6fac6a`), #32 (v0.1.3, tag `07fac43`). `ALNILAM_OLD_CORE_SHA` tracks the latest release tag each time. GitHub Releases published for all three.
- **Issue #6 closed** (delivered scope + documented declines). Board: **17 items, 17 Done**. Zero open issues/PRs.
- Repo state: `main` = `07fac43` (v0.1.3, deployed), `dev` = merge of #32. Workflow runs: CI on dev/main + Deploy on main.
- Ops notes: the github-pages environment policy now includes `gh-pages`, `main`, `v*`; tag-ref deploys remain unreliable (main-push is the supported path).

## Continuation 6: v0.1.0 released (2026-10-25) — Issues #7, #8 closed
- **PR #19** (merged to `dev`, head `2fccecb`, CI 40181608439/40181511458 success): secret-pattern sweep clean; `pnpm audit` clean; unused `@pagefind/default-ui` removed; npm dependency license table in THIRD_PARTY_NOTICES; legacy-Site fixture `sites/legacy-demo` (no schemaVersion/no i18n) verified building against current + P0 (7cbcef0) + P1 (cbf16ab) cores with Site digest preserved; a11y floor + 64KiB page-weight budgets added to artifact-check (negative-tested); README quickstart rewrite; `docs/MAINTAINERS.md` (release procedure, tagging rules, CI inventory); `CHANGELOG.md`.
- **Release PR #20** (`dev` → `main`, owner-authorized): merged `52a5d13`. Ruleset `alnilam-main` enforced (PR-only + `verify` strict — PR checks SUCCESS). Dispatch-run CI on main: run 40182055037 **success**.
- **Tag `v0.1.0`** annotated on the main merge commit; GitHub Release published; `ALNILAM_OLD_CORE_SHA` repo variable set to `52a5d13f…` per docs/MAINTAINERS.md — CI upgrade/rollback now targets the real previous release going forward.
- **Issues #7 and #8 closed** (with evidence comments). Board read-back: all items **Done** except #6 (P3 optional modules, Todo).
- **CI hardening follow-up (PR #22, merged `73e88ef`, head `ef91aba`)**: `ALNILAM_OLD_CORE_SHA` may point at a main-only commit that upload-pack rejects from PR checkouts ("not our ref"); fetch chain now variable SHA → `v0.1.0` tag → last buildable bootstrap state.
- No production deployment was performed (static hosting cutover remains owner-run). No new recurring infrastructure.
- Repo state: `main` = `52a5d13` (v0.1.0), `dev` ≥ `73e88ef`; both protected.

## Continuation 5: Issue #5 closed — search, i18n, pagination, image policy (2026-10-25)
- **PR #17** (merged `b5e5a2c`, head `0b605b2`, CI runs 40179002245/40178997441 + dev run 40179126452 success). Owner approved all four items.
- **Pagefind local search** (npm dep 1.5.2, no global install): compose indexes the staged output; index failure fails the build. `pagefind-entry.json` language keys sorted post-index — found via repeat-build digest diff (nondeterministic worker completion order). Search island uses the vanilla `search()` API + ~40-line custom UI; `@pagefind/default-ui` was replaced (webpack-era bundle breaks under rolldown). Index loads lazily from `/pagefind/` only on interaction — no posts content in page bundles.
- **Browser-verified bug chain** (each caught by real-browser evidence, not tests): ① event handler case mismatch `{oninput}` vs `function onInput` compiles to an undefined identifier (silent no-op); ② Pagefind `r.data()` is a method — awaiting it as a property yields functions; ③ `each_key_duplicate` crash when sub-results share URLs; ④ Pagefind module namespace must never be wrapped in a Svelte `$state` proxy (breaks internals — kept as plain ref, documented); ⑤ a stale `.astro`/vite cache silently served an old broken island compile across multiple "successful" rebuilds — `rm -rf apps/web/.astro` cleared it. **Lesson: when a fix doesn't change behavior, clear build caches before re-theorizing.**
- **i18n**: frontmatter `lang` (BCP-47) + `translationKey`; default locale keeps `/posts/<slug>/`, translations live at `/posts/<lang>/<slug>/` via the `content/posts/<lang>/` directory convention (glob-loader ids slugify dots — filename-suffix encoding like `post.en.md` does NOT survive; directory encoding does, verified via a debug route). hreflang + x-default on pages, `xhtml:link` in sitemap, per-post `<html lang>`, RSS per-item `<language>`. Standard fixtures: zh-CN + en + ja translations of two articles.
- **Pagination**: `/posts/[...page]`, pageSize 5, prev/next, per-page canonicals; fixture-tested with 7 posts → `/posts/2/`.
- **Image pipeline**: decision = none. Site-owned images served as-is (deterministic offline builds, no sharp); CLS-safe dimensions enforced by artifact-check. Documented in SITE_ONBOARDING.md.
- Determinism re-proven after Pagefind: repeat builds byte-identical with pinned epoch; same-revision upgrade-check byte-identical.
- Board read-back: #5 **Done** (all acceptance items shipped). Remaining open: #6 (P3 optional), #7 (P4 release), #8 (In Progress).
- `dev` HEAD: merge of PR #17. `main` still `282459a` — release PR requires owner authorization.

## Continuation 4: P2 slice 1 — feeds, SEO, archives, tags (2026-10-25)
- **PR #15** (merged as `defad23`, head `6f9da26`, CI runs 40174387510/40174190477 + dev run 40174473626 success): zero new dependencies.
  - Routes: `/rss.xml` (RSS 2.0, escaping, atom:self), `/sitemap.xml` (static routes + posts with lastmod), `/robots.txt`, `/archives/` (year-grouped), `/tags/` + `/tags/[tag]/` (PostCard one-per-row).
  - SEO in BaseLayout: OpenGraph (+ article:published_time/article:tag on posts), Twitter card, RSS/sitemap discovery links, JSON-LD WebSite/BlogPosting — validated parseable from real output.
  - Learnings recorded: Astro `.xml.js` routes are plain JS (frontmatter fence breaks astro check); dynamic segment values come from `Astro.params` not props (caught via browser evidence: `#undefined` tag title).
- Verification: 7 pages built, artifact budgets OK, real-Chromium screenshots (archives/tags index/tag detail), `pnpm test` 10/10, `astro check` clean, same-revision upgrade-check byte-identical.
- Board read-back: #1/#2/#3/#4/#9/#10/#12/#13/#15 Done; #5 **In Progress** (feeds/SEO/archives/tags shipped); #8 In Progress; #6/#7 Todo.
- **Issue #5 remaining** (owner decisions needed): Pagefind local search (runtime binary dependency — needs approval per "no unapproved installs"); pagination on `/posts/` (deferred until post count warrants); i18n/hreflang (requires content schema decision); image pipeline.
- `dev` HEAD: merge of PR #15. `main` still `282459a`; release PR requires separate authorization.

## Continuation 3: Issue #3 closed + artifact budgets (2026-10-25)
- **PR #12** (merged `564d3f1`, head `5c6587b`, CI runs 40172044941/40171978532 success): Site **schema v1 frozen** — `schemaVersion` validated against `[1]`, absent = 1, `null`/`2`/`"1"` fail closed (10 contract tests incl. version matrix); **deterministic provenance** — output gains `alnilam-provenance.json` binding Core revision + Site SHA-256 digest, `SOURCE_DATE_EPOCH`-pinnable, digest mismatch refuses to publish; `docs/SITE_ONBOARDING.md` (schema contract, slug-as-path stability, private-Site two-checkout CI strategy with provenance gating). Reproducibility proven: repo-vs-worktree same-revision builds byte-identical (caught & removed an absolute-path leak from provenance).
- **PR #13** (merged `5b75aea`, head `a6387eb`, CI runs 40172457608/40172439110 + dev run 40172587261 success): `scripts/artifact-check.mjs` wired into `pnpm build` — posts pages zero runtime scripts, ≤1 island/page, all `<img>` with explicit dimensions (CLS), provenance integrity. **Immediately caught two regressions**: P1 rewrite had silently dropped the Status island (restored, PRODUCT.md v0.1 requires the hydration demo) and the article cover `<img>` lacked dimensions (fixed). Negative-tested (injected script → build fails).
- Issue #3: **all acceptance items now evidenced** (schema freeze + provenance this PR; git-Site immutability, symlink/path rejection, no-mutation across upgrade/rollback from PR #9 chain). Board: #1/#2/#3/#4/#9/#10/#12/#13 Done, #8 In Progress, #5/#6/#7 Todo.
- `dev` HEAD `5b75aea`; `main` still `282459a` (release PR needs owner authorization; first tag then enables real `ALNILAM_OLD_CORE_SHA`).
- Remaining: automated visual regression baselines (manual screenshots currently), #5/#6/#7 features, #8 closure.

## Owner authorization executed: PR merge chain (2026-10-25)
- Owner approved the review findings; merge chain executed in dependency order: PR #2 (`7cbcef0`) → `dev` as `d2f973c`; PR #9 (`7174eaa`) → `dev` as `4fd99ec`; PR #10 (`6611cb4`) → `dev` as `9a31573`. All GitHub-verified MERGED.
- `dev` HEAD `9a31573` push CI: runs 40170907120 + 40170864650 — **success**, all 11 steps including two-version upgrade/rollback. Rulesets enforced throughout (PR-only merges, required `verify`).
- Project #17 read back: #1/#2/#4/#9/#10 = **Done**, #8 In Progress (branch governance: rulesets verified active, closure deferred), #3/#5/#6/#7 Todo. 0 open PRs, 5 open issues.
- `dev` now contains the full platform baseline + upgrade/rollback acceptance + P1 Editorial UI. `main` remains `282459a`; a release PR `dev` → `main` requires separate owner authorization.

## Continuation 2: P0 hardening + P1 Editorial UI (2026-10-25)
- State verified at session start: `dev`/`main` still `282459a`; PR #2 (`7cbcef0`) and PR #9 (`ffed1ae`→`7174eaa`) open with green CI; Rulesets `alnilam-dev` (25809723) and `alnilam-main` (25809753) **active**: deletion + non_fast_forward + pull_request + required `verify` check (strict) on both branches.
- **PR review (Phase 1A)**: PR #9's merge-base with `dev` is `282459a`, so GitHub shows 43 files, but the actual delta **over PR #2 is 4 files / +167 lines**. Merging #2 then #9 yields exactly the intended change; no double-merge risk. Order #2 → #9 confirmed.
- **Upgrade-check hardening (commit `7174eaa`, on PR #9 branch)**: `resolveRevision()` verifies the old SHA locally, falls back to one shallow fetch, and only then creates a worktree; exit/SIGINT/SIGTERM handlers guarantee temp-worktree cleanup (verified zero residue on success, unresolvable-SHA and unbuildable-SHA paths); `resolveRevision` unit test (8 tests total). Rendering-change scenario proven end-to-end locally: theme CSS change in an old-Core worktree → outputs differ, external Site byte-identical across all builds.
- **P1 Editorial UI (commit `cbf16ab`, branch `feat/editorial-ui-v1`, PR #10 → `dev`)**: token-based theme with real dark+light palettes; Fuwari one-post-per-row card (text left / cover right 28%, cover-top on mobile); cinematic hero with original inline-SVG constellation; semantic prose styles; a11y (skip link, focus-visible, reduced-motion, tabindex discipline, img dimensions for CLS); zero new client JS.
- **Bug found & fixed during browser verification**: theme `.astro` files were outside Tailwind v4's scan — the `@source` directives covered only `apps/web/src` and `packages/ui/src`, so sticky/header/card utilities were silently missing from the CSS bundle (pages rendered unstyled in a real browser while `pnpm check`/`pnpm build` passed). Fixed with `@source "../src"`. **Lesson: `astro check`/static builds do not prove CSS correctness; a real browser pass is required.**
- CI on PR #10 HEAD `cbf16ab`: runs 40166025295 (pull_request) + 40166014173 (push) — **success**, all 11 steps including two-version upgrade/rollback.
- Project #17 read back after edits: #1 In Progress, #4 In Progress, #8 In Progress, #9 In Progress, #10 In Progress, #2/#3/#5/#6/#7 Todo (10 items). Issue #8 commented with full ruleset verification evidence.
- Browser evidence: dark/light × desktop/mobile screenshots from real Chromium (task space `alnilam-p1-visual`); keyboard Tab order verified: skip-link → brand → 首页 → 文章.
- Still unverified: visual regression baselines are manual (no automated pixel-diff yet), PR #2/#9/#10 review+merge decisions (maintainer authority), ADS behavioral compliance, branch-protection bypass settings.

## Continuation: P0 two-version upgrade/rollback (2026-10-25)
- Verified remote state at session start: `dev` = `282459adb69f903a0eea4ded35ebf619c7387a31` (still bare "Initial commit"); all platform content on bootstrap branch `chore/initial-platform-bootstrap` @ `7cbcef0ae2b3a669fab987dd0f7cd57b7040c8bc`, PR #2 OPEN → `dev`, both checks SUCCESS (runs 40159993704, 40159989762).
- Task branch `feat/two-version-upgrade-rollback` created from bootstrap HEAD (NOT from bare `dev`; merging PR #2 first remains a maintainer review decision).
- Commit: `66019c9` — `scripts/upgrade-check.mjs` (two Core revisions vs one unchanged external Site: Site digest identical before/upgrade/rollback; output digests reported; old Core via `git worktree` only, never fetch/reset/checkout inside Site), CI step "Two-version Core upgrade / rollback against unchanged Site", 2 new contract tests (7 total).
- Local verification (macOS arm64, Node 22.23.4, pnpm 10.19.0): `pnpm install --frozen-lockfile` ✓, `pnpm test` 7/7 ✓, `pnpm check` 0 errors ✓, `pnpm build` ✓, `node scripts/upgrade-check.mjs --old ee97d1f175ac905dd3a7e2f79762415888b99b76` → `UPGRADE/ROLLBACK OK: Site unchanged, outputs byte-identical.` ✓; `--old 282459a...` → clean exit 1 (pre-platform `main` has no manifest; Site untouched, temp cleaned).
- Remote CI on PR #9: runs 40160914956 (pull_request) and 40160849539 (push) — **success**, including the new upgrade/rollback step.
- Old-Core default in CI is `ee97d1f1...` (last buildable bootstrap state), overridable via `ALNILAM_OLD_CORE_SHA` repository variable. `main` (282459a) cannot serve as "old Core" until it receives a buildable platform revision via an authorized release merge.
- Project #17 synchronized with authenticated Projects v2 (token scopes include `project`): 9 items added and read back — Issues #1 (In Progress), #3–#8 (Todo), PR #2 (Todo), PR #9 (In Progress). Board read-back confirmed 2026-10-25.
- RTK 1.0.1 and CodeGraph 1.0.1 available locally; CodeGraph index initialized task-scoped (`.codegraph/` gitignored). No indexes committed.
- Tooling note: Astro 7 requires Node ≥22.23.4; local default 22.23.2 fails `astro check` — use fnm/CI Node 24.
- Still unverified: browser E2E/visual fidelity, branch protection rulesets, ADS behavioral compliance (private repo not materialized locally), and PR #2/#9 review+merge decisions (maintainer authority).

## First remote CI acceptance (2026-10-25)
- Verified source SHA: `ee97d1f175ac905dd3a7e2f79762415888b99b76`.
- PR workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159850665 — **success**.
- Push workflow: https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40159847633 — **success**.
- Actual checks: pnpm frozen dependency install, Node contract tests, Astro type/content check, demo static build, output assertions, independent external Site build, immutable source check, ADS gitlink pin.
- CI deliberately does not clone the private ADS repository. ADS behavioral compliance beyond root AGENTS.md is not evidenced by this build.
- This entry records a tested revision; review the current PR HEAD and fresh CI on every continuation.

## First task for next agent
1. Read `AGENTS.md`, the pinned `.ads` policies when available, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, the #49–#50/#79 records and the exact PR heads.
2. Verify PR #97's current head and `verify` result; preserve its branch history and do not treat it as merged.
3. Continue #50 from its own branch/worktree and record root/nested, 1440/390, light/dark, external-Site, optional-module, motion, navigation and performance evidence.
4. Continue #79 in a separate worktree, comparing pinned Shirone Astro 7.3.8 with the actual ALNILAM 7.4.2 lock resolution; do not change product versions incidentally.
5. Run frozen install, Node/Python tests, Astro check, builds, artifact and production-boundary checks sequentially; retain exact CI/artifact links.
6. Verify Project #17 through native API readback if available; otherwise keep `PROJECT_UNVERIFIED` and make no status claims.
7. Keep PRs reviewable and issue-linked. Do not merge, tag, deploy, change ADS or start P2 without separate authorization.

## Project constraints
- Only `dev` merges by reviewed PR (except separate authorized release PR to `main`). No direct write to `main`.
- Site is independently owned and read-only during build; `sites/demo` is a test fixture.
- Platform: Astro 7, Svelte 5, Tailwind CSS 4, Editorial theme, one Post per row (Fuwari).
- Avoid extracting separate npm-package release processes or implementing a custom deployment controller.
- ADS submodule never floats to latest without explicit review.
- CodeGraph and RTK latest tool availability should be checked, but their local indexes/configs must not be committed to production branch; no unapproved global installs.
- Default to GitHub Actions validation; don't request unneeded local system provisioning.
- All borrowed code, images, fonts or assets require license audit and THIRD_PARTY_NOTICES update.

## Validation commands
```bash
git submodule update --init --recursive  # authorized ADS access required
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out dist/external-site
```

## Expected CI output
`dist/site/index.html`, `dist/site/posts/hello-alnilam/index.html`, `dist/site/site-assets/orion.svg`.

## Explicit unverified matters
- Clean Astro check and static build passed on remote CI; interactive browser E2E, visual fidelity and performance have **not** been verified.
- Frozen dependency installation **passed** for tested SHA `ee97d1f`. Re-check current HEAD before release.
- Branch protection/ruleset enforcement is not enabled unless verifiably applied.
- Project #17 membership/status changes are not verified unless an authenticated Projects v2 read/write occurs.
- No preview or production deployment was performed during bootstrap.
- Full content migration compatibility across Core versions has not yet been exercised.
- Initialization PR must be reviewed, not auto-merged.

## Next implementation prompt
"Continue ALNILAM at the actual bootstrap PR HEAD, under the pinned ADS v0.3 rules and Project #17. First close P0 bootstrap verification gaps: immutable pnpm lock, reproducible CI, Astro/Svelte/Tailwind build, external Core/Site compose, Site non-mutation, safe path handling and two-version Core upgrade. Use an Issue-linked PR targeting dev. Do not touch main or production. Report actual SHA, CI links, verified vs unverified acceptance, and keep docs/HANDOFF.md updated."

