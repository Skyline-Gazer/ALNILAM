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
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?pnpm\s+(?:(run)\s+)?([A-Za-z][\w:-]*)\b', line):
                    command = match.group(2)
                    if command not in scripts and (match.group(1) is not None or command not in builtins):
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
    pattern = re.compile(r'^ {0,3}```yaml\s+site-config[^\n]*\n(.*?)\n {0,3}```[ \t]*(?:\n|$)', re.M | re.S)
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
        and active.search(line)
        and not historical.search(line)
    ]


def deployment_guidance_errors(readme, handoff):
    updates = list(re.finditer(
        r'^## Live-state update[ \t]*[—–-][ \t]*(\d{4}-\d{2}-\d{2})[^\n]*\n(.*?)(?=^## |\Z)',
        handoff,
        re.M | re.S,
    ))
    if not updates:
        return ['HANDOFF: current Vercel evidence section is missing']
    latest_date = max(update.group(1) for update in updates)
    current_updates = [update for update in updates if update.group(1) == latest_date]
    if len(current_updates) != 1:
        return ['HANDOFF: current Vercel evidence section is ambiguous']
    section = re.search(
        r'^### Vercel topology and current exposure[ \t]*\n(.*?)(?=^### |\Z)',
        current_updates[0].group(2),
        re.M | re.S,
    )
    if section is None:
        return ['HANDOFF: current Vercel evidence section is missing']
    current = section.group(1)
    demo = re.search(r'existing public Demo project .*? on GitHub `([^`]+)`', current, re.S | re.I)
    production = re.search(r'Separate project `([^`]+)`.*?productionBranch=([A-Za-z0-9_-]+)', current, re.S | re.I)
    line = next((line for line in readme.splitlines() if line.startswith('- Vercel:')), '')
    if demo is None or production is None or not line:
        return ['README/HANDOFF: current Vercel branch facts are incomplete']
    demo_doc = re.search(r'Demo project.*?GitHub `([^`]+)`', line, re.I)
    production_doc = re.search(r'separate `([^`]+)` tracks `([^`]+)`', line, re.I)
    sso_doc = re.search(r'separate `([^`]+)` tracks `([^`]+)` with SSO protection\b', line, re.I)
    errors = []
    if demo_doc is None or demo_doc.group(1) != demo.group(1):
        errors.append('README: Demo branch disagrees with current HANDOFF evidence')
    if production_doc is None or production_doc.groups() != production.groups():
        errors.append('README: production project or branch disagrees with current HANDOFF evidence')
    if re.search(r'\bSSO\b', current, re.I) and (sso_doc is None or sso_doc.groups() != production.groups()):
        errors.append('README: current SSO protection is omitted or denied')
    return errors


def latest_published_version(root):
    result = subprocess.run(
        ['git', 'describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', 'refs/remotes/origin/main'],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=30,
    )
    if result.returncode != 0:
        return None
    match = re.fullmatch(r'v(\d+\.\d+\.\d+)', result.stdout.strip())
    return match.group(1) if match else None


def release_status_errors(readme, changelog, published_version):
    releases = re.findall(r'(?m)^## \[(\d+\.\d+\.\d+)\]', changelog)
    claims = set(re.findall(r'\bReleased\s+v(\d+\.\d+\.\d+)\b', readme, re.I))
    claims.update(re.findall(r'\bv(\d+\.\d+\.\d+)\s+is released\b', readme, re.I))
    if published_version is None:
        return ['Git: latest published release tag on origin/main is unavailable']
    if published_version not in releases:
        return [f'CHANGELOG: published tag v{published_version} has no release heading']
    if claims != {published_version}:
        return [f'README release versions {sorted(claims)} disagree with latest published Git tag v{published_version}']
    return []


def plan_disclaims_implementation_status(text):
    header = text.split('\n## ', 1)[0]
    disclaimers = (
        r'\bnot\s+(?:yet\s+)?implemented\b',
        r'\bnot\s+a\s+production[- ]release\s+authorization\b',
        r'\b(?:requirements?|targets?)\b.{0,120}\bdo not by themselves establish current implementation\b',
        r'\b(?:requirements?|targets?)\b.{0,120}\bnot features? already shipped\b',
    )
    return any(re.search(pattern, header, re.I) for pattern in disclaimers)



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
            (root / 'README.md').write_text('```bash\npnpm install\npnpm run install\npnpm missing-script\nnode scripts/missing.mjs\n```')
            self.assertEqual(command_example_errors(root, ['README.md']), [
                'README.md: unknown pnpm script install',
                'README.md: unknown pnpm script missing-script',
                'README.md: missing command target scripts/missing.mjs',
            ])

    def test_full_site_config_examples_use_the_current_core_contract(self):
        self.assertEqual(invalid_site_config_examples(ROOT, ['docs/SITE_ONBOARDING.md'], ROOT), [])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docs = root / 'docs'
            docs.mkdir()
            (docs / 'bad.md').write_text('```yaml site-config\nschemaVersion: 1\nsite:\n  title: Example\n  url: https://example.com\n```')
            self.assertTrue(invalid_site_config_examples(root, ['docs/bad.md'], ROOT))
            valid_yaml = (ROOT / 'sites/demo/alnilam.config.yaml').read_text().rstrip()
            (docs / 'indented-close.md').write_text(f'```yaml site-config\n{valid_yaml}\n  ```\n')
            self.assertEqual(invalid_site_config_examples(root, ['docs/indented-close.md'], ROOT), [])

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
        self.assertEqual(stale_cnb_claims('The ADS pin records a frozen CNB development commit.'), [])
        self.assertTrue(stale_cnb_claims('CNB is the required validation provider; ADS is optional.'))
        self.assertEqual(deployment_guidance_errors(readme, handoff), [])
        wrong_branches = readme.replace('Demo project remains on GitHub `dev`', 'Demo project remains on GitHub `main`').replace('tracks `main`', 'tracks `dev`')
        self.assertTrue(deployment_guidance_errors(wrong_branches, handoff))
        denied_sso = readme.replace('with SSO protection', 'without SSO protection')
        self.assertTrue(deployment_guidance_errors(denied_sso, handoff))
        newer_handoff = (
            '## Live-state update — 2099-01-01 · Superseding receipt\n'
            '### Vercel topology and current exposure\n'
            '- Existing public Demo project `demo-next` remained on GitHub `preview`.\n'
            '- Separate project `production-next` reports `productionBranch=release` and sets SSO.\n'
            + handoff
        )
        newer_readme = '- Vercel: the existing public Demo project remains on GitHub `preview`; separate `production-next` tracks `release` with SSO protection.'
        self.assertEqual(deployment_guidance_errors(newer_readme, newer_handoff), [])
        self.assertTrue(deployment_guidance_errors(newer_readme.replace('tracks `release`', 'tracks `main`'), newer_handoff))
        published_version = latest_published_version(ROOT)
        self.assertIsNotNone(published_version)
        self.assertEqual(release_status_errors(readme, changelog, published_version), [])
        prepared_changelog = changelog.replace('## [Unreleased]', '## [9.9.9] - 2099-01-01', 1)
        self.assertEqual(release_status_errors(readme, prepared_changelog, published_version), [])
        self.assertTrue(release_status_errors('v9.9.9 is released', prepared_changelog, published_version))
        self.assertTrue(release_status_errors('v0.1.4 is released', '## [0.1.2]\n', '0.1.2'))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '00-PLAN.md').read_text()))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '01-SPEC.md').read_text()))
        self.assertFalse(plan_disclaims_implementation_status('# Plan\n\nNot a draft; P1 is implemented.'))


if __name__ == '__main__':
    unittest.main()
