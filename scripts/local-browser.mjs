import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode = 'all', ...args] = process.argv.slice(2);
if (args[0] === '--') args.shift();
if (!['all', 'browser', 'cls', 'lighthouse'].includes(mode) || (args.length && !['browser', 'cls'].includes(mode))) {
  console.error('Usage: node scripts/local-browser.mjs [all|browser|cls|lighthouse] [Playwright arguments]');
  process.exit(1);
}
process.chdir(root);
const env = {...process.env, SOURCE_DATE_EPOCH: '1700000000', CNB_TRUSTED_SOURCE_ROOT: root};
delete env.CNB_CANDIDATE_ROOT;
delete env.CNB_TRUSTED_TEST_ROOT;
function run(command, commandArgs, extra = {}) {
  const result = spawnSync(command, commandArgs, {stdio: 'inherit', env: {...env, ...extra}});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${path.basename(command)} failed (${result.signal || result.status})`);
}
const sites = [];
try {
  for (const fixture of [
    {
      source: 'sites/demo',
      outputs: [['site', 'https://example.com/'], ['nested-base', 'https://example.com/ALNILAM/']],
    },
    {
      source: 'tests/fixtures/comments-site',
      outputs: [['comments-root', 'https://comments.example.com/'], ['comments-nested', 'https://comments.example.com/ALNILAM/']],
    },
    {
      source: 'tests/fixtures/consent-site',
      outputs: [['consent-root', 'https://consent.example.com/'], ['consent-nested', 'https://consent.example.com/ALNILAM/']],
    },
    {
      source: 'tests/fixtures/ga4-site',
      outputs: [['ga4-root', 'https://ga4.example.com/'], ['ga4-nested', 'https://ga4.example.com/ALNILAM/']],
    },
    {
      source: 'tests/fixtures/ads-site',
      outputs: [['ads-root', 'https://ads.example.com/'], ['ads-nested', 'https://ads.example.com/ALNILAM/']],
    },
  ]) {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'alnilam-local-site-'));
    sites.push(site);
    fs.cpSync(fixture.source, site, {recursive: true});
    for (const [name, url] of fixture.outputs) {
      const out = `dist/${name}`;
      run(process.execPath, ['scripts/compose.mjs', '--site', site, '--out', out], {ALNILAM_SITE_URL: url, ALNILAM_REPO_ROOT: root, ALNILAM_TOOLCHAIN_ROOT: root});
      run(process.execPath, ['scripts/artifact-check.mjs', out]);
      run(process.execPath, ['scripts/seo-check.mjs', out]);
    }
  }
  if (mode === 'all' || mode === 'browser' || mode === 'cls') {
    const specs = mode === 'cls' ? ['tests/browser/cnb-quality.spec.ts', 'tests/browser/navigation-lifecycle.spec.ts', 'tests/browser/first-paint-order.spec.ts'] : [];
    run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...specs, ...args], {COMMENTS_FIXTURE: '1', CONSENT_FIXTURE: '1', GA4_FIXTURE: '1', ADS_FIXTURE: '1'});
  }
  if (mode === 'all' || mode === 'lighthouse') {
    for (const formFactor of ['mobile', 'desktop']) {
      run(process.execPath, ['scripts/ci/cnb-lighthouse.mjs'], {ALNILAM_LHCI_FORM_FACTOR: formFactor});
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const site of sites) fs.rmSync(site, {recursive: true, force: true});
}
