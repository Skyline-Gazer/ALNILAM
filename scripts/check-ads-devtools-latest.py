#!/usr/bin/env python3
"""Query official latest-stable releases without installing tools or changing a repository."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
import urllib.error
import urllib.request

UPSTREAMS = ("andysom25/codegraph", "rtk-ai/rtk")


def latest_stable(repo: str, timeout: float = 8.0) -> dict:
    if repo == "andysom25/codegraph":
        spec = spec_from_file_location("codegraph_channel", Path(__file__).with_name("check-codegraph-channel.py"))
        if spec is None or spec.loader is None:
            raise ValueError("CodeGraph source policy missing")
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        observed = module.observe_channel()
        return {
            "repository": repo, "version": observed["version"],
            "release_url": (
                "https://www.npmjs.com/package/@andysom25/codegraph"
                if observed["channel"] == "STABLE" else observed["url"]
            ),
            "channel": observed["channel"],
            "stable_verified": observed["stable_verified"],
            "source_sha": observed["source_sha"],
        }

    url = f"https://api.github.com/repos/{repo}/releases/latest"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "ADS-consumer-devtools-release-check"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        release = json.load(response)
    if release.get("draft") or release.get("prerelease") or not release.get("tag_name"):
        raise ValueError("upstream did not return a latest stable release")
    return {
        "channel":"STABLE","stable_verified":True,
        "repository": repo,
        "version": release["tag_name"].lstrip("v"),
        "release_url": release.get("html_url", url),
        "published_at": release.get("published_at"),
    }

def main() -> int:
    results = []
    failures = []
    for repo in UPSTREAMS:
        try:
            results.append(latest_stable(repo))
        except (OSError, ValueError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            failures.append({"repository": repo, "state": "UNVERIFIED", "reason": str(exc)})

    print(json.dumps({
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "policy": "latest-stable-preferred; source fallback is not stable",
        "results": results,
        "failures": failures,
    }, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
