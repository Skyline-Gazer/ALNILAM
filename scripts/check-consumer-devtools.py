#!/usr/bin/env python3
"""Fail-closed consumer development toolchain preflight and project initialization.

Copy this file to the consumer repository's scripts/ directory. It never installs
or upgrades software globally. --initialize explicitly creates local project integration. Live RTK host integration
still requires a separate smoke test through the active agent.
"""
from __future__ import annotations

import argparse
from importlib.util import module_from_spec, spec_from_file_location
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

UPSTREAMS = {
    "codegraph": ("codegraph", "andysom25/codegraph"),
    "rtk": ("rtk", "rtk-ai/rtk"),
}
VERSION_RE = re.compile(r"(?<![0-9A-Za-z])v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)")


def latest_stable(repo: str, timeout: float = 8.0) -> tuple[str, str]:
    if repo == "andysom25/codegraph":
        # Use the official npm dist-tag: this CodeGraph upstream has no GitHub Releases API entry.
        url = "https://registry.npmjs.org/@andysom25%2Fcodegraph/latest"
        request = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "ADS-consumer-devtools-check"},
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:
            package = json.load(response)
        version = package.get("version")
        if package.get("name") != "@andysom25/codegraph" or package.get("dist", {}).get("tarball") != f"https://registry.npmjs.org/@andysom25/codegraph/-/codegraph-{version}.tgz":
            raise ValueError("official npm package identity/distribution mismatch")
        if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
            raise ValueError("npm dist-tag did not return a stable CodeGraph semver version")
        return version, "https://www.npmjs.com/package/@andysom25/codegraph"

    url = f"https://api.github.com/repos/{repo}/releases/latest"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "ADS-consumer-devtools-check"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        release = json.load(response)
    if release.get("draft") or release.get("prerelease") or not release.get("tag_name"):
        raise ValueError("upstream did not return a latest stable release")
    return release["tag_name"].lstrip("v"), release.get("html_url", url)

def installed_version(command: str) -> tuple[str, str]:
    executable = shutil.which(command)
    if not executable:
        raise FileNotFoundError(f"{command} is not installed")
    result = subprocess.run(
        [executable, "--version"],
        check=False,
        capture_output=True,
        text=True,
        timeout=8,
        env={**os.environ, "CODEGRAPH_NO_DOWNLOAD": "1"},
    )
    output = (result.stdout + "\n" + result.stderr).strip()
    if result.returncode != 0:
        raise RuntimeError(f"{command} --version exited {result.returncode}")
    match = VERSION_RE.search(output)
    if not match:
        raise ValueError(f"could not parse version from {command} --version output")
    return match.group(1), executable


def load_policy_module(filename):
    spec = spec_from_file_location(filename.replace("-", "_"), Path(__file__).with_name(filename + ".py"))
    if spec is None or spec.loader is None:
        raise ValueError(f"missing policy module: {filename}")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(command, root):
    result = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=120,
                            env={**os.environ, "CODEGRAPH_NO_DOWNLOAD": "1"})
    if result.returncode:
        raise ValueError(f"{Path(command[0]).name} {command[1]} failed ({result.returncode}): {result.stderr[-1000:]}")
    return result.stdout


def verify_executable(item, executable):
    import hashlib
    actual = Path(executable).resolve(strict=True)
    if not isinstance(item.get("executable"), str) or Path(item["executable"]).resolve() != actual:
        raise ValueError("active executable differs from independently attested installation")
    if hashlib.sha256(actual.read_bytes()).hexdigest() != item.get("executable_sha256"):
        raise ValueError("active executable hash differs from independently attested installation")


def project_status(executable, root):
    root = root.resolve()
    configured = root / Path(os.environ.get("CODEGRAPH_DIR", ".codegraph"))
    index = configured.resolve()
    if index == root or not index.is_relative_to(root) or index != configured:
        raise ValueError("configured CodeGraph index escapes worktree or uses a shared symlink")
    if index.exists():
        for path in index.rglob("*"):
            if path.is_symlink():
                raise ValueError("CodeGraph index contains an unverified symlink")
    # Upstream status searches parents and opens SQLite; do not borrow an ancestor's index.
    if not (index / "codegraph.db").is_file():
        return {"initialized": False, "projectPath": str(root), "indexPath": str(index)}
    value = json.loads(run([executable, "status", "--json", str(root)], root))
    if not isinstance(value, dict) or not isinstance(value.get("initialized"), bool):
        raise ValueError("CodeGraph status schema unverified")
    if not isinstance(value.get("projectPath"), str) or Path(value["projectPath"]).resolve() != root:
        raise ValueError("CodeGraph index belongs to another worktree")
    if not isinstance(value.get("indexPath"), str):
        raise ValueError("CodeGraph actual index path unverified")
    index_path = Path(value["indexPath"]).resolve()
    if index_path == root or not index_path.is_relative_to(root) or value.get("worktreeMismatch"):
        raise ValueError("CodeGraph index/worktree mismatch")
    return value


def healthy(status):
    pending = status.get("pendingChanges")
    index = status.get("index")
    if not isinstance(pending, dict) or not isinstance(index, dict):
        return False
    return (status["initialized"] and
            all(type(pending.get(key)) is int and pending[key] == 0 for key in ("added", "modified", "removed")) and
            index.get("reindexRecommended") is False)


def initialize_codegraph(executable, root, query, initialize=False, recover=False):
    root = root.resolve()
    if not (root / ".codegraph").resolve().is_relative_to(root):
        raise ValueError("CodeGraph index path escapes worktree")
    status = project_status(executable, root)
    if not status["initialized"]:
        if not initialize:
            raise ValueError("CodeGraph project uninitialized; rerun with --initialize on development checkout")
        run([executable, "init", str(root)], root)
        status = project_status(executable, root)
    if not healthy(status):
        if not recover:
            raise ValueError("CodeGraph index unhealthy/pending; allow native sync, then use --recover if still stale")
        run([executable, "sync", str(root)], root)
        status = project_status(executable, root)
        if not healthy(status):
            raise ValueError("CodeGraph recovery failed; do not trust or mechanically rebuild index")
    result = json.loads(run([executable, "query", query, "--path", str(root), "--limit", "1", "--json"], root))
    if not isinstance(result, list) or not any(
        isinstance(hit, dict) and isinstance(hit.get("node"), dict) and
        hit["node"].get("name") == query and isinstance(hit["node"].get("filePath"), str) and
        (root / hit["node"]["filePath"]).resolve().is_relative_to(root) and
        (root / hit["node"]["filePath"]).is_file() for hit in result):
        raise ValueError("CodeGraph query did not return the requested source symbol")
    print("codegraph: INITIALIZED_HEALTHY_QUERY_PASS worktree=" + str(root))


def initialize_rtk(executable, root, host, initialize=False):
    if host != "codex":
        raise ValueError("explicit supported project adapter required (--rtk-host codex); other hosts need their documented local adapter")
    # RTK's project adapter follows symlinks; reject escapes before any writes.
    for name in ("AGENTS.md", "RTK.md", ".codex", ".codex/hooks.json", ".codex/hooks.json.bak"):
        path = root / name
        if not path.resolve().is_relative_to(root):
            raise ValueError(f"RTK project path escapes worktree: {name}")
    hooks = root / ".codex/hooks.json"
    if not hooks.is_file():
        if not initialize:
            raise ValueError("RTK project adapter uninitialized; rerun with --initialize")
        if (root / "RTK.md").exists():
            raise ValueError("existing RTK.md requires review before adapter initialization")
        run([executable, "init", "--codex"], root)
    config = json.loads(hooks.read_text())
    if "rtk" not in json.dumps(config).lower():
        raise ValueError("project hook does not identify RTK; native Host smoke test required")
    run([executable, "methods", "list"], root)
    raw = run(["git", "log", "-5"], root)
    compressed = run([executable, "git", "log", "-5"], root)
    if not compressed.strip() or len(compressed) >= len(raw):
        raise ValueError("representative git log output compression not demonstrated")
    failure = subprocess.run([executable, "run", sys.executable, "-c",
                              "import sys; print('ADS_FAILURE_SENTINEL', flush=True); sys.exit(7)"],
                             cwd=root, capture_output=True, text=True, timeout=30)
    if failure.returncode != 7 or "ADS_FAILURE_SENTINEL" not in failure.stdout + failure.stderr:
        raise ValueError("RTK did not preserve failure exit code and diagnostic")
    print(f"rtk: FULL_PROJECT_ADAPTER_COMPRESSION_FAILURE_PASS bytes={len(raw)}->{len(compressed)}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--production-branch", default="main")
    parser.add_argument("--codegraph-source-sha")
    parser.add_argument("--evidence", type=Path, help="Independently verified installation/license evidence, bound to executable hashes")
    parser.add_argument("--query", help="Known source symbol that must be found in the current worktree")
    parser.add_argument("--initialize", action="store_true", help="Initialize missing project integration only; never install global tools")
    parser.add_argument("--recover", action="store_true", help="Sync only after observed unhealthy status; never blindly reindex")
    parser.add_argument("--rtk-host", choices=["codex"])
    args = parser.parse_args(argv)
    root = args.root.resolve()
    try:
        branch = run(["git", "branch", "--show-current"], root).strip()
        if not branch or branch == args.production_branch:
            raise ValueError("run consumer initialization on a development branch, never detached/production")
        installed = {}
        for tool in UPSTREAMS:
            try:
                executable = shutil.which(tool)
                if not executable:
                    raise FileNotFoundError(tool)
                installed[tool] = executable
            except FileNotFoundError:
                print(f"{tool}: MISSING — Ask the user before installing. No global changes performed.")
        if len(installed) != 2:
            return 1
        if not args.evidence or not args.query:
            raise ValueError("--evidence and --query are required; version strings alone cannot verify provenance")
        evidence_path = args.evidence.resolve()
        evidence = json.loads(evidence_path.read_text())
        license_result = load_policy_module("check-license-compliance").inspect(evidence, evidence_path.parent)
        if license_result["errors"]:
            raise ValueError("; ".join(license_result["errors"]))
        for tool, executable in installed.items():
            verify_executable(evidence["tools"][tool], executable)
        channel_module = load_policy_module("check-codegraph-channel")
        channel = channel_module.observe_channel(args.codegraph_source_sha)
        tools = evidence["tools"]
        if channel["channel"] == "SOURCE_FALLBACK":
            permitted, reason = channel_module.evaluate_source_pin(channel, args.codegraph_source_sha)
            if not permitted or tools["codegraph"].get("source_sha") != args.codegraph_source_sha:
                raise ValueError("CodeGraph source fallback unauthorized: " + reason)
            print("codegraph: SOURCE_FALLBACK_APPROVED — immutable reviewed source; not latest stable")
        elif tools["codegraph"].get("source_sha"):
            raise ValueError("official stable channel exists; review source fallback migration")
        # The supported source recipe executes its direct built CLI, never a downloading shim.
        if channel["channel"] == "SOURCE_FALLBACK":
            entry = Path(installed["codegraph"]).resolve()
            if entry.parts[-3:] != ("dist", "bin", "codegraph.js"):
                raise ValueError("source fallback requires direct dist/bin/codegraph.js; npm shims/wrappers unsupported")
            source_root = entry.parents[2]
            package = json.loads((source_root / "package.json").read_text())
            if package.get("name") != "@andysom25/codegraph" or run(["git", "rev-parse", "HEAD"], source_root).strip() != args.codegraph_source_sha:
                raise ValueError("source CLI checkout identity differs from reviewed pin")
        for tool, executable in list(installed.items()):
            version, active = installed_version(tool)
            if Path(active).resolve() != Path(executable).resolve():
                raise ValueError(f"{tool}: PATH changed during preflight")
            installed[tool] = (version, executable)
            item = tools[tool]
            if version != item["version"]:
                raise ValueError(f"{tool}: active version differs from provenance evidence")
        if installed["codegraph"][0] != channel["version"]:
            raise ValueError("CodeGraph version differs from verified official channel")
        latest, _ = latest_stable(UPSTREAMS["rtk"][1])
        if installed["rtk"][0] != latest:
            raise ValueError(f"RTK OUTDATED: installed={installed['rtk'][0]}, latest={latest}; obtain authorization before updating")
        initialize_codegraph(installed["codegraph"][1], root, args.query, args.initialize, args.recover)
        initialize_rtk(installed["rtk"][1], root, args.rtk_host, args.initialize)
    except (OSError, ValueError, KeyError, TypeError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 1
    print("CLI_PASS_HOST_UNVERIFIED: verify CodeGraph query and RTK hook interception through the active Agent Host; project configuration is not live Host evidence.")
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
