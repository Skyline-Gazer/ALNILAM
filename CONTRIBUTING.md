# Contributing to ALNILAM

Documentation, translations, bug fixes and features are welcome. Start with the
[README](README.md) and search [open Issues and PRs](https://github.com/Skyline-Gazer/ALNILAM)
before opening a Bug Report or Feature Request. Include a minimal reproduction
and relevant versions for bugs. For features, describe the use case and any
alternatives. Remove secrets and personal information from examples or logs.

## Open a pull request to `dev`

Start from current `dev`. If you lack write access, use a fork. Group related
changes and link relevant Issues. Release tags and Production actions follow
the maintainer procedure and require Owner authorization.

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

Use the [pull request template](.github/pull_request_template.md). Record what
changed and which checks ran. Add screenshots or limitations when useful. Update
affected documentation and attribution in the same PR. GitHub Actions `verify`
is required. CodeRabbit is advisory. Resolve material review findings or explain
your decision in the thread.

## License, attribution, and secrets

ALNILAM is Apache-2.0. Preserve upstream license files and record copied code, fonts, images, and other assets in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [CREDITS.md](CREDITS.md), or the applicable file-level source record. Do not commit private Site content, credentials, tokens, or real provider secrets. Vulnerability reporting limits are documented in [SECURITY.md](SECURITY.md); do not disclose sensitive details in public Issues or pull requests. See [maintainer guidance](docs/MAINTAINERS.md) for release and project boundaries.

Keep attribution in repository notices and distribution files. The Core, Demo and Site templates omit generated credits pages and navigation links. Site authors control acknowledgements for their own content ([Issue #147](https://github.com/Skyline-Gazer/ALNILAM/issues/147)).
