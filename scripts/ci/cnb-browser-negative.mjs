import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {evidenceDiagnostic, readPlaywrightReport, validateBrowserNegative} from './cnb-evidence.mjs';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const started = Date.now();
fs.rmSync('artifacts/cnb-browser/negative.json', {force: true});
const trustedSourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT;
if (!trustedSourceRoot) throw Error('Trusted dependency root is required');
const trustedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(trustedSourceRoot, 'node_modules/@playwright/test/cli.js');
const spec = path.join(trustedRoot, 'tests/browser/cnb-negative.spec.ts');
const reportPath = path.resolve('artifacts/cnb-browser/negative.json');
const runId = randomUUID();
const outputPath = path.resolve('artifacts/cnb-browser/negative-artifacts', runId);
const outputRoot = path.relative(process.cwd(), outputPath).split(path.sep).join('/');
fs.rmSync(reportPath, {force: true});
fs.rmSync(outputPath, {recursive: true, force: true});
const result = spawnSync(process.execPath, [cli, 'test', spec, '--config', path.join(trustedRoot, 'playwright.config.ts'),
  `--output=${outputPath}`], {
  env: {...process.env, CNB_BROWSER_FORCE_FAILURE: '1', CNB_CANDIDATE_ROOT: process.cwd(),
    CNB_TRUSTED_SOURCE_ROOT: trustedSourceRoot, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath},
  encoding: 'utf8', timeout: 120000,
});
const log = Buffer.concat([Buffer.from(result.stdout || ''), Buffer.from(result.stderr || '')]);
const maxLogBytes = 2 * 1024 * 1024;
const truncationMarker = Buffer.from(`[truncated ${Math.max(0, log.length - maxLogBytes)} leading bytes]\n`);
const logOutput = log.length <= maxLogBytes
  ? log
  : Buffer.concat([truncationMarker, log.subarray(-(maxLogBytes - truncationMarker.length))]);
fs.writeFileSync('artifacts/cnb-browser/negative.log', logOutput);
const diagnostics = [];
if (result.error || result.signal || result.status === null) {
  if (result.error) diagnostics.push(`PROCESS_ERROR: ${result.error.message}`);
  if (result.signal) diagnostics.push(`PROCESS_SIGNAL: browser negative probe terminated with ${result.signal}`);
  if (result.status === null) diagnostics.push('PROCESS_STATUS: browser negative probe produced no exit code');
}
let report = null;
try {
  report = readPlaywrightReport(reportPath);
} catch (error) {
  diagnostics.push(evidenceDiagnostic(error));
}
let evidence = {};
if (!diagnostics.length) {
  try {
    evidence = validateBrowserNegative(result, report, started, outputPath);
  } catch (error) {
    diagnostics.push(evidenceDiagnostic(error));
  }
}
const reportBytes = report ? fs.readFileSync(reportPath) : Buffer.alloc(0);
const receipt = {
  status: diagnostics.length ? 'FAIL' : 'EXPECTED_RED_VERIFIED',
  diagnostics,
  runId,
  outputRoot,
  reportPresent: Boolean(report),
  reportSha256: report ? createHash('sha256').update(reportBytes).digest('hex') : null,
  exitCode: result.status,
  ...evidence,
};
fs.writeFileSync('artifacts/cnb-browser/negative-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
if (diagnostics.length) {
  for (const diagnostic of diagnostics) console.error(diagnostic);
  process.exitCode = 1;
} else {
  console.log('EXPECTED_RED_VERIFIED: intentional browser assertion, nonzero exit and run-specific failure evidence');
}
