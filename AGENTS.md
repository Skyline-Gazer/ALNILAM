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
- Development authority: GitHub `https://github.com/Skyline-Gazer/ALNILAM`. GitHub
  `dev` is the feature-development branch; CNB `dev` is frozen at
  `9916a0c4984f8e9d762f59247cf923f0fd7f0071`. `main` is release-only.
- GitHub Issues and Project #17 remain task-tracking authority. Read live Project
  state and Owner decisions before selecting work; use GitHub PR history and
  Actions evidence, then update `docs/HANDOFF.md` and `docs/ROADMAP.md`.
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

Run affected checks locally in the DevBox before pushing. Use the existing
`pnpm test`, `pnpm check`, build and browser commands as appropriate. For browser
work, `pnpm browser:local`, `pnpm cls:local` and `pnpm lighthouse:local` prepare
root and subpath outputs using the same Playwright, CLS and Lighthouse settings
as CI. After the first build, `pnpm browser <spec>` reuses those outputs; rebuild
after product changes. Run `pnpm audit:local` for a full audit only when relevant.
GitHub Actions `verify` is the required PR check. Vercel's existing Git integration
builds the `dev` branch. CNB is a frozen source snapshot, not a current validation
or development provider. See README for setup and evidence locations.

- Production deployment, release tags, changes to `main`, and branch-protection
  changes require explicit Owner authorization. Do not write new development work
  to frozen CNB `dev` or start a recurring CNB mirror.
- Secrets never belong in the repository, logs, URLs or Site config. Public CI must not
  check out the private ADS repository.

## Working agreement

Implement the minimum sufficient change for the current goal. Verify with the project's
existing tests and CI. Reuse installed runtimes and declared scripts before adding
tooling. No extra task database, session journal or per-phase approval ritual. Preserve
Core/Site independence, Site immutability, YAML-only v2, provenance/rollback and
Apache-2.0/third-party notices. End each task with the exact SHA, CI run, PR, verified
behavior and unresolved blockers.

## GitHub development workflow — Owner decision 2026-11-13

- Use Issue-linked pull requests to GitHub `dev`. The active ruleset requires a
  pull request and the GitHub Actions `verify` check; it permits no force pushes
  or bypass actors. Keep Auto-merge disabled.
- Functional CI and Greptile feedback find defects; independent approval is not
  mandatory on every ordinary development PR. Address material findings and
  report failed, missing or stale results honestly.
- Existing required checks remain effective. Serialize writes, reread live refs
  before integration, preserve both histories, and verify the resulting GitHub
  `dev` commit and tree. Do not force-push.
- CNB `dev` is frozen at `9916a0c4984f8e9d762f59247cf923f0fd7f0071`; do not push
  development changes there or mirror it back into GitHub.
- Keep ADS pinned to `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695`. This project-local
  Owner decision does not opt into ADS strict governance profiles.
- `main` remains release-only. Main promotion, production releases, tags and
  protection changes require separate Owner authorization.

## Handoff

Read `docs/HANDOFF.md` before changing development authority or starting a slice. Never
infer implemented features from roadmap entries. Record exact commit SHA, CI run URL and
results, PR, verified functionality and unresolved blockers.

## Owner override — 2026-11-01

Ordinary development uses proportionate functional checks and CodeBuddy feedback under the current development workflow above. SCA, SBOM, license scanning, security evidence and isolation checks are opt-in and do not gate normal development. Preserve credential protection and production authorization boundaries. This override applies immediately under ADS #109, including while consuming older ADS releases.
