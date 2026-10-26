# CNB Cloud Browser / Plugin Pilot — ALNILAM #94

**Status: configuration added on isolated GitHub task branch; CNB live run NOT VERIFIED.**
This pilot is intentionally pre-P1 and does not modify ALNILAM Core/Site schema, published v0.1.3, ADS cnb/v0.4.1, production tags or release logic.

## Placement and event authority

- Only an actual **CNB-hosted** copy of this code triggers CNB Cloud Build. A GitHub branch push/PR alone cannot run `.cnb.yml`.
- CNB test branch name: `chore/94-cnb-browser-ci-pilot`; a **CNB-native PR** targeting `dev` invokes separate Browser/CLS and SCA/AI-review pipelines.
- This GitHub branch/PR supplies source and review only. A CNB repo import, credential, native PR, merge, mirror, or provider cutover requires its own authorization and readback.
- Browser, tests, plugins, generated artifacts and CodeGraph/RTK remain developer-only. No production deployment.

## Safe plugin map

| Component | CNB task | Trigger | Safety / outcome |
| --- | --- | --- | --- |
| Cloud Chromium/CLS | pinned Playwright image + script | test branch push; CNB PR to dev | 390px/1440px, screenshots, traces, synthetic positive shift |
| JS coverage | Node `--test-reporter=lcov` and `testing:coverage` | both | report present; measured baseline; no made-up minimum |
| Security overview | `cnbcool/cnb-sechook` | CNB PR | informative only; **does not replace scanner** |
| Dependency vuln | `cnbcool/sca-vulnerability` | CNB PR | new high/critical risks block |
| License | `cnbcool/sca-license` | CNB PR | new high license risk blocks |
| SBOM Delta | `cnbcool/sca-sbom` | CNB PR | report |
| AI Review | `cnbcool/code-review:1.22.2` | CNB PR | output JSON and comments; `review_event: comment` so no AI auto-approval |
| AI Review gate | `cnb-review-gate.mjs` | CNB PR | Critical/Warning or invalid/missing output block despite plugin exit 0 |
| Attachments | `cnbcool/attachments` | both | 14-day reports, verify actual readback |
| git-auto-tag | offline disposable `git` fixture | test branch push; CNB PR | **no actual CNB/GitHub tag**, no auto_tag trigger |

The official `git-auto-tag` is a **release mutation**, not a PR quality check. A protected, owner-approved release-only `auto_tag` flow with manifest exact-SHA/tag collision checks must be designed and verified separately. The current pipeline intentionally omits the real plugin rather than creating unapproved tags.

Other plugins reviewed: `git-pr-title-lint` and `commitlint` are useful but should join the established ADS review/governance check instead of duplicating it; `docker:cache` is only warranted after cold/warm benchmark; do not enable `git:auto-merge`, `git:release`, production deploy, NPC write mode or git-sync in this test.

## Evidence and limitations

The current GitHub ALNILAM dev is a historic pre-P1 demonstration with TOML Site v1; only used as an **immutable test fixture**. It is not a license to retain legacy TOML in vNext. Test output is isolated. After P1 replaces the frontend, update to YAML-only Site and genuine root plus `/ALNILAM/` separately composed builds and broaden to route/scroll/comments/ad Consent cases.

The browser script calculates CLS with the maximum 5-second / 1-second-gap session-window algorithm, ignoring recent-input shifts. It produces diagnostic lab data, not Chrome UX Report p75. Lighthouse CI and the complete visual suite are separate later scope in #74. Lab runner version `mcr.microsoft.com/playwright:v1.64.1-noble` and plugin tags are provisional until CNB fetches exact image digests and runs at least two clean PR/re-run checks. Do not count YAML parsing as remote PASS.

**Executed offline in preparation:** YAML parsed successfully; Node JS syntax check; nine review-gate fixtures including bad JSON shape, critical/warning with exit 0, and missing report; disposable Git tag test. **Not executed:** real CNB cloud build, pulled plugin execution, browser screenshots, attachment readback, CNB PR comments, CNB SHA freshness, native branch protection, quota/latency.

Before mandatory gating: prove native PR target/source/test SHA; verify no stale AI reviewer result on push; archive logs and check `CNB_PULL_REQUEST_SHA` remotely; measure coverage baseline and set an evidence-based gate. The review result JSON validates content but the script alone does not query CNB to verify the source branch has not advanced.

## Official documentation

- https://docs.cnb.build/zh/build/trigger-rule.html
- https://docs.cnb.build/zh/build/build-in-env.html
- https://docs.cnb.cool/zh/security/sca-plugins.html
- https://docs.cnb.build/zh/build/internal-steps/testing/coverage.html
- https://cnb.cool/cnb/plugins/cnbcool/cnb-sechook
- https://cnb.cool/cnb/plugins/cnbcool/code-review
- https://cnb.cool/cnb/plugins/cnbcool/attachments
- https://playwright.dev/docs/docker

Gate links: ALNILAM #94 #74 #55 #81; ADS #63 (optional CNB provider adoption).
