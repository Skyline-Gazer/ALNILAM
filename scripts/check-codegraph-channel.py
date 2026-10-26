#!/usr/bin/env python3
"""Observe the official CodeGraph channel without installing binaries.

Stable npm package is first choice. Only a genuine npm 404 plus zero official
GitHub releases permits the user-approved SOURCE_FALLBACK channel. Source
fallback is NOT a stable release. Record immutable source SHA, MIT license,
observed version, and the operator's specific installation consent separately.
"""
from __future__ import annotations
import argparse
import json
import re
import urllib.error
import urllib.request

SOURCE = "andysom25/codegraph"
NPM = "https://registry.npmjs.org/@andysom25%2Fcodegraph/latest"
RELEASES = "https://api.github.com/repos/andysom25/codegraph/releases"
REF = "https://api.github.com/repos/andysom25/codegraph/git/ref/heads/main"
RAW = "https://raw.githubusercontent.com/andysom25/codegraph"
SEMVER = re.compile(r"[0-9]+\.[0-9]+\.[0-9]+\Z")
SHA = re.compile(r"[0-9a-f]{40}\Z")


def request_json(url: str, timeout=10):
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json" if "api.github.com" in url else "application/json",
        "User-Agent": "ADS-CodeGraph-channel-policy",
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def observe_channel(approved_sha: str | None = None) -> dict:
    try:
        package = request_json(NPM)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise ValueError(f"npm registry unavailable with HTTP {exc.code}; do not activate source fallback") from exc
    else:
        version = package.get("version")
        if package.get("name") != "@andysom25/codegraph" or package.get("dist", {}).get("tarball") != f"https://registry.npmjs.org/@andysom25/codegraph/-/codegraph-{version}.tgz":
            raise ValueError("official npm package identity/distribution mismatch")
        if not isinstance(version, str) or not SEMVER.fullmatch(version):
            raise ValueError("npm version missing/not stable; refuse source fallback")
        return {"channel": "STABLE", "version": version, "url": NPM,
                "source_sha": None, "stable_verified": True}
    releases = request_json(RELEASES)
    if not isinstance(releases, list) or releases:
        raise ValueError("npm 404 but upstream has releases or release list is unverified")
    ref = request_json(REF)
    sha = ref.get("object", {}).get("sha")
    if not isinstance(sha, str) or not SHA.fullmatch(sha):
        raise ValueError("cannot independently verify official upstream commit SHA")
    observed_head = sha
    if approved_sha is not None:
        if not SHA.fullmatch(approved_sha):
            raise ValueError("approved source SHA must be full 40-hex")
        sha = approved_sha
    package = request_json(f"{RAW}/{sha}/package.json")
    if package.get("name") != "@andysom25/codegraph" or package.get("license") != "MIT":
        raise ValueError("source identity/license mismatch")
    version = package.get("version")
    if not isinstance(version, str) or not SEMVER.fullmatch(version):
        raise ValueError("source package version missing/not stable semver")
    return {"channel": "SOURCE_FALLBACK", "version": version, "url": f"https://github.com/{SOURCE}/commit/{sha}",
            "source_sha": sha, "observed_head_sha": observed_head, "stable_verified": False,
            "reason": "official npm 404 and GitHub releases empty; approved immutable source selected, never auto-upgraded"}


def evaluate_source_pin(observation: dict, approved_sha: str | None) -> tuple[bool, str]:
    if observation["channel"] != "SOURCE_FALLBACK":
        return False, "stable distribution exists; source fallback no longer justified"
    if not isinstance(approved_sha, str) or not SHA.fullmatch(approved_sha):
        return False, "explicit reviewed 40-character source SHA is required"
    if approved_sha != observation["source_sha"]:
        return False, "upstream source SHA changed; review/update pinned source before relying on it"
    return True, "approved immutable source SHA independently checked at the official repository (not a stable release)"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-sha", help="Previously reviewed immutable source pin; never auto-follow HEAD")
    args = parser.parse_args()
    try:
        print(json.dumps(observe_channel(args.source_sha), indent=2))
    except (OSError, ValueError, urllib.error.URLError, json.JSONDecodeError) as exc:
        print(json.dumps({"channel": "BLOCKED", "error": str(exc)}))
        raise SystemExit(1)
