# Issue #79 — Astro compatibility pilot

Status: **PR #99 open** from `chore/79-astro-compatibility-pilot`, based on `dev` `1f382aa72052eedbe8a2809011e5a36a82f697d0`. No framework version or Site contract is changed. Product implementation/tested commit: `985664d76ebf4a55f7f1e65e45ebde66f5f5bfba`; subsequent PR updates are documentation-only.

## Corrected version baseline

| Component | ALNILAM lockfile | Pinned Shirone reference |
| --- | --- | --- |
| Source | `LyraVoid/Shirone` `55a84b2322bdfb634a59ca6383bb242e5ce646bf` | Same immutable commit |
| Astro | `7.4.2` (manifest range `^7.3.5`) | `7.3.8` |
| `@astrojs/mdx` | `8.1.1` | `8.0.3` |
| `@astrojs/svelte` | `9.1.1` | `9.0.1` |
| Svelte | `5.57.2` | `5.57.2` |
| Tailwind | `4.3.3` | `4.3.3` |
| Node / package manager | Project requires Node `>=22.23.4`; CI uses Node `24`, pnpm `10.19.0` | Upstream version matrix used its pinned lockfile |

The `dev` lock resolves Astro `7.4.2`; this was a compatible-range resolution, not a recorded owner decision to adopt 7.4.2. Lock history places that resolution in `ee97d1f` on 2026-10-25. PR #49 briefly pinned `7.3.8` in an intermediate commit, then its final branch restored `^7.3.5` and the existing `7.4.2` lock. PR #97 leaves the resolved version unchanged.

Astro 7.4 introduced the stable `astro build --timings` command and raised its Node minimum to 22.22.0. ALNILAM's engine floor is higher, and required CI uses Node 24. The two experimental build features described in the release notes remain disabled. [Astro 7.4 release notes](https://astro.build/blog/astro-740/)

## Prior version comparison

Issue #47's pinned-source run used harness `bf6a5871aed39d87f0232e8e360c343ff3362566` and compared the unmodified Shirone source under Astro `7.3.8` and `7.4.2`: [Actions run 40284029959](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40284029959). Both versions passed 681 Node tests, type/check/build, and desktop/mobile light/dark, Pagefind, navigation, and Back smoke checks.

The full upstream E2E suite was **partial on both versions**: 415 passed, 17 failed, and 48 upstream skips out of 480. The same 17 failures appeared on both versions (motion/sidebar and taxonomy icons plus visual snapshots); upstream lint also retained 5 errors. These results indicate no observed version-specific regression in that run, but they do not establish a clean full upstream E2E or lint pass. The reports are retained in the [P0 report](../p0/P0-ACCEPTANCE.md), [`upstream-e2e.json`](../p0/evidence/upstream-e2e.json), and [`shirone-browser.json`](../p0/evidence/shirone-browser.json).

## Compatibility results

| Area | Result | Evidence / boundary |
| --- | --- | --- |
| Astro check, Svelte 5, Tailwind 4 | **PASS** | The required PR `verify` workflow [40522572426](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572426) passed, alongside the focused root/nested Astro build workflow. The version comparison also passed its type/check/build phase on both reference versions. |
| External content and MDX | **PASS in focused CI** | A disposable Site copy with one `.mdx` post was composed at root and `/ALNILAM/`; the generated article contained the MDX marker. The Site digest remained `06acb0514cd3f56d8363ded3981d227b2e1efc4c5f140f13308a4f575c5702dd`. See [focused push run 40522444780](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522444780) and its `astro-compatibility-evidence` artifact. |
| Content Layer | **PASS** | ALNILAM already uses `glob({ pattern: "**/*.{md,mdx}", base: externalPostsPath })`. `file()` is unnecessary for this directory-backed post collection. Astro documents `glob()` for files anywhere on disk and MD/MDX inputs. [Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/) |
| Static routes and native pagination | **PASS** | File routes, `getStaticPaths()`, and Astro `paginate()` generate the current static route set. Root/nested composition and the existing browser smoke pass. The separate #50 candidate fixes a trailing-slash edge in generated next-page links; it is not part of this branch or current `dev`. [Routing reference](https://docs.astro.build/en/reference/routing-reference/) |
| Svelte hydration, Pagefind, browser navigation | **PASS for the current smoke scope** | The external-Site root/nested browser suite passes 2/2 in [focused push run 40522444780](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522444780); it covers theme/search interaction, navigation, and browser history. The app uses native MPA links and no Swup or `ClientRouter`. |
| RSS and sitemap | **PASS; keep current endpoints** | Existing custom static endpoints build from the external Site and preserve ALNILAM's URL and partial-translation behavior. No parity gap has justified an extra integration dependency. Astro's official RSS helper and sitemap integration remain options for a later isolated output comparison. [RSS recipe](https://docs.astro.build/en/recipes/rss/) · [sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/) |
| Images | **PASS for current pass-through policy; API migration deferred** | Site assets are copied after rendering and existing `<img>` output carries explicit dimensions. No image transform requirement was tested or requested. `astro:assets` would need a separate external-Site path and output-equivalence evaluation. [Image service API](https://docs.astro.build/en/reference/image-service-reference/) |
| Optional modules | **PARTIAL in this issue branch** | The P1 browser candidate separately verifies disabled, enabled, error, and timeout Bangumi behavior. Bangumi is build-time/static, so delayed runtime optional content is not applicable to its present implementation. |
| Build time and memory | **PASS as a diagnostic; not a comparative benchmark** | On GitHub Actions Node 24.21.0 / pnpm 10.19.0 at tested head `985664d`, the PR run built 16 pages in 1.74 s with 734660 KiB peak RSS at root, and 16 pages in 1.51 s with 685692 KiB peak RSS at `/ALNILAM/`. These are single-run hosted-runner diagnostics. The raw logs and tool versions are in the [PR workflow artifact](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572115). |
| Upgrade/rollback | **PASS for unchanged Site** | No Astro or product dependency change is proposed. Existing required CI runs the Core rollback check, and #50's focused workflow runs it against a disposable Site. A revert of this PR removes the investigation fixture, workflow, and records without changing Site data. |

## Official API decisions

| Capability | Decision | Why |
| --- | --- | --- |
| Content Layer `glob()` | **KEEP** | It already reads external Site Markdown and MDX through Astro's built-in loader; changing the loader adds no value. |
| MDX integration | **KEEP** | It is already enabled and the external Site MDX fixture renders through the existing content collection. Astro's MDX integration documents `glob()` patterns for `.md` and `.mdx`. [MDX integration](https://docs.astro.build/en/guides/integrations-guide/mdx/) |
| File routing and `paginate()` | **KEEP** | Astro already owns static pages and pagination; do not add a second router. Preserve the candidate trailing-slash regression fix in the separate #50 PR. |
| `astro:i18n` helpers | **DEFER / ADAPT** | The helpers require configured locales and account for base/trailing-slash settings. ALNILAM Site v1 stores one site locale plus per-post `lang` and `translationKey`; Astro helpers do not replace the translation identity/alternate inventory. Re-evaluate against the approved vNext URL contract. [i18n API](https://docs.astro.build/en/reference/modules/astro-i18n/) |
| `@astrojs/rss` | **DEFER** | The official helper can generate a feed from a content collection, but current RSS output already handles Site URLs, locale language, escaping, and ALNILAM's route helper. Add it only after an output-parity test shows a maintenance or correctness gain. [RSS recipe](https://docs.astro.build/en/recipes/rss/) |
| `@astrojs/sitemap` | **DEFER / CUSTOM ADAPTER if adopted** | The official integration discovers generated routes, but ALNILAM currently emits alternate links from actual translation groups. Adoption needs a route-inventory parity test before replacing that behavior. [sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/) |
| `astro:assets` | **DEFER** | Current Site-owned images are pass-through files with explicit CLS dimensions. Image processing, external path resolution, and deterministic output need a separate requirement and benchmark. [Image service API](https://docs.astro.build/en/reference/image-service-reference/) |
| `astro build --timings` | **ADOPT for diagnosis only** | Stable Astro 7.4 profiling helps explain build phases without changing the product runtime. No experimental incremental or parallel build option is enabled. [Astro 7.4 release notes](https://astro.build/blog/astro-740/) |
| Swup / `ClientRouter` | **RETIRE from this baseline** | Native MPA navigation already works in the browser smoke. No demonstrated behavior gap justifies another navigation owner. |

## Reuse matrix

| Area | Before | After | Decision |
| --- | --- | --- | --- |
| Source | Astro `7.4.2` lock, external Site `glob()`, native routes, custom feeds, and pass-through Site assets. | No product source or dependency version changes; record current compatibility and API decisions. | **KEEP** |
| Tests | Existing contract, check/build, and browser smoke; no checked-in external MDX fixture in the isolated compatibility run. | Add a minimal MDX fixture and repeat root/nested external composition, artifact check, and browser smoke in the focused workflow. | **ADAPT / WRAP** |
| CI | Required workflow covers demo, nested base, external Site, browser smoke, and rollback. | Add a focused timing/RSS and external-MDX workflow; preserve generic required CI. | **ADAPT** |
| Docs | Issue #79's 7.4.2 baseline and API comparison were not recorded in one report. | Add this source-linked compatibility record and update the current handoff/gate. | **ADAPT** |

## Verdict and rollback

**Candidate verdict: `COMPATIBLE_AS_IS`** for ALNILAM's actual Astro `7.4.2` lock and current integrations. Evidence is the prior 7.3.8/7.4.2 upstream comparison plus local frozen install, Astro check, demo build, external root/nested MDX build, artifact checks, browser smoke, and green focused plus required PR CI. The known upstream E2E and lint failures remain explicit limitations; they are identical across the tested Astro versions.

The focused push run [40522444780](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522444780) and PR run [40522572115](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572115) passed on head `985664d76ebf4a55f7f1e65e45ebde66f5f5bfba`, including external root/nested builds and browser smoke (`2/2`), and uploaded `astro-compatibility-evidence`. Required PR `verify` run [40522572426](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40522572426) also passed.

The independently reviewed docs-only snapshot `0843bc32215fbb3f07021754e6677da229a8dda6` passed focused push/PR compatibility runs [40531514441](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514441) and [40531519875](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875), push `verify` [40531514672](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531514672), and required PR `verify` [40531519650](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519650). The PR run uploaded [`astro-compatibility-evidence`](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40531519875/artifacts/12745539049). These reruns contain no product or Site changes.

No product dependency or Site change is proposed. Reverting the feature PR removes only the focused workflow, MDX compatibility fixture, and documentation. The Site remains an immutable build input.
