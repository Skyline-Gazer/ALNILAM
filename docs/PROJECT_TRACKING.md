# Project #17 — verified P0 snapshot

[Board](https://github.com/orgs/Skyline-Gazer/projects/17/) queried with authenticated Projects v2 GraphQL on 2026-10-26. Raw read-back, item IDs and fields: [baseline evidence](p0/evidence/baseline.json).

- Project ID: `PVT_kwDOEwGMMc4Bomrx`, actual title **Dev Contron**.
- 17 existing historical items, all Status **Done**. These include historical Issues and PRs; this does not establish Next completion.
- Only custom selection field is Status (Todo / In Progress / Done). No Phase field exists. Native Milestone, Parent issue and Sub-issues progress are exposed as system fields. Repository milestone list is empty.
- Next Issues #36/#44/#45/#46/#47/#80/#81/#82/#83 were absent from the board at this read-back. Native Next parent/sub-issue relationships were separately queried and are absent. Markdown Parent text is not a native relationship.
- Current CLI can read the Project; older statements that no Project API was available are historical. No Project, milestone or hierarchy mutation was performed in P0. The proposed hierarchy remains gated on Owner G0-F approval in Draft #77.

Existing Issues are reused by [audit PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85). P0 evidence and pending Owner decisions are tracked in the [acceptance report](p0/P0-ACCEPTANCE.md); no item is declared Done from green CI alone.
