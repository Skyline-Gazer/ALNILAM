# P2 #52 composition decisions

| Area | Decision | Change |
| --- | --- | --- |
| Site contract and YAML config | Keep | Validate the same external Site inputs and digest. |
| Compose build | Adapt | Build from a verified temporary snapshot, never the source. |
| Output publication | Keep | Stage output and restore the previous output if publication fails. |
| Tests | Adapt | Check failure preserves both the Site and previous output. |
| CI and docs | Adapt | Keep functional checks; document snapshot behavior and make security scans optional. |
| Existing paths | Retire | Direct build reads from the source Site. |
