import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateBrowserNegative} from './cnb-evidence.mjs';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const started = Date.now();
fs.rmSync('artifacts/cnb-browser/negative.json', {force: true});
const trustedSourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT;
if (!trustedSourceRoot) throw Error('Trusted dependency root is required');
const trustedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(trustedSourceRoot, 'node_modules/@playwright/test/cli.js');
const spec = path.join(trustedRoot, 'tests/browser/cnb-negative.spec.ts');
const reportPath = path.resolve('artifacts/cnb-browser/negative.json');
const outputPath = path.resolve('artifacts/cnb-browser/negative-artifacts');
fs.rmSync(reportPath, {force: true});
const result = spawnSync(process.execPath, [cli, 'test', spec, '--config', path.join(trustedRoot, 'playwright.config.ts'),
  `--output=${outputPath}`], {
  env: {...process.env, CNB_BROWSER_FORCE_FAILURE: '1', CNB_CANDIDATE_ROOT: process.cwd(),
    CNB_TRUSTED_SOURCE_ROOT: trustedSourceRoot, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath},
  encoding: 'utf8', timeout: 120000,
});
fs.writeFileSync('artifacts/cnb-browser/negative.log', result.stdout + result.stderr);
if (result.error || result.signal || result.status === null) {
  throw Error(`Browser negative probe did not exit normally (signal ${result.signal || 'none'}; ${result.error?.message || 'no process error'})`);
}
const evidence = validateBrowserNegative(result, JSON.parse(fs.readFileSync(reportPath, 'utf8')), started, outputPath);
fs.writeFileSync('artifacts/cnb-browser/negative-receipt.json', JSON.stringify({status: 'EXPECTED_RED_VERIFIED', exitCode: result.status, ...evidence}, null, 2) + '\n');
console.log('EXPECTED_RED_VERIFIED: intentional browser assertion, nonzero exit and failure evidence');
