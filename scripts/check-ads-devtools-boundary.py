#!/usr/bin/env python3
"""Fail closed if consumer CodeGraph/RTK integration leaks into production.

Copy into the consumer repository and run in PR merge-candidate CI targeting
the configured production branch. This generic guard is policy enforcement;
it is not the CodeGraph/RTK integration itself.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

FORBIDDEN_NAMES = {
    ".ads-devtools.json",
    "codegraph.json",
    ".codegraph.json",
    "rtk.json",
    ".rtk.json",
    "codegraph.db",
    "codegraph.sqlite",
    "codegraph.sqlite3",
    "codegraph-index.sqlite",
    "codegraph-index.sqlite3",
    "rtk.exe",
}
FORBIDDEN_DIRS = {".ads-devtools", ".codegraph", ".rtk"}
HOST_CONFIG_ROOTS = {".claude", ".codex", ".omp", ".opencode", ".cursor", ".agents"}
AGENT_INSTRUCTIONS = {"CLAUDE.md", "GEMINI.md", "CODEX.md", ".github/copilot-instructions.md"}
AGENT_TOOL_INSTRUCTION = re.compile(
    r"(?i)(?:\buse\s+rtk\s+(?:instead|for|to)\b|\brtk\s+(?:git|grep|find|ls|read|test|cargo|npm|pnpm|init)\b|"
    r"\bcodegraph\s+(?:serve\s+--mcp|init|sync|status)\b)"
)
TOOL_MARKER = re.compile(r"(?i)\b(?:codegraph|rtk(?:-oss)?)\b")
INTEGRATION_MARKER = re.compile(r"(?i)\b(?:command|hooks?|mcp|plugin|executable|binary|wrapper|sync|init)\b")
GITIGNORE_TOOL_PATTERN = re.compile(r"(?im)^\s*/?(?:\.codegraph|\.rtk|codegraph(?:-index)?\.(?:db|sqlite3?)|rtk(?:-oss)?(?:\.exe)?)(?:/|\s|$|#)")
SKIP_DIRS = {".git", ".ads", "node_modules", ".venv", "venv"}


def files_under(root: Path):
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if path.is_file():
            yield relative, path


def violations(root: Path) -> list[str]:
    found: list[str] = []
    all_files = list(files_under(root))
    manifest_path = root / ".ads-devtools.json"
    manifest: dict = {}
    if manifest_path.is_file():
        found.append(".ads-devtools.json: consumer developer-tool manifest is forbidden on production")
        try:
            loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                manifest = loaded
            else:
                found.append(".ads-devtools.json: manifest root must be a JSON object")
        except (OSError, json.JSONDecodeError) as exc:
            found.append(f".ads-devtools.json: cannot parse dev-only path declarations: {exc}")

    for rel, path in all_files:
        rel_posix = rel.as_posix()
        lower_path = rel_posix.lower()
        if rel.parts and rel.parts[0] == "scripts" and any(token in rel.name.lower() for token in ("devtools", "codegraph", "rtk")) and rel.name != "check-ads-devtools-boundary.py":
            found.append(f"{rel_posix}: consumer developer-tool helper must remain on development branches")
        if len(rel.parts) >= 3 and rel.parts[:2] == (".github", "workflows") and any(token in rel.name.lower() for token in ("ads-devtools", "codegraph", "rtk")) and rel.name != "ads-devtools-boundary.yml":
            found.append(f"{rel_posix}: tool-specific workflow must remain on development branches")
        if rel.name in FORBIDDEN_NAMES and rel_posix != ".ads-devtools.json":
            found.append(f"{rel_posix}: forbidden generated artifact or tool binary")
        if any(part.lower() in FORBIDDEN_DIRS for part in rel.parts):
            found.append(f"{rel_posix}: forbidden tool configuration/artifact directory")
        if rel.name.lower() in {"rtk", "rtk.exe"}:
            found.append(f"{rel_posix}: RTK executable must not enter production")
        in_host_config = bool(rel.parts) and rel.parts[0] in HOST_CONFIG_ROOTS
        if in_host_config or rel_posix in AGENT_INSTRUCTIONS or rel_posix == ".gitignore":
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            if rel_posix == ".gitignore" and GITIGNORE_TOOL_PATTERN.search(text):
                found.append(".gitignore: tool-specific generated-data ignore rules must remain development-only")
            if in_host_config and TOOL_MARKER.search(text) and INTEGRATION_MARKER.search(text):
                found.append(f"{rel_posix}: appears to contain CodeGraph/RTK host integration")
            if rel_posix in AGENT_INSTRUCTIONS and AGENT_TOOL_INSTRUCTION.search(text):
                found.append(f"{rel_posix}: appears to contain generated CodeGraph/RTK integration instructions")

    declared_paths = manifest.get("dev_only_paths", [])
    if not isinstance(declared_paths, list):
        found.append(".ads-devtools.json: dev_only_paths must be a JSON array")
        declared_paths = []
    for declared in declared_paths:
        if not isinstance(declared, str) or not declared:
            found.append(".ads-devtools.json: dev_only_paths must contain non-empty relative paths")
            continue
        candidate = (root / declared).resolve()
        if not candidate.is_relative_to(root.resolve()):
            found.append(f".ads-devtools.json: path escapes repository root: {declared}")
        elif candidate.exists():
            found.append(f"{declared}: declared dev-only path exists in production tree")

    return sorted(set(found))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--target-branch", required=True, help="PR base branch or push branch")
    parser.add_argument("--production-branch", default="main")
    args = parser.parse_args()
    root = args.root.resolve()

    if args.target_branch != args.production_branch:
        print(
            f"PASS/SKIP: target {args.target_branch!r} is not the configured production branch "
            f"{args.production_branch!r}; development-only integration may remain here."
        )
        return 0

    problems = violations(root)
    if problems:
        print(
            f"FAIL: consumer CodeGraph/RTK configuration or artifacts would enter production {args.production_branch}:",
            file=sys.stderr,
        )
        print("\n".join(f"- {item}" for item in problems), file=sys.stderr)
        return 1
    print(f"PASS: no known consumer CodeGraph/RTK integration or generated artifact in production {args.production_branch}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
