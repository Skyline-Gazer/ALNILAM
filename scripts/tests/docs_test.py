"""Check tracked Markdown file links without adding a documentation framework."""
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def broken_links(root, files):
    errors = []
    for relative in files:
        source = root / relative
        for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)', source.read_text()):
            target = target.strip('<>')
            url = urlsplit(target)
            if url.scheme or not url.path or target.startswith('/'):
                continue
            if not (source.parent / unquote(url.path)).exists():
                errors.append(f'{relative}: {target}')
    return errors


class DocsTests(unittest.TestCase):
    def test_tracked_markdown_links(self):
        files = subprocess.check_output(['git', 'ls-files', '*.md'], cwd=ROOT, text=True).splitlines()
        self.assertEqual(broken_links(ROOT, files), [])

    def test_missing_link_is_rejected_and_anchor_is_allowed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.md').write_text('[bad](missing.md) [local](#anchor) [web](https://example.com)')
            self.assertEqual(broken_links(root, ['index.md']), ['index.md: missing.md'])


if __name__ == '__main__':
    unittest.main()
