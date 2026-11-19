#!/usr/bin/env python3
"""Check README and CHANGELOG claims against the release tag that triggered this run."""
import argparse
import os
from pathlib import Path
import sys

from release_status import repository_release_errors


ROOT = Path(__file__).resolve().parents[1]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tag', nargs='?', default=os.environ.get('GITHUB_REF_NAME'))
    parser.add_argument('--root', type=Path, default=ROOT, help='repository checkout (for isolated verification)')
    args = parser.parse_args(argv)
    if not args.tag:
        parser.error('provide the vX.Y.Z release tag or run from a tag workflow')

    errors = repository_release_errors(args.root, args.tag)
    if errors:
        for error in errors:
            print(f'FAIL: {error}', file=sys.stderr)
        return 1
    print(f'release-status: README and CHANGELOG match {args.tag}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
