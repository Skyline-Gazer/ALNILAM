"""Prepare audited immutable source references; never execute their scripts."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

SOURCES = [
    ('Shirone', 'LyraVoid/Shirone', '55a84b2322bdfb634a59ca6383bb242e5ce646bf'),
    ('Firefly', 'CuteLeaf/Firefly', 'cd920b035b475fe9a6cd3a88afb42cf9440bb8a9'),
    ('KIRARI', 'markd3ng/KIRARI', '5700bcdeb965de87a1818d5d9aec6bf8e227523d'),
    ('Mizuki', 'matsuzaka-yuki/Mizuki', '14da4262d8aa1d93dc8cff11705f14918ed7369f'),
    ('ALNILAM-v0.1.3', 'Skyline-Gazer/ALNILAM', '07fac43cba0c3d303c930c098b6e2124b2c79e4a'),
]


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True).strip()


def prepare(root):
    root.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, repo, sha in SOURCES:
        target = root / name
        remote = f'https://github.com/{repo}.git'
        if not target.exists():
            subprocess.run(['git', 'init', '-q', str(target)], check=True)
            git(target, 'remote', 'add', 'origin', remote)
            git(target, 'fetch', '--depth=1', 'origin', sha)
            git(target, 'checkout', '--detach', sha)
        assert git(target, 'remote', 'get-url', 'origin') == remote, name
        assert git(target, 'rev-parse', 'HEAD') == sha, name
        assert not git(target, 'status', '--porcelain'), f'{name}: dirty reference'
        assert subprocess.run(['git', '-C', str(target), 'symbolic-ref', '-q', 'HEAD'], capture_output=True).returncode == 1
        licenses = {str(p.relative_to(target)): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in target.iterdir() if p.is_file() and p.name.startswith(('LICENSE', 'NOTICE', 'COPYING'))}
        assert licenses, f'{name}: no license evidence'
        manifest.append({'name': name, 'remote': remote, 'sha': sha, 'detached': True, 'clean': True, 'licenses_sha256': licenses})
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    root = Path(sys.argv[1]).resolve()
    core = Path(__file__).resolve().parents[2]
    assert root != core and not root.is_relative_to(core), 'references must stay outside Core'
    print(json.dumps(prepare(root), indent=2))
