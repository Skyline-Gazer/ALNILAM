"""Exercise the local mirror candidate against real, disposable Git histories."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'cnb-mirror-candidate.py'


class MirrorCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.name', 'Mirror fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.write('product', 'base\n')
        self.base = self.commit('base')
        self.git('checkout', '-qb', 'cnb')
        self.write('product', 'one\n')
        self.source1 = self.commit('CNB release one')

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, capture_output=True, text=True, check=True).stdout.strip()

    def write(self, file, value):
        (self.root / file).write_text(value)

    def commit(self, message):
        self.git('add', '.')
        self.git('commit', '-qm', message)
        return self.git('rev-parse', 'HEAD')

    def prepare(self, source, base, sync=None, ok=True):
        args = [sys.executable, str(SCRIPT), '--source', source, '--base', base]
        if sync:
            args += ['--sync', sync]
        result = subprocess.run(args, cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stderr)
        return json.loads(result.stdout) if ok else result.stderr

    def github_merge(self, base, candidate, tree):
        return self.git('commit-tree', tree, '-p', base, '-p', candidate, '-m', 'GitHub PR merge')

    def test_two_rounds_retry_noop_and_history(self):
        first = self.prepare(self.source1, self.base)
        self.assertEqual(first['status'], 'PREPARED')
        self.assertEqual(self.git('rev-list', '--parents', '-n', '1', first['sync']).split(),
                         [first['sync'], self.base, self.source1])
        main1 = self.github_merge(self.base, first['sync'], first['tree'])
        self.write('product', 'two\n')
        source2 = self.commit('CNB release two')
        second = self.prepare(source2, main1, first['sync'])
        self.assertEqual(second['tree'], self.git('rev-parse', f'{source2}^{{tree}}'))
        self.assertEqual(self.git('rev-list', '--parents', '-n', '1', second['sync']).split(),
                         [second['sync'], main1, source2])
        retry = self.prepare(source2, main1, second['sync'])
        self.assertEqual(retry['status'], 'REUSE')
        self.assertEqual(retry['sync'], second['sync'])
        main2 = self.github_merge(main1, second['sync'], second['tree'])
        self.assertEqual(self.prepare(source2, main2, second['sync'])['status'], 'NOOP')
        self.git('merge-base', '--is-ancestor', self.source1, main2)
        self.git('merge-base', '--is-ancestor', source2, main2)

    def test_github_only_tree_drift_is_rejected(self):
        self.git('checkout', '-qb', 'github', self.base)
        self.write('github-only', 'not approved\n')
        base = self.commit('github-only drift')
        self.assertIn('differs', self.prepare(self.source1, base, ok=False))

    def test_conflict_is_rejected(self):
        self.git('checkout', '-qb', 'github', self.base)
        self.write('product', 'conflict\n')
        base = self.commit('conflicting GitHub edit')
        self.assertIn('conflicted', self.prepare(self.source1, base, ok=False))

    def test_unmerged_sync_for_a_different_source_is_rejected(self):
        first = self.prepare(self.source1, self.base)
        self.write('product', 'two\n')
        source2 = self.commit('CNB release two')
        self.assertIn('unmerged', self.prepare(source2, self.base, first['sync'], ok=False))

    def test_local_custom_merge_driver_is_not_executed(self):
        self.git('checkout', '-qb', 'driver-base', self.base)
        self.write('.gitattributes', 'product merge=fixture\n')
        common = self.commit('driver attribute')
        self.git('checkout', '-qb', 'driver-source', common)
        self.write('product', 'source\n')
        source = self.commit('source edit')
        self.git('checkout', '-qb', 'driver-target', common)
        self.write('product', 'target\n')
        base = self.commit('target edit')
        marker = self.root / 'driver-ran'
        self.git('config', 'merge.fixture.driver', f'touch {marker}')
        self.assertIn('conflicted', self.prepare(source, base, ok=False))
        self.assertFalse(marker.exists())

    def test_bad_sha_is_rejected_without_creating_refs(self):
        before = self.git('show-ref')
        self.assertIn('full lowercase', self.prepare('main', self.base, ok=False))
        self.assertEqual(self.git('show-ref'), before)


if __name__ == '__main__':
    unittest.main()
