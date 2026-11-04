# ALNILAM — Agent Entry Point

## ADS (lite default)

Source: https://github.com/Skyline-Gazer/ADS
Local rules: `.ads/` Git submodule pinned to commit `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`
(ADS `cnb/dev` development line; not a release tag).
Read at this pin: `.ads/STANDARD.md`, `.ads/SAFETY.md`, `.ads/QUALITY.md`,
`.ads/docs/lite-adoption.md`, `.ads/docs/cnb-review.md`, `.ads/docs/how-to-update.md`.
Optional ADS profiles (CodeGraph/RTK toolchain, strict Git governance, strict lifecycle)
are **not** enabled; do not copy their scripts, hooks or workflows into this repository.
Advance the gitlink only in a dedicated, reviewable PR; never track a moving branch.
If `.ads` is inaccessible, report the blocker; do not invent policy text.

## Project facts

- ALNILAM is an Apache-2.0 open-source static blogging platform.
- **Core owns the program; Site owns content, configuration and assets.** The Site is an
  immutable build input — no production operation may write into it.
- Monorepo: `apps/web` (Astro 7 + Svelte 5 + Tailwind CSS 4), `packages/core` (Site
  config contract), `packages/ui` (Svelte islands), `themes/editorial` (released),
  `themes/shirone` (P1), `sites/demo` (fixture only, not a user's Site).
- Site contract: `alnilam.config.yaml` (`schemaVersion: 2`), `content/posts/`, optional
  `assets/` and `data/`. A TOML-only Site fails closed; there is no v1 fallback or
  automatic migration.
- Development authority: CNB `https://cnb.cool/KoolingMachine/ALNILAM`. GitHub
  `https://github.com/Skyline-Gazer/ALNILAM` hosts Issues and Project #17 and is a
  mirror target; feature PRs land on CNB `dev`. `main` is release-only.
- Task order: GitHub Project #17 live state → Issues and Owner decisions → merged CNB
  code and evidence → `docs/HANDOFF.md` → `docs/ROADMAP.md`.
- Build and test:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
node scripts/compose.mjs --site /absolute/path/to/site --out /absolute/path/to/output
python3 -m unittest discover -s scripts/tests -p '*_test.py'
```

Run affected tests locally in the DevBox before pushing; use `pnpm test`, `pnpm check`
and build checks as appropriate. For browser work, `pnpm browser:local`, `pnpm cls:local`
and `pnpm lighthouse:local` prepare root and subpath outputs and use the same Playwright,
CLS and Lighthouse configuration as CNB. After the first build, `pnpm browser -- <spec>`
reuses those outputs for fast test-only iteration; rebuild after product changes. Run
`pnpm audit:local` for a full browser and Lighthouse audit when relevant. CNB remains the
independent merge-candidate build, contract and regression verification; do not remove or
ignore a failing check. See README for setup and evidence locations.

- Production deployment, release tags, the GitHub mirror and branch-protection changes
  require explicit Owner authorization. CNB never publishes, mirrors, tags or deploys.
- Secrets never belong in the repository, logs, URLs or Site config. Public CI must not
  check out the private ADS repository.

## Working agreement

Implement the minimum sufficient change for the current goal. Verify with the project's
existing tests and CI. Reuse installed runtimes and declared scripts before adding
tooling. No extra task database, session journal or per-phase approval ritual. Preserve
Core/Site independence, Site immutability, YAML-only v2, provenance/rollback and
Apache-2.0/third-party notices. End each task with the exact SHA, CI run, PR, verified
behavior and unresolved blockers.

## CNB development workflow — Owner correction 2026-11-02

- Single-maintainer `dev` defaults to no mandatory platform protection. Use an
  Issue-linked ordinary PR or Owner-authorized non-force Git integration. This
  reconciliation is delivered through one scoped PR to CNB `dev`.
- Functional CI and CodeBuddy provide real feedback to find and fix defects; they
  are not mandatory approval on every ordinary development change. Run checks
  proportionate to the change, address material findings, and report failed,
  missing or stale results honestly. Do not claim a plugin exit is review approval.
- Existing configured required checks remain effective until explicitly changed;
  never disable a check to disguise a failure. Serialize writes, reread live refs
  before integration, then verify actual source ancestry and resulting tree.
- CNB's merge API has no expected-head parameter; the read/merge race remains.
  Do not force-push, force-merge or enable Auto Merge to bypass a real restriction.
- Keep ADS pinned to `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`.
  This project-local Owner decision supersedes conflicting older mandatory CNB
  review/protection language at that pin; it does not opt into strict governance.
- `main` retains necessary production quality and explicit authorization boundaries.
  Main promotion, production mirror, tags/releases, deployments and protection
  changes require separate Owner authorization. This session does not operate ADS.

## Handoff

Read `docs/HANDOFF.md` before changing development authority or starting a slice. Never
infer implemented features from roadmap entries. Record exact commit SHA, CI run URL and
results, PR, verified functionality and unresolved blockers.

## Owner override — 2026-11-01

Ordinary development uses proportionate functional checks and CodeBuddy feedback under the current development workflow above. SCA, SBOM, license scanning, security evidence and isolation checks are opt-in and do not gate normal development. Preserve credential protection and production authorization boundaries. This override applies immediately under ADS #109, including while consuming older ADS releases.
