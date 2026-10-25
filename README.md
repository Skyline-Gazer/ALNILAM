# ALNILAM

**ALNILAM — A Modern, Extensible Blogging Platform**

Apache-2.0 licensed, static-first Astro 7 / Svelte 5 / Tailwind CSS 4 blogging platform, with a Core/Site ownership boundary and an Editorial theme.

> **Status: v0.1 bootstrap proposal.** This repository contains a runnable baseline, not a feature-complete theme. Changes are pending review on `chore/initial-platform-bootstrap` → `dev`.

## Development
Requires Node.js >=22.12 and pnpm 10.19 (via Corepack).
```bash
git clone --recurse-submodules https://github.com/Skyline-Gazer/ALNILAM.git
cd ALNILAM
git switch dev  # once bootstrap PR is accepted
corepack enable
pnpm install --no-frozen-lockfile
pnpm dev
```
The default site data lives in `sites/demo`; it is **never a user-owned production content repository**.

## Build Core with a user Site
```bash
pnpm build
node scripts/compose.mjs --site /absolute/path/to/my-site --out /absolute/path/to/dist
```
Required Site layout:
```
my-site/
  alnilam.config.toml
  content/posts/*.md
  assets/                      # optional, served at /site-assets/
  data/                        # optional
```
The Site source is validated and hashed before and after building, with no writes into the source tree. The output is staged before replacing the prior target. The Site format is currently v1, not yet a public stable content schema.

**Important:** The first dependency lockfile is not yet frozen until the bootstrap CI resolves dependencies and a committed `pnpm-lock.yaml` passes `--frozen-lockfile`. Read `docs/HANDOFF.md` for all acceptance gaps.

## Development and governance
- Primary development: `dev` with Issue-linked PRs; `main` is release-only.
- ADS v0.3 pinned at `.ads`, with `AGENTS.md` as the project entrypoint.
- GitHub Project #17: https://github.com/orgs/Skyline-Gazer/projects/17/
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Scope & milestones: [docs/ROADMAP.md](docs/ROADMAP.md)
- AI Handoff: [docs/HANDOFF.md](docs/HANDOFF.md)
- Attribution: [CREDITS.md](CREDITS.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

