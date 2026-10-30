"""Exercise the ADS pin check against actual Git trees."""
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "check-ads-pin.sh"
PIN = "375fc71f977c40c2053140c34431cc60a6d42883"
OLD_PIN = "1e07d6c4bbd296b7d37dcd31934cfc70426f73ac"


class AdsPinTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "ADS pin fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        (self.root / "product.txt").write_text("fixture\n")
        self.git("add", "product.txt")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True, text=True)

    def check_candidate(self, branch, pin=None, regular_file=False):
        if pin:
            self.git("update-index", "--add", "--cacheinfo", f"160000,{pin},.ads")
        elif regular_file:
            (self.root / ".ads").write_text("not a gitlink\n")
            self.git("add", ".ads")
        self.git("commit", "-qm", "fixture")
        return subprocess.run(["sh", str(SCRIPT), branch], cwd=self.root, capture_output=True, text=True)

    def test_production_candidate_may_omit_the_gitlink(self):
        self.assertEqual(self.check_candidate("main").returncode, 0)

    def test_development_candidate_requires_the_gitlink(self):
        self.assertNotEqual(self.check_candidate("dev").returncode, 0)

    def test_correct_pin_passes_on_development_and_production(self):
        self.git("update-index", "--add", "--cacheinfo", f"160000,{PIN},.ads")
        self.git("commit", "-qm", "fixture")
        for branch in ("dev", "main"):
            with self.subTest(branch=branch):
                result = subprocess.run(["sh", str(SCRIPT), branch], cwd=self.root, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_old_pin_is_rejected_on_production(self):
        self.assertNotEqual(self.check_candidate("main", pin=OLD_PIN).returncode, 0)

    def test_non_gitlink_ads_path_is_rejected_on_production(self):
        self.assertNotEqual(self.check_candidate("main", regular_file=True).returncode, 0)


if __name__ == "__main__":
    unittest.main()
