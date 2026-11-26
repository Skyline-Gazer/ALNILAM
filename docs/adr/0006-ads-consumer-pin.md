# ADR 0006 — Keep the ADS consumer pin project-specific

**Status:** Current project policy from [AGENTS.md](../../AGENTS.md) and [ads-pin.txt](../../ads-pin.txt). This record distinguishes the current pin from historical ADS v0.4.1 adoption in [PR #84](https://github.com/Skyline-Gazer/ALNILAM/pull/84).

## Context

ALNILAM's private `.ads` submodule is pinned to [ADS v0.8.0](https://github.com/Skyline-Gazer/ADS/releases/tag/v0.8.0) at `178212c41cce8fbf9354d4066e0f77341f6f23c4`. That is the commit the annotated tag resolves to. The prior pin `b8d9cfc09f5fb543b9fa2c7dc3d1708ff20d9695` came from the retired ADS `cnb/dev` line and is reachable from `archive/cnb-dev-final`. Optional CodeGraph/RTK and strict ADS profiles remain disabled.

## Decision

1. Keep the exact project gitlink pin; never follow a moving ADS branch. Change it only in a dedicated, reviewable PR after checking the consumer rules and access boundary.
2. GitHub remains ALNILAM's development authority. Public CI verifies the expected pin metadata without recursively fetching the private ADS repository.
3. Do not claim upstream-release tools or optional ADS profiles are installed or active unless ALNILAM explicitly enables and verifies them.
4. Keep ALNILAM's Apache-2.0 license. ADS's MIT license does not relicense ALNILAM or replace third-party notices.

## Consequences

Public contributors can build and test ALNILAM without private ADS access. Current policy is checked through the root guidance and pin fixture; historical adoption receipts remain linked but are not presented as the current toolchain.

## References

[AGENTS.md](../../AGENTS.md), [ads-pin.txt](../../ads-pin.txt), [ADS consumer policy](../next/06-REUSE-DOC-GOVERNANCE.md#e-ads-v041-adoption-and-current-consumer-pin), [maintainer guide](../MAINTAINERS.md).
