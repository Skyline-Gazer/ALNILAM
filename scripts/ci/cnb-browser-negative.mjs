#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--grep', 'intentional browser failure probe', '--output=artifacts/cnb-browser/negative-artifacts'], {
  env: {...process.env, CNB_BROWSER_FORCE_FAILURE: '1', PLAYWRIGHT_JSON_OUTPUT_FILE: 'artifacts/cnb-browser/negative.json'}, encoding: 'utf8', timeout: 120000,
});
fs.writeFileSync('artifacts/cnb-browser/negative.log', result.stdout + result.stderr);
if (result.status === 0 || !fs.existsSync('artifacts/cnb-browser/negative.json') ||
    !fs.readFileSync('artifacts/cnb-browser/negative.json', 'utf8').includes('CNB_INTENTIONAL_BROWSER_FAILURE')) {
  throw Error('Browser negative fixture did not fail for the expected assertion');
}
console.log('EXPECTED_RED_VERIFIED: intentional browser assertion, nonzero exit and failure evidence');
