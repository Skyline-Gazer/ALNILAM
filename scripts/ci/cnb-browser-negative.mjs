import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateBrowserNegative} from './cnb-evidence.mjs';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const started = Date.now();
fs.rmSync('artifacts/cnb-browser/negative.json', {force: true});
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--grep', 'intentional browser failure probe', '--output=artifacts/cnb-browser/negative-artifacts'], {
  env: {...process.env, CNB_BROWSER_FORCE_FAILURE: '1', PLAYWRIGHT_JSON_OUTPUT_FILE: 'artifacts/cnb-browser/negative.json'}, encoding: 'utf8', timeout: 120000,
});
fs.writeFileSync('artifacts/cnb-browser/negative.log', result.stdout + result.stderr);
const evidence = validateBrowserNegative(result, JSON.parse(fs.readFileSync('artifacts/cnb-browser/negative.json', 'utf8')), started, 'artifacts/cnb-browser/negative-artifacts');
fs.writeFileSync('artifacts/cnb-browser/negative-receipt.json', JSON.stringify({status: 'EXPECTED_RED_VERIFIED', exitCode: result.status, ...evidence}, null, 2) + '\n');
console.log('EXPECTED_RED_VERIFIED: intentional browser assertion, nonzero exit and failure evidence');
