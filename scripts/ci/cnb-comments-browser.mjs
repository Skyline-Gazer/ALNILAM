import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const env = {
  ...process.env,
  SOURCE_DATE_EPOCH: '1700000000',
  CNB_TRUSTED_SOURCE_ROOT: root,
  COMMENTS_FIXTURE: '1',
};
delete env.CNB_CANDIDATE_ROOT;
delete env.CNB_TRUSTED_TEST_ROOT;

function run(command, args, extra = {}) {
  const result = spawnSync(command, args, {stdio: 'inherit', env: {...env, ...extra}});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${path.basename(command)} failed (${result.signal || result.status})`);
}

fs.mkdirSync('artifacts/cnb-comments-browser', {recursive: true});
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'alnilam-comments-ci-'));
try {
  fs.cpSync('tests/fixtures/comments-site', site, {recursive: true});
  for (const [name, url] of [
    ['comments-root', 'https://comments.example.com/'],
    ['comments-nested', 'https://comments.example.com/ALNILAM/'],
  ]) {
    const out = `dist/${name}`;
    run(process.execPath, ['scripts/compose.mjs', '--site', site, '--out', out], {
      ALNILAM_SITE_URL: url,
      ALNILAM_REPO_ROOT: root,
      ALNILAM_TOOLCHAIN_ROOT: root,
    });
    run(process.execPath, ['scripts/artifact-check.mjs', out]);
    run(process.execPath, ['scripts/seo-check.mjs', out]);
  }
  // Also build disabled demo outputs so the zero-request case has servers.
  for (const [name, url] of [
    ['site', 'https://example.com/'],
    ['nested-base', 'https://example.com/ALNILAM/'],
  ]) {
    const out = `dist/${name}`;
    if (!fs.existsSync(out)) {
      run(process.execPath, ['scripts/compose.mjs', '--site', 'sites/demo', '--out', out], {
        ALNILAM_SITE_URL: url,
        ALNILAM_REPO_ROOT: root,
        ALNILAM_TOOLCHAIN_ROOT: root,
      });
    }
  }
  run(process.execPath, [
    'node_modules/@playwright/test/cli.js',
    'test',
    'tests/browser/comments.spec.ts',
    '--config',
    'playwright.config.ts',
  ], {
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.resolve('artifacts/cnb-comments-browser/results.json'),
  });
  fs.writeFileSync(
    'artifacts/cnb-comments-browser/receipt.json',
    JSON.stringify({ok: true, fixture: 'comments-site', spec: 'tests/browser/comments.spec.ts'}, null, 2),
  );
} finally {
  fs.rmSync(site, {recursive: true, force: true});
}
