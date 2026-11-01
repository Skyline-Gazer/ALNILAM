# ALNILAM — Agent Entry Point

## ADS (lite default)

Source: https://github.com/Skyline-Gazer/ADS
Local rules: `.ads/` Git submodule pinned to commit `6e5a7dfd1b717a03ed5b33c66707f47aab7f76b9`
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

## CNB Agent-governed PR workflow — Owner decision 2026-10-30

- Create an Issue-linked PR and perform a normal Merge Commit only after current-head CI
  and an actual CodeBuddy review of the same source SHA. Never push directly to protected
  branches, force-push, bypass checks or enable Auto Merge.
- Re-fetch source and target SHAs before merging; bind the tested merge/tree and retained
  receipts to the candidate; resolve Critical/High findings or record an auditable
  false-positive disposition.
- Serialize Agent writes. Re-read live refs immediately before merge; after merging,
  verify the target commit, source ancestry and tree.
- CNB can still allow zero-status merges and its merge API has no expected-head
  parameter; record that residual risk. Independent Gatekeeper, fixed reviewer and Auto
  Merge are not gates.
- The private ADS gitlink stays pinned; default recursive clones skip ADS. Production
  `main`, the first production mirror, tags/releases and deployments remain separately
  authorized operations.

## Handoff

Read `docs/HANDOFF.md` before changing development authority or starting a slice. Never
infer implemented features from roadmap entries. Record exact commit SHA, CI run URL and
results, PR, verified functionality and unresolved blockers.

## Owner override — 2026-11-01

Ordinary development uses functional CI and substantive current-head CodeBuddy review. SCA, SBOM, license scanning, security evidence and isolation checks are opt-in and do not gate normal development. Preserve credential protection and production authorization boundaries. This override applies immediately under ADS #109, including while consuming older ADS releases.
