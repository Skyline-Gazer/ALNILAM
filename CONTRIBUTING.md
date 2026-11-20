# Contributing to ALNILAM

## Start with an Issue

Check the GitHub Issues and Project #17 before starting work. Link each change to its Issue and open the pull request against GitHub `dev`. Create a task branch from current `dev` using `feat/*`, `fix/*`, or `chore/*`. Do not push directly to protected `dev` or `main`, force-push, publish a release tag, or trigger a Production release. `main` is release-only.

## Keep the Core/Site boundary

The Core owns the program; each Site owns its content, configuration, and assets. Composition reads Site schema v2 (`alnilam.config.yaml`) and must leave the Site unchanged. `sites/demo` is a test fixture, not a user Site. Do not introduce TOML fallback or automatic Site migration. See [Site onboarding](docs/SITE_ONBOARDING.md) and [architecture](docs/ARCHITECTURE.md).

## Run the relevant checks

Use Node.js 24 and pnpm 10.19 with the frozen lockfile:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
python3 -m unittest discover -s scripts/tests -p '*_test.py'
```

For browser or visual changes, use the existing local commands as applicable: `pnpm browser:local`, `pnpm cls:local`, or `pnpm lighthouse:local`. See the [README](README.md) for their scope and generated evidence paths. Report exact commands and results in the PR; do not present lab evidence as field CrUX data.

## Keep changes reviewable

Use the [pull request template](.github/pull_request_template.md). Explain the user-visible behavior, linked requirement or Issue, checks run, screenshots or browser evidence when relevant, and unresolved limits. Update directly affected user docs, Site examples, architecture decisions, and notices in the same PR. Preserve historical docs and decisions with links rather than silently deleting them.

## License, attribution, and secrets

ALNILAM is Apache-2.0. Preserve upstream license files and record copied code, fonts, images, and other assets in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [CREDITS.md](CREDITS.md), or the applicable file-level source record. Do not commit private Site content, credentials, tokens, or real provider secrets. The private `.ads` submodule is optional for public contributors; public CI does not fetch it. Vulnerability reporting limits are documented in [SECURITY.md](SECURITY.md); do not disclose sensitive details in public Issues or pull requests. See [maintainer guidance](docs/MAINTAINERS.md) for release and project boundaries.
