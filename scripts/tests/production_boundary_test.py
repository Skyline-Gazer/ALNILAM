"""Tests for the consumer-project production-boundary template."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "check-ads-devtools-boundary.py"


class ConsumerDevtoolsBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, relative, content="fixture"):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def run_guard(self, branch="main", *extra, root=None):
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--root",
                str(root or self.root),
                "--target-branch",
                branch,
                *extra,
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_clean_production_tree_passes(self):
        self.write("src/app.py", "def main(): return 1\n")
        result = self.run_guard()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_consumer_manifest_and_generated_index_fail_on_main(self):
        self.write(
            ".ads-devtools.json",
            '{"dev_only_paths":[".claude/settings.json"]}',
        )
        self.write(".codegraph/index.sqlite", "generated")
        self.write(".claude/settings.json", '{"hooks":{"command":"rtk"}}')
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn(".ads-devtools.json", result.stderr)
        self.assertIn(".codegraph", result.stderr)
        self.assertIn(".claude/settings.json", result.stderr)

    def test_declared_host_path_fails_on_main(self):
        self.write(
            ".ads-devtools.json",
            '{"dev_only_paths":[".claude/settings.json"]}',
        )
        self.write(".claude/settings.json", '{"hooks":{"command":"rtk"}}')
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("declared dev-only path exists", result.stderr)

    def test_development_branch_allows_dev_only_configuration(self):
        self.write(".ads-devtools.json", '{"version_policy":"latest-stable"}')
        self.write(".codegraph/index.sqlite", "generated")
        result = self.run_guard("dev")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS/SKIP", result.stdout)

    def test_unlisted_host_integration_is_detected(self):
        self.write(".codex/config.toml", 'command = "rtk git status"')
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn(".codex/config.toml", result.stderr)

    def test_tool_specific_gitignore_rules_fail_on_main(self):
        self.write(".gitignore", ".codegraph/\n")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("tool-specific generated-data ignore rules", result.stderr)


    def test_codegraph_project_config_and_rtk_instructions_fail_on_main(self):
        self.write("codegraph.json", '{"exclude":["generated/"]}')
        self.write("CLAUDE.md", "Use RTK for all shell commands.\\n")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("codegraph.json", result.stderr)
        self.assertIn("CLAUDE.md", result.stderr)

    def test_generated_rtk_and_sqlite_sidecars_fail_on_main(self):
        self.write("RTK.md", "# Command output\n")
        self.write("AGENTS.md", "@RTK.md\n")
        self.write(".codegraph/codegraph.db-wal", "generated")
        self.write(".codegraph/codegraph.db-shm", "generated")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("RTK.md", result.stderr)
        self.assertIn("AGENTS.md", result.stderr)
        self.assertIn("codegraph.db-wal", result.stderr)
        self.assertIn("codegraph.db-shm", result.stderr)

    def test_codegraph_worktree_directories_fail_on_main(self):
        self.write(".codegraph-task-2/index.json", "generated")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn(".codegraph-task-2", result.stderr)

    def test_symlink_inside_production_tree_is_allowed_on_main(self):
        target = self.write("src/app.py", "def main(): return 1\n")
        (self.root / "src" / "alias.py").symlink_to(target)
        result = self.run_guard()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_escaping_symlink_fails_on_main(self):
        outside = Path(self.temp.name).parent / f"{Path(self.temp.name).name}-outside.txt"
        outside.write_text("outside", encoding="utf-8")
        self.addCleanup(outside.unlink)
        (self.root / "escape.txt").symlink_to(outside)
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("escape.txt", result.stderr)
        self.assertIn("unverified symlink", result.stderr)

    def test_external_manifest_preserves_declared_path_policy(self):
        self.write("src/app.py", "def main(): return 1\n")
        manifest = Path(self.temp.name).parent / f"{Path(self.temp.name).name}-manifest.json"
        manifest.write_text('{"dev_only_paths":["src/app.py"]}', encoding="utf-8")
        self.addCleanup(manifest.unlink)
        result = self.run_guard("main", "--dev-only-manifest", str(manifest))
        self.assertEqual(result.returncode, 1)
        self.assertIn("declared dev-only path exists", result.stderr)

    def test_invalid_external_manifest_fails_closed(self):
        self.write("src/app.py", "def main(): return 1\n")
        manifest = Path(self.temp.name).parent / f"{Path(self.temp.name).name}-manifest.json"
        manifest.write_text('{"dev_only_paths":"not-an-array"}', encoding="utf-8")
        self.addCleanup(manifest.unlink)
        result = self.run_guard("main", "--dev-only-manifest", str(manifest))
        self.assertEqual(result.returncode, 1)
        self.assertIn("trusted development manifest invalid", result.stderr)

    def test_artifact_root_is_scanned_even_for_dev_target(self):
        self.write("src/app.py", "def main(): return 1\n")
        artifact = Path(self.temp.name).parent / f"{Path(self.temp.name).name}-artifact"
        artifact.mkdir()
        (artifact / "RTK.md").write_text("# Command output\n", encoding="utf-8")
        self.addCleanup(lambda: __import__("shutil").rmtree(artifact))
        result = self.run_guard("dev", "--artifact-root", str(artifact))
        self.assertEqual(result.returncode, 1)
        self.assertIn("artifact", result.stderr)
        self.assertIn("RTK.md", result.stderr)

    def test_missing_artifact_root_fails_closed(self):
        self.write("src/app.py", "def main(): return 1\n")
        missing = Path(self.temp.name).parent / f"{Path(self.temp.name).name}-missing-artifact"
        result = self.run_guard("dev", "--artifact-root", str(missing))
        self.assertEqual(result.returncode, 1)
        self.assertIn("expected an existing directory", result.stderr)

    def test_devtools_helper_and_release_workflow_fail_on_main(self):
        self.write("scripts/check-ads-devtools-latest.py", "print('check latest')\\n")
        self.write("scripts/check-ads-devtools-license.py", "print('check license')\\n")
        self.write(".github/workflows/ads-devtools-latest.yml", "name: latest release check\\n")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("check-ads-devtools-latest.py", result.stderr)
        self.assertIn("check-ads-devtools-license.py", result.stderr)
        self.assertIn("ads-devtools-latest.yml", result.stderr)

    def test_custom_production_branch_can_be_selected(self):
        self.write(".ads-devtools.json", '{"version_policy":"latest-stable"}')
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--root",
                str(self.root),
                "--target-branch",
                "production",
                "--production-branch",
                "production",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)


if __name__ == "__main__":
    unittest.main()
