#!/usr/bin/env python3
"""Fail-closed, offline license *evidence* check for ADS consumer developer tools.

Reads explicit, versioned distribution evidence and real local license files.
It never installs tools, scans unrelated files or sends any data over the network.
An official-looking URL or matching license text alone is NOT cryptographic
proof of distribution provenance; agents must verify installed-package identity,
license-file association and latest-stable status separately.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


SEMVER = re.compile(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\Z")
SAFE_USES = {"internal-development", "independent-software-delivery"}
USAGES = SAFE_USES | {"tool-redistribution", "hosted-rtk-service"}


def versioned_origin(tool: str, value: str, version: str) -> bool:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port:
        return False
    host = (parsed.hostname or "").lower()
    path = unquote(parsed.path)
    if tool == "codegraph":
        if host == "registry.npmjs.org" and path == f"/@andysom25/codegraph/-/codegraph-{version}.tgz":
            return True
        return host == "github.com" and re.fullmatch(
            r"/andysom25/codegraph/commit/[a-f0-9]{40}", path
        ) is not None
    return (
        host == "github.com"
        and path.startswith(f"/rtk-ai/rtk/releases/download/v{version}/rtk-")
        and not path.startswith(f"/rtk-ai/rtk/releases/download/v{version}/rtk-oss")
        and not path.startswith(f"/rtk-ai/rtk/releases/download/v{version}/rtk-proxy")
        and path.count("/") == 6
    )


def license_record(root: Path, filename: str, kind: str) -> dict:
    if not isinstance(filename, str) or not filename.strip():
        raise ValueError(f"{kind}: license file not supplied")
    path = Path(filename).expanduser()
    if not path.is_absolute():
        path = root / path
    if not path.is_file():
        raise ValueError(f"{kind}: license file missing")
    contents = path.read_bytes()
    if len(contents) > 128 * 1024:
        raise ValueError(f"{kind}: unexpectedly large license file")
    text = contents.decode("utf-8", errors="strict")
    needles = {
        "MIT": ("MIT License", "Permission is hereby granted, free of charge",
                "THE SOFTWARE IS PROVIDED"),
        "Apache-2.0": ("Apache License", "Version 2.0"),
        "BUSL-1.1": ("Business Source License 1.1", "Licensed Work:",
                     "rtk-engine", "Additional Use Grant:", "production",
                     "does not permit", "Change Date:", "Change License:"),
    }
    if not all(needle in text for needle in needles[kind]):
        raise ValueError(f"{kind}: observed text differs from expected license/grant markers")
    if kind == "BUSL-1.1":
        if not re.search(r"Change Date:\s+\d{4}-\d{2}-\d{2}", text):
            raise ValueError("BUSL-1.1: unrecognized change date")
        if not re.search(r"Change License:\s+Apache License, Version 2.0", text):
            raise ValueError("BUSL-1.1: change license requires review")
        if not re.search(r"does not permit\s+offering", text):
            raise ValueError("BUSL-1.1: downstream commercial-use restriction changed")
    return {"spdx": kind, "sha256": hashlib.sha256(contents).hexdigest(),
            "bytes": len(contents)}


def inspect(evidence: dict, evidence_dir: Path) -> dict:
    errors = []
    if evidence.get("schema_version") != 1:
        errors.append("unsupported schema_version")
    usage = evidence.get("usage")
    if usage not in USAGES:
        errors.append("usage must be explicitly classified")
    elif usage not in SAFE_USES:
        errors.append(f"{usage}: additional commercial/redistribution rights review required")
    if evidence.get("osi_only") is True:
        errors.append("OSI-only tool policy conflicts with mandatory full RTK (BUSL-1.1)")
    tools = evidence.get("tools")
    if not isinstance(tools, dict):
        tools = {}
        errors.append("tools evidence missing")
    records = {}
    for tool in ("codegraph", "rtk"):
        item = tools.get(tool)
        if not isinstance(item, dict):
            errors.append(f"{tool}: observed installation evidence missing")
            continue
        version = item.get("version", "")
        if not isinstance(version, str) or not SEMVER.fullmatch(version):
            errors.append(f"{tool}: invalid/missing installed version")
            continue
        origin = item.get("distribution_url", "")
        if not isinstance(origin, str) or not versioned_origin(tool, origin, version):
            errors.append(f"{tool}: expected a version-matched official distribution URL")
        # This is an attestation: the preflight must independently verify that
        # the active executable was installed from the named distribution.
        if item.get("installed_distribution_verified") is not True:
            errors.append(f"{tool}: installed binary/package provenance unverified")
        source_mode = tool == "codegraph" and item.get("source_sha") is not None
        if source_mode:
            sha = item.get("source_sha")
            if not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{40}", sha):
                errors.append("codegraph: invalid source SHA")
            elif origin != f"https://github.com/andysom25/codegraph/commit/{sha}":
                errors.append("codegraph: source URL differs from approved SHA")
            if item.get("latest_stable_verified") is True:
                errors.append("codegraph: source fallback may not claim latest-stable")
            if item.get("source_fallback_approved") is not True or item.get("source_fallback_verified") is not True:
                errors.append("codegraph: official upstream absence/approval or source provenance unverified")
        elif item.get("latest_stable_verified") is not True:
            errors.append(f"{tool}: latest-stable comparison not verified")
        edition = item.get("edition")
        if edition != ("full" if tool == "rtk" else "cli"):
            errors.append(f"{tool}: wrong/unverified edition")
        records[tool] = {"version": version, "edition": edition, "distribution_url": origin}
        try:
            records[tool]["licenses"] = [
                license_record(evidence_dir, item.get("license_file"), 
                               "MIT" if tool == "codegraph" else "Apache-2.0")
            ]
            if tool == "rtk":
                records[tool]["licenses"].append(
                    license_record(evidence_dir, item.get("engine_license_file"), "BUSL-1.1")
                )
        except (ValueError, OSError, UnicodeError) as exc:
            errors.append(f"{tool}: {exc}")
    return {
        "state": "BLOCKED" if errors else "PASS_WITH_ATTESTED_PROVENANCE",
        "usage": usage,
        "tools": records,
        "errors": errors,
        "note": ("License content markers and hashes checked locally. Installed binary "
                 "provenance, license-file association, release freshness and actual "
                 "rights remain independently attested and require human review "
                 "on license/grant changes; this is not legal advice."),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence_json", type=Path)
    args = parser.parse_args(argv)
    try:
        evidence_path = args.evidence_json.resolve()
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        if not isinstance(evidence, dict):
            raise ValueError("evidence must be a JSON object")
        result = inspect(evidence, evidence_path.parent)
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        result = {"state": "BLOCKED", "errors": [str(exc)]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["state"] == "PASS_WITH_ATTESTED_PROVENANCE" else 1


if __name__ == "__main__":
    raise SystemExit(main())
