"""Check tracked Markdown file links without adding a documentation framework."""
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]

CURRENT_DOCS = (
    'README.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'SECURITY.md',
    'docs/MAINTAINERS.md',
    'docs/SITE_ONBOARDING.md',
)


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

def command_example_errors(root, files):
    scripts = json.loads((root / 'package.json').read_text()).get('scripts', {})
    builtins = {'install', 'exec', 'dlx', 'audit', 'add', 'remove', 'update', 'list', 'why', 'store'}
    errors = []
    for relative in files:
        text = (root / relative).read_text()
        for block in re.findall(r'```(?:bash|sh)\s*\n(.*?)\n```', text, re.S):
            for line in block.splitlines():
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?pnpm\s+(?:run\s+)?([A-Za-z][\w:-]*)\b', line):
                    command = match.group(1)
                    if command not in builtins and command not in scripts:
                        errors.append(f'{relative}: unknown pnpm script {command}')
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?node\s+(scripts/[^\s`]+)', line):
                    if not (root / match.group(1)).is_file():
                        errors.append(f'{relative}: missing command target {match.group(1)}')
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?python3\s+-m\s+unittest\s+discover\s+-s\s+(\S+)', line):
                    if not (root / match.group(1)).is_dir():
                        errors.append(f'{relative}: missing unittest directory {match.group(1)}')
    return errors


def invalid_site_config_examples(root, files, core_root):
    examples = []
    pattern = re.compile(r'```yaml\s+site-config[^\n]*\n(.*?)\n```', re.S)
    for relative in files:
        for index, content in enumerate(pattern.findall((root / relative).read_text()), start=1):
            examples.append({'filename': f'{relative} example {index}', 'content': content})
    if not examples:
        return ['no complete YAML Site config examples marked `yaml site-config`']
    validator = '''
import { readFileSync } from "node:fs";
import { normalizeSiteConfig, parseSiteConfigDocument } from "./packages/core/src/index.mjs";
for (const example of JSON.parse(readFileSync(0, "utf8"))) {
  try {
    normalizeSiteConfig(parseSiteConfigDocument(example.content, { filename: example.filename }));
  } catch (error) {
    console.error(`${example.filename}: ${error.message}`);
    process.exitCode = 1;
  }
}
'''
    result = subprocess.run(
        ['node', '--input-type=module', '-e', validator],
        cwd=core_root,
        input=json.dumps(examples),
        text=True,
        capture_output=True,
        timeout=30,
    )
    if result.returncode == 0:
        return []
    return [line for line in result.stderr.splitlines() if line.strip()] or [f'Core config validator exited {result.returncode}']


def stale_cnb_claims(text):
    active = re.compile(r'\b(?:active|current|primary|required|target-owned|publishes?|runs? on|validation|gate)\b', re.I)
    historical = re.compile(r'\b(?:frozen|historical|not|never|no longer|does not|do not|without|reject(?:s|ion)?)\b', re.I)
    return [
        line.strip()
        for line in text.splitlines()
        if re.search(r'\bCNB\b', line, re.I)
        and not re.search(r'\bADS\b', line, re.I)
        and active.search(line)
        and not historical.search(line)
    ]


def deployment_guidance_errors(readme, handoff):
    section = re.search(r'(?ms)^### Vercel topology and current exposure\s*\n(.*?)(?=^### |^## |\Z)', handoff)
    if section is None:
        return ['HANDOFF: current Vercel evidence section is missing']
    demo = re.search(r'existing public Demo project .*? on GitHub `([^`]+)`', section.group(1), re.S)
    production = re.search(r'Separate project `([^`]+)`.*?productionBranch=([A-Za-z0-9_-]+)', section.group(1), re.S)
    line = next((line for line in readme.splitlines() if line.startswith('- Vercel:')), '')
    if demo is None or production is None or not line:
        return ['README/HANDOFF: current Vercel branch facts are incomplete']
    demo_doc = re.search(r'Demo project.*?GitHub `([^`]+)`', line)
    production_doc = re.search(r'separate `([^`]+)` tracks `([^`]+)`', line, re.I)
    errors = []
    if demo_doc is None or demo_doc.group(1) != demo.group(1):
        errors.append('README: Demo branch disagrees with current HANDOFF evidence')
    if production_doc is None or production_doc.groups() != production.groups():
        errors.append('README: production project or branch disagrees with current HANDOFF evidence')
    if re.search(r'\bSSO\b', section.group(1)) and not re.search(r'\bSSO\b', line):
        errors.append('README: current SSO protection is omitted')
    return errors


def release_status_errors(readme, changelog):
    releases = re.findall(r'(?m)^## \[(\d+\.\d+\.\d+)\]', changelog)
    claims = set(re.findall(r'\bReleased\s+v(\d+\.\d+\.\d+)\b', readme, re.I))
    claims.update(re.findall(r'\bv(\d+\.\d+\.\d+)\s+is released\b', readme, re.I))
    if not releases:
        return ['CHANGELOG: no released version heading found']
    if claims != {releases[0]}:
        return [f'README release versions {sorted(claims)} disagree with latest CHANGELOG version {releases[0]}']
    return []


def plan_disclaims_implementation_status(text):
    header = text.split('\n## ', 1)[0]
    return bool(re.search(r'\b(?:not|do not|does not)\b.{0,120}\b(?:implemented|implementation|shipped|production-release)\b', header, re.I))



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

    def test_documented_commands_resolve_and_invalid_examples_are_rejected(self):
        self.assertEqual(command_example_errors(ROOT, CURRENT_DOCS), [])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'package.json').write_text('{"scripts":{"test":"node --test"}}')
            (root / 'README.md').write_text('```bash\npnpm missing-script\nnode scripts/missing.mjs\n```')
            self.assertEqual(len(command_example_errors(root, ['README.md'])), 2)

    def test_full_site_config_examples_use_the_current_core_contract(self):
        self.assertEqual(invalid_site_config_examples(ROOT, ['docs/SITE_ONBOARDING.md'], ROOT), [])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docs = root / 'docs'
            docs.mkdir()
            (docs / 'bad.md').write_text('```yaml site-config\nschemaVersion: 1\nsite:\n  title: Example\n  url: https://example.com\n```')
            self.assertTrue(invalid_site_config_examples(root, ['docs/bad.md'], ROOT))

    def test_current_authority_deployment_release_and_plan_claims_are_checked(self):
        readme = (ROOT / 'README.md').read_text()
        changelog = (ROOT / 'CHANGELOG.md').read_text()
        handoff = (ROOT / 'docs' / 'HANDOFF.md').read_text()
        current_changelog = changelog.split('## [Unreleased]', 1)[1].split('\n## [', 1)[0]
        authority_docs = '\n'.join([
            readme,
            (ROOT / 'CONTRIBUTING.md').read_text(),
            (ROOT / 'docs' / 'MAINTAINERS.md').read_text(),
            current_changelog,
        ])
        self.assertEqual(stale_cnb_claims(authority_docs), [])
        self.assertTrue(stale_cnb_claims('CNB is the active validation provider.'))
        self.assertEqual(deployment_guidance_errors(readme, handoff), [])
        wrong_branches = readme.replace('Demo project remains on GitHub `dev`', 'Demo project remains on GitHub `main`').replace('tracks `main`', 'tracks `dev`')
        self.assertTrue(deployment_guidance_errors(wrong_branches, handoff))
        self.assertEqual(release_status_errors(readme, changelog), [])
        self.assertTrue(release_status_errors('v0.1.4 is released', changelog))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '00-PLAN.md').read_text()))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '01-SPEC.md').read_text()))
        self.assertFalse(plan_disclaims_implementation_status('# Plan\n\nP1 is implemented.'))


if __name__ == '__main__':
    unittest.main()
