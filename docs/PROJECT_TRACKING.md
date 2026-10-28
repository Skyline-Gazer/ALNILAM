# Project #17 — verified P0 snapshot

[Board](https://github.com/orgs/Skyline-Gazer/projects/17/) queried with authenticated Projects v2 GraphQL on 2026-10-26. Raw read-back, item IDs and fields: [baseline evidence](p0/evidence/baseline.json).

- Project ID: `PVT_kwDOEwGMMc4Bomrx`, actual title **Dev Contron**.
- 18 items after the final 2026-10-26 read-back: 17 historical items plus Issue #82, all Status **Done**. This does not establish Next completion.
- Only custom selection field is Status (Todo / In Progress / Done). No Phase field exists. Native Milestone, Parent issue and Sub-issues progress are exposed as system fields. Repository milestone list is empty.
- At the pre-close read-back, Next Issues #36/#44/#45/#46/#47/#80/#81/#82/#83 were absent. Issue #82 was then added and read back as Done after its acceptance evidence was complete; the other Next Issues remain absent. Native Next parent/sub-issue relationships are absent. Markdown Parent text is not a native relationship.
- Current CLI can read and update the Project. Older statements that no Project API was available are historical. Only Issue #82 was added in P0; no milestone or hierarchy mutation was performed. The proposed hierarchy remains gated on Owner G0-F approval in Draft #77.

Existing Issues are reused by [audit PR #85](https://github.com/Skyline-Gazer/ALNILAM/pull/85), merged into `dev` as `b36b61fff8377694f209fcc7488f7457251a2ce9`. ADS v0.4.1 adoption [PR #84](https://github.com/Skyline-Gazer/ALNILAM/pull/84) merged as `2555c4658599598bfed604fbf0d9b525d24c3ded`; post-merge dev CI [40321449502](https://github.com/Skyline-Gazer/ALNILAM/actions/runs/40321449502) passed. P0 evidence and pending Owner decisions are tracked in the [acceptance report](p0/P0-ACCEPTANCE.md); no item is declared Done from green CI alone.

## P1 Project readback — 2026-10-27

Authenticated Projects v2 GraphQL readback returned the same Project ID `PVT_kwDOEwGMMc4Bomrx`, title `Dev Contron`, and Status options Todo / In Progress / Done. The actual board has #37 and #49 In Progress, #50 Todo, and #47/#48 Done. Issue #79 is **not a Project item**. Issue metadata has no native milestone on #37/#49/#50/#79; #37 has no native parent or sub-issue links, and #49 has no native parent. Repository Issue text still describes #49/#50/#79 as children of #37; Markdown text is not a native relationship. No Project, milestone, parent or sub-issue mutation was made. The separate CNB #94 item is In Progress; this does not change GitHub as ALNILAM's primary provider.
