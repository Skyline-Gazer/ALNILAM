"""Check tracked Markdown file links without adding a documentation framework."""
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from release_status import published_release_errors, release_claim_errors

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
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?pnpm\s+(?:(run)\s+)?([A-Za-z][\w:-]*)(?=$|\s|[;&|<>])', line):
                    command = match.group(2)
                    if command not in scripts and (match.group(1) is not None or command not in builtins):
                        errors.append(f'{relative}: unknown pnpm script {command}')
                for match in re.finditer(r'(?:^|[;&|]\s*)[ \t]*(?:\$\s*)?node\s+(scripts/[^\s`]+)', line):
                    if not (root / match.group(1)).is_file():
                        errors.append(f'{relative}: missing command target {match.group(1)}')
                for match in re.finditer(r'(?:^|[;&|]\s*)(?:\$\s*)?python3\s+-m\s+unittest\s+discover\s+-s\s+(\S+)', line):
                    if not (root / match.group(1)).is_dir():
                        errors.append(f'{relative}: missing unittest directory {match.group(1)}')
    return errors


def invalid_site_config_examples(root, files, core_root):
    examples = []
    pattern = re.compile(r'^ {0,3}```yaml[ \t]+site-config[^\n]*\n(.*?)(?:\n)?^ {0,3}```[ \t]*(?:\n|$)', re.M | re.S)
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
        if any(
            re.search(r'\bCNB\b', claim, re.I)
            and active.search(claim)
            and not historical.search(claim)
            for claim in line.split(';')
        )
    ]


def current_unreleased_changelog(changelog):
    section = re.search(r'^## \[Unreleased\][ \t]*\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
    return section.group(1) if section is not None else ''


def deployment_guidance_errors(readme, handoff):
    updates = list(re.finditer(
        r'^## Live-state update[ \t]*[—–-][ \t]*(\d{4}-\d{2}-\d{2})[^\n]*\n(.*?)(?=^## |\Z)',
        handoff,
        re.M | re.S,
    ))
    evidence = []
    for update in updates:
        section = re.search(
            r'^### Vercel topology and current exposure[ \t]*\n(.*?)(?=^### |\Z)',
            update.group(2),
            re.M | re.S,
        )
        if section is not None:
            evidence.append((update.group(1), section.group(1)))
    if not evidence:
        return ['HANDOFF: current Vercel evidence section is missing']
    latest_date = max(date for date, _ in evidence)
    current_sections = [body for date, body in evidence if date == latest_date]
    if len(current_sections) != 1:
        return ['HANDOFF: current Vercel evidence section is ambiguous']
    current = current_sections[0]
    demo = re.search(r'existing public Demo project .*? on GitHub `([^`]+)`', current, re.S | re.I)
    production = re.search(r'Separate project `([^`]+)`.*?productionBranch=([^`\s]+)', current, re.S | re.I)
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

    project_line = next((
        candidate for candidate in current.splitlines()
        if re.search(rf'Separate project `{re.escape(production.group(1))}`', candidate, re.I)
        and re.search(rf'productionBranch={re.escape(production.group(2))}\b', candidate, re.I)
    ), '')
    sso_enabled = bool(re.search(
        r'\bssoProtection=(?:all|all_except_custom_domains)\b|\b(?:sets?|enforces?|requires?) SSO for Production URLs\b',
        project_line,
        re.I,
    ))
    sso_disabled = bool(re.search(
        r'\bssoProtection=(?:none|disabled|off)\b|\bSSO (?:is )?(?:disabled|off)\b|\bdoes not (?:set|require|use) SSO\b',
        project_line,
        re.I,
    ))
    if sso_doc is not None:
        if sso_doc.groups() != production.groups():
            errors.append('README: SSO claim names a different Production project or branch')
        if not sso_enabled or sso_disabled:
            errors.append('README: claims SSO protection without enabled SSO evidence for the named Production project')
    elif sso_enabled:
        errors.append('README: current SSO protection is omitted')
    return errors




def plan_disclaims_implementation_status(text):
    header = text.split('\n## ', 1)[0]
    disclaimers = (
        r'\bnot\s+(?:yet\s+)?implemented\b',
        r'\b(?:requirements?|targets?)\b.{0,120}\bdo not by themselves establish current implementation\b',
        r'\b(?:requirements?|targets?)\b.{0,120}\bnot features? already shipped\b',
    )
    return any(re.search(pattern, header, re.I) for pattern in disclaimers)


def mutable_demo_fixture_count_errors(readme):
    if re.search(
        r'\bdefault Site fixture\b[^\n]*\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+[a-z][\w-]*){0,4}\s+articles?\b',
        readme,
        re.I,
    ):
        return ['README: mutable Demo fixture article count must not be hard-coded']
    return []



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

    def test_demo_fixture_article_count_stays_out_of_readme(self):
        readme = (ROOT / 'README.md').read_text()
        self.assertEqual(mutable_demo_fixture_count_errors(readme), [])
        self.assertEqual(
            mutable_demo_fixture_count_errors(
                'The default Site fixture lives in `sites/demo` (three locales, two articles).'
            ),
            ['README: mutable Demo fixture article count must not be hard-coded'],
        )
        self.assertEqual(
            mutable_demo_fixture_count_errors(
                'The default Site fixture contains 13 published articles.'
            ),
            ['README: mutable Demo fixture article count must not be hard-coded'],
        )

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
            (root / 'README.md').write_text('```bash\npnpm install\npnpm run install\npnpm run test\npnpm missing-script\npnpm run test-\nnode scripts/missing.mjs\n  node scripts/indented-missing.mjs\n```')
            self.assertEqual(command_example_errors(root, ['README.md']), [
                'README.md: unknown pnpm script install',
                'README.md: unknown pnpm script missing-script',
                'README.md: unknown pnpm script test-',
                'README.md: missing command target scripts/missing.mjs',
                'README.md: missing command target scripts/indented-missing.mjs',
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
            (docs / 'end-of-file.md').write_text(f'```yaml site-config\n{valid_yaml}\n```')
            self.assertEqual(invalid_site_config_examples(root, ['docs/end-of-file.md'], ROOT), [])
            (docs / 'valid-then-empty-at-eof.md').write_text(f'```yaml site-config\n{valid_yaml}\n```\n```yaml site-config\n```')
            empty_errors = invalid_site_config_examples(root, ['docs/valid-then-empty-at-eof.md'], ROOT)
            self.assertTrue(empty_errors)
            self.assertNotIn('no complete YAML Site config examples marked `yaml site-config`', empty_errors)
            self.assertIn('docs/valid-then-empty-at-eof.md example 2:', empty_errors[0])

    def test_post_tag_release_check_uses_the_published_tag_on_the_same_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'README.md').write_text('# Test\n\nReleased v9.9.9.\n')
            (root / 'CHANGELOG.md').write_text('## [9.9.9] - 2099-01-01\n')
            subprocess.run(['git', 'init', '--quiet', '--initial-branch=main'], cwd=root, check=True)
            subprocess.run(['git', 'config', 'user.name', 'Docs Test'], cwd=root, check=True)
            subprocess.run(['git', 'config', 'user.email', 'docs-test@example.invalid'], cwd=root, check=True)
            subprocess.run(['git', 'add', 'README.md', 'CHANGELOG.md'], cwd=root, check=True)
            subprocess.run(['git', 'commit', '--quiet', '-m', 'release candidate'], cwd=root, check=True)
            before_tag = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
            command = ['python3', str(ROOT / 'scripts/check_release_status.py'), 'v9.9.9', '--root', str(root)]
            before = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertNotEqual(before.returncode, 0)
            self.assertIn('is unavailable', before.stderr)
            subprocess.run(['git', 'tag', 'v9.9.9'], cwd=root, check=True)
            after = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertEqual(after.returncode, 0, after.stderr)
            self.assertEqual(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), before_tag)

    def test_current_authority_deployment_release_and_plan_claims_are_checked(self):
        readme = (ROOT / 'README.md').read_text()
        changelog = (ROOT / 'CHANGELOG.md').read_text()
        handoff = (ROOT / 'docs' / 'HANDOFF.md').read_text()
        current_changelog = current_unreleased_changelog(changelog)
        authority_docs = '\n'.join([
            readme,
            (ROOT / 'CONTRIBUTING.md').read_text(),
            (ROOT / 'docs' / 'MAINTAINERS.md').read_text(),
            current_changelog,
        ])
        self.assertEqual(stale_cnb_claims(authority_docs), [])
        self.assertEqual(stale_cnb_claims('The ADS pin records a frozen CNB development commit.'), [])
        self.assertTrue(stale_cnb_claims(
            'CNB is the required validation provider; the ADS pin records a frozen CNB development commit.'
        ))
        self.assertEqual(deployment_guidance_errors(readme, handoff), [])
        wrong_branches = readme.replace('Demo project remains on GitHub `dev`', 'Demo project remains on GitHub `main`').replace('tracks `main`', 'tracks `dev`')
        self.assertTrue(deployment_guidance_errors(wrong_branches, handoff))
        denied_sso = readme.replace('with SSO protection', 'without SSO protection')
        self.assertTrue(deployment_guidance_errors(denied_sso, handoff))
        disabled_sso_handoff = handoff.replace(
            'sets SSO for Production URLs and all Previews',
            'SSO is disabled for Production URLs',
        )
        self.assertTrue(deployment_guidance_errors(readme, disabled_sso_handoff))
        unrelated_same_date = (
            '## Live-state update — 2026-11-18 · unrelated update\n'
            'No deployment evidence in this update.\n\n'
            + handoff
        )
        self.assertEqual(deployment_guidance_errors(readme, unrelated_same_date), [])
        newer_handoff = (
            '## Live-state update — 2099-01-01 · Superseding receipt\n'
            '### Vercel topology and current exposure\n'
            '- Existing public Demo project `demo-next` remained on GitHub `preview`.\n'
            '- Separate project `production-next` reports `productionBranch=release/2026.11` and `ssoProtection=all`.\n'
            + handoff
        )
        newer_readme = '- Vercel: the existing public Demo project remains on GitHub `preview`; separate `production-next` tracks `release/2026.11` with SSO protection.'
        self.assertEqual(deployment_guidance_errors(newer_readme, newer_handoff), [])
        self.assertTrue(deployment_guidance_errors(newer_readme.replace('tracks `release/2026.11`', 'tracks `release`'), newer_handoff))
        self.assertEqual(release_claim_errors(readme, changelog), [])
        prepared_changelog = '## [9.9.9] - 2099-01-01\n' + re.sub(
            r'(?m)^## \[Unreleased\][^\n]*\n', '', changelog, count=1
        )
        self.assertEqual(current_unreleased_changelog(prepared_changelog), '')
        prepared_authority_docs = '\n'.join([
            readme,
            (ROOT / 'CONTRIBUTING.md').read_text(),
            (ROOT / 'docs' / 'MAINTAINERS.md').read_text(),
            current_unreleased_changelog(prepared_changelog),
        ])
        self.assertEqual(stale_cnb_claims(prepared_authority_docs), [])
        released_version = re.search(r'(?m)^## \[(\d+\.\d+\.\d+)\]', changelog).group(1)
        candidate_readme = re.sub(rf'\bv{re.escape(released_version)}\b', 'v9.9.9', readme)
        self.assertNotEqual(candidate_readme, readme)
        self.assertEqual(release_claim_errors(candidate_readme, prepared_changelog), [])
        self.assertEqual(published_release_errors(candidate_readme, prepared_changelog, '9.9.9'), [])
        self.assertTrue(release_claim_errors('Released v9.9.9-rc.1.', prepared_changelog))
        self.assertTrue(published_release_errors('Released v9.9.9-rc.1.', prepared_changelog, '9.9.9'))
        self.assertTrue(published_release_errors('v9.9.9-rc.1 is released', prepared_changelog, '9.9.9'))
        self.assertTrue(published_release_errors(candidate_readme, prepared_changelog, '0.1.4'))
        self.assertTrue(published_release_errors('v9.9.9 is released', prepared_changelog, '0.1.2'))
        self.assertTrue(published_release_errors(candidate_readme, prepared_changelog, 'not-a-version'))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '00-PLAN.md').read_text()))
        self.assertTrue(plan_disclaims_implementation_status((ROOT / 'docs' / 'next' / '01-SPEC.md').read_text()))
        self.assertFalse(plan_disclaims_implementation_status('# Plan\n\nNot a draft; P1 is implemented.'))
        self.assertFalse(plan_disclaims_implementation_status('# Plan\n\nThis is not a production-release authorization.'))

    def test_pagefind_web_runtime_license_is_retained_and_referenced(self):
        license_text = (ROOT / 'LICENSES' / 'Pagefind-Web-Runtime-MIT.txt').read_text()
        self.assertTrue(license_text.startswith('Copyright 2022 Pagefind\n\n'))
        self.assertIn('The above copyright notice and this permission notice shall be included', license_text)
        self.assertIn('THE SOFTWARE IS PROVIDED "AS IS"', license_text)
        notices = (ROOT / 'THIRD_PARTY_NOTICES.md').read_text()
        self.assertIn('[LICENSES/Pagefind-Web-Runtime-MIT.txt](LICENSES/Pagefind-Web-Runtime-MIT.txt)', notices)


if __name__ == '__main__':
    unittest.main()
