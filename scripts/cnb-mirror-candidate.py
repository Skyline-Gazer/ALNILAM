#!/usr/bin/env python3
"""Prepare a local history-preserving mirror candidate; never update refs."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

SHA = re.compile(r"[a-f0-9]{40}\Z")


def run(args, *, cwd=None, env=None, payload=None, check=True):
    try:
        result = subprocess.run(args, cwd=cwd, env=env, input=payload, capture_output=True, check=False, timeout=30)
    except subprocess.TimeoutExpired as exc:
        raise ValueError('local Git operation timed out') from exc
    if check and result.returncode:
        raise ValueError(f"git {args[1]} failed (exit {result.returncode})")
    return result


def git(*args, cwd=None, env=None, payload=None, check=True):
    return run(['git', *args], cwd=cwd, env=env, payload=payload, check=check)


def output(result):
    return result.stdout.decode('utf-8').strip()


def prepare(source, base, sync=None):
    for value in (source, base, sync):
        if value is not None and not SHA.fullmatch(value):
            raise ValueError('source, base, and sync must be full lowercase commit SHAs')
    for value in (source, base, sync):
        if value is not None and output(git('rev-parse', '--verify', f'{value}^{{commit}}')) != value:
            raise ValueError('input is not the exact commit')
    objects = Path(output(git('rev-parse', '--git-path', 'objects'))).resolve(strict=True)
    if any(character in str(objects) for character in ('\n', '\r')):
        raise ValueError('Git object directory contains a line break')
    source_tree = output(git('rev-parse', f'{source}^{{tree}}'))
    base_tree = output(git('rev-parse', f'{base}^{{tree}}'))

    # A bare throwaway repository avoids the consumer's hooks and merge drivers.
    with tempfile.TemporaryDirectory(prefix='alnilam-mirror-') as directory:
        bare = Path(directory) / 'repo.git'
        template = Path(directory) / 'empty-template'
        template.mkdir()
        env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_SYSTEM': os.devnull,
               'GIT_CONFIG_NOSYSTEM': '1', 'GIT_ATTR_NOSYSTEM': '1', 'GIT_TEMPLATE_DIR': str(template)}
        for key in list(env):
            if key in {'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
                       'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS',
                       'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_EXEC_PATH'} or key.startswith(('GIT_CONFIG_KEY_', 'GIT_CONFIG_VALUE_')):
                env.pop(key)
        git('init', '--bare', '-q', str(bare), env=env)
        (bare / 'objects/info/alternates').write_text(str(objects) + '\n')

        def isolated(*args, payload=None, check=True):
            return git('--git-dir', str(bare), *args, env=env, payload=payload, check=check)

        def ancestor(old, new):
            result = isolated('merge-base', '--is-ancestor', old, new, check=False)
            if result.returncode not in (0, 1):
                raise ValueError('cannot determine commit ancestry')
            return result.returncode == 0

        if sync and not ancestor(sync, base):
            parents = output(isolated('rev-list', '--parents', '-n', '1', sync)).split()
            tree = output(isolated('rev-parse', f'{sync}^{{tree}}'))
            if parents == [sync, base, source] and tree == source_tree:
                return {'status': 'REUSE', 'source': source, 'base': base, 'sync': sync, 'tree': tree}
            raise ValueError('previous sync is unmerged or does not match this release')
        if ancestor(source, base):
            if source_tree != base_tree:
                raise ValueError('GitHub base tree differs from the approved source tree')
            return {'status': 'NOOP', 'source': source, 'base': base, 'sync': sync, 'tree': source_tree}

        merged = isolated('merge-tree', '--write-tree', base, source, check=False)
        if merged.returncode:
            raise ValueError('Git merge conflicted or has no common history')
        tree = output(merged).splitlines()[0]
        if tree != source_tree:
            raise ValueError('merged tree differs from the approved source tree')

        name = output(git('config', '--get', 'user.name'))
        email = output(git('config', '--get', 'user.email'))
        if not name or not email:
            raise ValueError('Git user.name and user.email are required')
        message = f'Prepare CNB mirror candidate for {source}\n'.encode()
        candidate = output(isolated('-c', f'user.name={name}', '-c', f'user.email={email}',
                                    'commit-tree', tree, '-p', base, '-p', source, payload=message))
        raw = isolated('cat-file', 'commit', candidate).stdout
        stored = output(git('hash-object', '-t', 'commit', '-w', '--stdin', payload=raw))
        if stored != candidate:
            raise ValueError('candidate object verification failed')
        return {'status': 'PREPARED', 'source': source, 'base': base, 'sync': candidate, 'tree': tree}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, help='approved CNB commit already present locally')
    parser.add_argument('--base', required=True, help='current GitHub main commit already present locally')
    parser.add_argument('--sync', help='existing sync branch head, if present')
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.source, args.base, args.sync), sort_keys=True))
    except (OSError, UnicodeError, ValueError) as exc:
        print(f'MIRROR_CANDIDATE_BLOCKED: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
