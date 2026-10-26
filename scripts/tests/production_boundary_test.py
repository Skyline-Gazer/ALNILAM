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

    def run_guard(self, branch="main"):
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--root",
                str(self.root),
                "--target-branch",
                branch,
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

    def test_devtools_helper_and_release_workflow_fail_on_main(self):
        self.write("scripts/check-ads-devtools-latest.py", "print('check latest')\\n")
        self.write(".github/workflows/ads-devtools-latest.yml", "name: latest release check\\n")
        result = self.run_guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("check-ads-devtools-latest.py", result.stderr)
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
