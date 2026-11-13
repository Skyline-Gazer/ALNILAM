import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const env = {
  ...process.env,
  SOURCE_DATE_EPOCH: '1700000000',
  CNB_TRUSTED_SOURCE_ROOT: root,
};
delete env.CNB_CANDIDATE_ROOT;
delete env.CNB_TRUSTED_TEST_ROOT;

function run(command, args, extra = {}) {
  const result = spawnSync(command, args, {stdio: 'inherit', env: {...env, ...extra}});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${path.basename(command)} failed (${result.signal || result.status})`);
}

fs.mkdirSync('artifacts/cnb-a11y-browser', {recursive: true});
for (const [name, url] of [
  ['site', 'https://example.com/'],
  ['nested-base', 'https://example.com/ALNILAM/'],
]) {
  const out = `dist/${name}`;
  run(process.execPath, ['scripts/compose.mjs', '--site', 'sites/demo', '--out', out], {
    ALNILAM_SITE_URL: url,
    ALNILAM_REPO_ROOT: root,
    ALNILAM_TOOLCHAIN_ROOT: root,
  });
  run(process.execPath, ['scripts/artifact-check.mjs', out]);
  run(process.execPath, ['scripts/seo-check.mjs', out]);
}
run(process.execPath, [
  'node_modules/@playwright/test/cli.js',
  'test',
  'tests/browser/a11y.spec.ts',
  '--config',
  'playwright.config.ts',
], {
  PLAYWRIGHT_JSON_OUTPUT_FILE: path.resolve('artifacts/cnb-a11y-browser/results.json'),
});
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
fs.writeFileSync(
  'artifacts/cnb-a11y-browser/receipt.json',
  JSON.stringify({ok: true, spec: 'tests/browser/a11y.spec.ts', sourceSha}, null, 2) + '\n',
);
