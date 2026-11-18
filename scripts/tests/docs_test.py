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

def duplicate_adr_ids(root):
    seen = set()
    duplicates = set()
    for path in sorted((root / 'docs' / 'adr').glob('*.md')):
        match = re.match(r'^(\d{4})-', path.name)
        if match is None:
            continue
        identifier = match.group(1)
        if identifier in seen:
            duplicates.add(identifier)
        seen.add(identifier)
    return sorted(duplicates)


class DocsTests(unittest.TestCase):
    def test_tracked_markdown_links(self):
        try:
            files = subprocess.check_output(['git', 'ls-files', '*.md'], cwd=ROOT, text=True).splitlines()
        except FileNotFoundError as error:
            self.fail(f'git binary unavailable for docs link inventory: {error}')
        except subprocess.CalledProcessError as error:
            self.fail(f'git ls-files failed for docs link inventory: {error}')
        self.assertTrue(files, 'No tracked Markdown files found')
        self.assertEqual(broken_links(ROOT, files), [])

    def test_missing_link_is_rejected_and_anchor_is_allowed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.md').write_text('[bad](missing.md) [local](#anchor) [web](https://example.com)')
            self.assertEqual(broken_links(root, ['index.md']), ['index.md: missing.md'])

    def test_adr_identifiers_are_unique_and_duplicate_ids_are_rejected(self):
        self.assertEqual(duplicate_adr_ids(ROOT), [])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            adr_dir = root / 'docs' / 'adr'
            adr_dir.mkdir(parents=True)
            (adr_dir / '0001-first.md').write_text('# ADR 0001 — first')
            (adr_dir / '0001-second.md').write_text('# ADR 0001 — second')
            self.assertEqual(duplicate_adr_ids(root), ['0001'])


if __name__ == '__main__':
    unittest.main()
