# Project #17 — Issue tracking and verification

Board: https://github.com/orgs/Skyline-Gazer/projects/17/

## Confirmed repository tasks
- https://github.com/Skyline-Gazer/ALNILAM/issues/1 — P0 bootstrap CI and ADS acceptance
- https://github.com/Skyline-Gazer/ALNILAM/issues/3 — P0 Core/Site schema, upgrade & rollback
- https://github.com/Skyline-Gazer/ALNILAM/issues/4 — P1 Editorial UI
- https://github.com/Skyline-Gazer/ALNILAM/issues/5 — P2 Blogging essentials
- https://github.com/Skyline-Gazer/ALNILAM/issues/6 — P3 Optional features
- https://github.com/Skyline-Gazer/ALNILAM/issues/7 — P4 Release readiness
- https://github.com/Skyline-Gazer/ALNILAM/issues/8 — P0 Git branch protection and remote-first CI

PR: https://github.com/Skyline-Gazer/ALNILAM/pull/2 (bootstrap → dev, unmerged).

## Honest board status
GitHub repository Issues were created successfully. The connected GitHub tool has **no writable Projects v2 API**. Consequently, issue membership in Project #17, field options and board status are NOT VERIFIED and must not be represented as synchronized.

## Exact follow-up once GitHub Projects v2 authorization/tool is available
Use an authenticated `gh` CLI with `project` read/write scopes, or the Projects v2 GraphQL API:
```bash
gh project view 17 --owner Skyline-Gazer
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/1
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/3
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/4
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/5
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/6
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/7
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/issues/8
gh project item-add 17 --owner Skyline-Gazer --url https://github.com/Skyline-Gazer/ALNILAM/pull/2
gh project item-list 17 --owner Skyline-Gazer --format json
```
Idempotency: **read existing items first** and skip already-linked Issue/PR URLs rather than creating duplicates. Discover actual field IDs and options before setting `Status`, `Priority`, `Iteration` or `Phase`. Do not invent field IDs. Record real item IDs and verify status updates at phase/milestone boundaries. The text above is a **handoff procedure**, not a record that it executed.
