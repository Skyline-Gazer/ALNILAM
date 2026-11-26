# Contributing to ALNILAM

## Start with an Issue

Check GitHub Issues and Project #17 before starting work. Link the change to its Issue and create a task branch from current `dev` using `feat/*`, `fix/*`, or `chore/*`. Contributors without write access use a fork and open the pull request into upstream GitHub `dev`. The protected `dev` and `main` branches require pull requests. Release tags and Production actions follow the maintainer procedure and require Owner authorization.

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

Keep attribution in repository notices and distribution files. The Core, Demo and Site templates omit generated credits pages and navigation links. Site authors control acknowledgements for their own content ([Issue #147](https://github.com/Skyline-Gazer/ALNILAM/issues/147)).
