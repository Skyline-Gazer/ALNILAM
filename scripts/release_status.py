"""Pure release-claim checks shared by docs tests and the post-tag workflow."""
import re
import subprocess
from pathlib import Path

_VERSION = re.compile(r'\d+\.\d+\.\d+')


def _release_versions(changelog):
    return set(re.findall(r'(?m)^## \[(\d+\.\d+\.\d+)\]', changelog))


def _readme_claims(readme):
    claims = set(re.findall(r'\bReleased\s+v(\d+\.\d+\.\d+)\b', readme, re.I))
    claims.update(re.findall(r'\bv(\d+\.\d+\.\d+)\s+is released\b', readme, re.I))
    return claims


def release_claim_errors(readme, changelog):
    """Validate source-controlled release claims without querying Git refs."""
    releases = _release_versions(changelog)
    claims = _readme_claims(readme)
    errors = []
    if not claims:
        errors.append('README: released version claim is missing')
    if len(claims) > 1:
        errors.append(f'README release versions disagree: {sorted(claims)}')
    missing = claims - releases
    if missing:
        errors.append(f'CHANGELOG: README release versions lack headings: {sorted(missing)}')
    return errors


def published_release_errors(readme, changelog, published_version):
    """Validate the current release claim against an exact published tag version."""
    if not isinstance(published_version, str) or not _VERSION.fullmatch(published_version):
        return ['Git tag: expected a numeric X.Y.Z release version']
    releases = _release_versions(changelog)
    if published_version not in releases:
        return [f'CHANGELOG: published tag v{published_version} has no release heading']
    claims = _readme_claims(readme)
    if claims != {published_version}:
        return [f'README release versions {sorted(claims)} disagree with published tag v{published_version}']
    return []


def release_tag_errors(root, tag):
    """Require the supplied release tag to exist and point at the checked-out commit."""
    match = re.fullmatch(r'v(\d+\.\d+\.\d+)', tag or '')
    if match is None:
        return None, ['Git tag: expected vX.Y.Z']

    tag_commit = subprocess.run(
        ['git', 'rev-parse', '--verify', f'refs/tags/{tag}^{{commit}}'],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=30,
    )
    if tag_commit.returncode != 0:
        return None, [f'Git tag {tag} is unavailable']

    head = subprocess.run(
        ['git', 'rev-parse', '--verify', 'HEAD^{commit}'],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=30,
    )
    if head.returncode != 0 or tag_commit.stdout.strip() != head.stdout.strip():
        return None, [f'Git tag {tag} does not point at the checked-out commit']
    return match.group(1), []


def repository_release_errors(root, tag):
    root = Path(root)
    version, errors = release_tag_errors(root, tag)
    if errors:
        return errors
    readme = (root / 'README.md').read_text()
    changelog = (root / 'CHANGELOG.md').read_text()
    return published_release_errors(readme, changelog, version)
