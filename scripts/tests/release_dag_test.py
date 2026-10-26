"""Offline Git mechanics, not proof of CNB/GitHub review or permissions."""
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys

GUARD = Path(__file__).resolve().parents[1] / 'check-ads-devtools-boundary.py'


class ReleaseDagTests(unittest.TestCase):
    def test_two_releases_preserve_ancestry_and_recover_interrupted_copy(self):
        with tempfile.TemporaryDirectory(prefix='alnilam-dag-') as directory:
            root = Path(directory)
            work = root / 'work'
            work.mkdir()

            def git(*args, ok=True):
                result = subprocess.run(['git', '-C', str(work), *args], capture_output=True, text=True)
                if ok:
                    self.assertEqual(result.returncode, 0, result.stderr)
                else:
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                return result.stdout.strip()

            def commit(message):
                git('add', 'product.txt', '.ads-devtools.json') if (work / '.ads-devtools.json').exists() else git('add', '-u')
                git('commit', '-qm', message)
                return git('rev-parse', 'HEAD')

            git('init', '-q', '-b', 'main')
            git('config', 'user.name', 'P0 offline fixture')
            git('config', 'user.email', 'p0@example.invalid')
            (work / 'product.txt').write_text('baseline\n')
            git('add', 'product.txt')
            git('commit', '-qm', 'baseline')
            baseline = git('rev-parse', 'HEAD')
            for remote in ('cnb', 'github'):
                subprocess.run(['git', 'init', '-q', '--bare', str(root / remote)], check=True)
                git('remote', 'add', remote, str(root / remote))
                git('push', remote, 'HEAD:refs/heads/main', 'HEAD:refs/heads/dev')
            git('branch', 'github-dev')
            git('branch', 'github-main')
            git('checkout', '-qb', 'cnb-dev')
            (work / '.ads-devtools.json').write_text('{"dev_only_paths":[]}\n')
            commit('development tools only')
            releases = []
            for round_number in (1, 2):
                git('checkout', '-qb', f'feature-{round_number}')
                with (work / 'product.txt').open('a') as stream:
                    stream.write(f'feature {round_number}\n')
                commit(f'feature {round_number}')
                git('checkout', 'cnb-dev')
                git('merge', '--no-ff', '-m', 'simulate reviewed feature PR', f'feature-{round_number}')
                git('checkout', '-qb', f'prepare-{round_number}')
                git('rm', '.ads-devtools.json')
                git('commit', '-qm', 'prepare production candidate without developer configuration')
                git('checkout', 'cnb-dev')
                git('merge', '--no-ff', '-m', 'simulate reviewed preparation PR', f'prepare-{round_number}')
                frozen = git('rev-parse', 'HEAD')
                git('push', 'cnb', 'HEAD:refs/heads/dev')
                transport = f'refs/heads/release/cnb-{frozen}'
                git('push', 'github', f'{frozen}:{transport}')
                git('checkout', 'github-dev')
                git('merge', '--no-ff', '-m', 'simulate GitHub transfer PR', frozen)
                git('push', 'github', 'HEAD:refs/heads/dev')
                git('checkout', 'github-main')
                git('merge', '--no-ff', '-m', 'simulate Owner-approved release PR', 'github-dev')
                release = git('rev-parse', 'HEAD')
                self.assertNotEqual(release, frozen)
                self.assertEqual(git('rev-parse', f'{release}^{{tree}}'), git('rev-parse', f'{frozen}^{{tree}}'))
                self.assertNotIn('.ads-devtools.json', git('ls-tree', '-r', '--name-only', release))
                subprocess.run([sys.executable, str(GUARD), '--root', str(work), '--target-branch', 'main'], check=True)
                git('push', 'github', 'HEAD:refs/heads/main')
                tag = f'v0.0.{round_number}-pilot'
                git('tag', '-a', tag, '-m', 'offline fixture only')
                git('push', 'github', f'refs/tags/{tag}:refs/tags/{tag}')
                # Inject interruption after the branch copy, before the tag copy.
                git('push', 'cnb', f'{release}:refs/heads/main')
                self.assertNotIn(tag, git('ls-remote', '--tags', 'cnb'))
                # Retry exact explicit refs: branch is idempotent, tag completes.
                git('push', 'cnb', f'{release}:refs/heads/main', f'refs/tags/{tag}:refs/tags/{tag}')
                refs = git('ls-remote', 'cnb')
                git('push', 'cnb', f'{release}:refs/heads/main', f'refs/tags/{tag}:refs/tags/{tag}')
                self.assertEqual(refs, git('ls-remote', 'cnb'))
                self.assertEqual(git('ls-remote', 'github', f'refs/tags/{tag}'), git('ls-remote', 'cnb', f'refs/tags/{tag}'))
                # Negative pushes must preserve all refs: no force, no tag replacement.
                git('push', 'cnb', f'{baseline}:refs/heads/main', ok=False)
                git('push', 'cnb', f'{baseline}:refs/tags/{tag}', ok=False)
                self.assertEqual(refs, git('ls-remote', 'cnb'))
                git('checkout', 'cnb-dev')
                git('merge', '--no-ff', '-m', 'simulate reviewed release reconciliation PR', release)
                git('merge-base', '--is-ancestor', release, 'HEAD')
                if releases:
                    git('merge-base', '--is-ancestor', releases[-1], frozen)
                    self.assertEqual(git('diff', '--unified=0', releases[-1], release, '--', 'product.txt').splitlines()[-1], '+feature 2')
                releases.append(release)
                (work / '.ads-devtools.json').write_text('{"dev_only_paths":[]}\n')
                commit('restore development-only tooling after reconciliation')
                git('push', 'cnb', 'HEAD:refs/heads/dev')
            self.assertEqual((work / 'product.txt').read_text(), 'baseline\nfeature 1\nfeature 2\n')
            print('OFFLINE_DAG_PASS: 2 releases; ancestry/tree/tag/idempotence/interruption/non-fast-forward checks')
            print(git('log', '--graph', '--oneline', '--all'))


if __name__ == '__main__':
    unittest.main()
