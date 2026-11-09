# ALNILAM — Current Agent Handoff

## Live-state update — 2026-11-09 (current, supersedes 2026-11-08 below)

Everything from "## Live-state update — 2026-11-08" downward is retained
historical evidence. This section is the authoritative tip for the PhotoSwipe
lightbox cutover.

### Git / remotes (verified live 2026-11-09)

| Ref | Value |
| --- | --- |
| CNB `dev` (pre-PhotoSwipe PR) | `8661eed8b9e919e00edab9a7aa1d36a6cac95c35` (tree `14c0989e11a140be87864dda3d402365e9aaec4e`) — after merge of docs PRs #89 then #90 |
| Branch | `feat/photoswipe-lightbox` (PhotoSwipe PR; not yet merged at this write) |
| CNB `main` | `285a62cecd87f8f20276c7cc989537a391f488c8` — untouched |
| ADS pin | `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` — unchanged |
| GitHub `dev` / Vercel Production | lag CNB; do not mirror/push without Owner authorization |

### PhotoSwipe lightbox cutover (this round)

- Replaced `@fancyapps/ui@6.1.15` with MIT `photoswipe@5.4.4` behind the retained
  `FancyboxHandler` / `initFancybox` / `openFancyboxGallery` / `dataset.fancyboxReady`
  public API (filenames unchanged for Shirone fork stability).
- URL policy: HTTPS + site paths only; protocol-relative `//` → `https:`; same-origin
  http preview assets treated as site paths; signed query preserved; no image proxy.
- Dimension probe with 8s timeout + original-link degrade; generation-token abort for
  Swup races; delegated document click/keydown; PhotoSwipe caption via `textContent`.
- Local proof: `pnpm check` 0 errors; `pnpm browser:local -- tests/browser/lightbox.spec.ts`
  **39/39** (root+nested × 1440/390 HTTPS fixture matrix, a11y trap, degrade, Swup).
- Purge: `@fancyapps/ui` absent from lockfile/`node_modules`; built `_astro` has no
  `fancybox__` / `f-panzoom` / `@fancyapps` vendor markers. Remaining "Fancybox*"
  symbols are intentional compatibility façade names + `data-fancybox` grouping attrs.
- Docs PRs #89/#90 merged to `dev` before branching. #91 (docs governance) remains
  open/parallel — not a PhotoSwipe gate.
- Outstanding: #73 deployed-host acceptance; #91 CodeBuddy git/`docs-links-candidate`
  fixes; CNB trusted CI on this PR; `main`/mirror/ADS pin untouched.

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
