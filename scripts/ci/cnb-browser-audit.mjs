// Run target-owned browser tests against candidate output without candidate scripts.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evidenceDiagnostic, readPlaywrightReport} from './cnb-evidence.mjs';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const trustedSourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT;
if (!trustedSourceRoot) throw Error('Trusted dependency root is required');
const trustedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = path.resolve('artifacts/cnb-browser/results.json');
fs.rmSync(reportPath, {force: true});
const started = Date.now();
const diagnostics = [];
const cli = path.join(trustedSourceRoot, 'node_modules/@playwright/test/cli.js');
const result = spawnSync(process.execPath, [cli, 'test', '--config', path.join(trustedRoot, 'playwright.config.ts')], {
  cwd: process.cwd(), stdio: 'inherit', env: {...process.env, CI: 'true', CNB_CANDIDATE_ROOT: process.cwd(),
    CNB_TRUSTED_SOURCE_ROOT: trustedSourceRoot, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath},
});
const lingering = [];
const isListening = port => new Promise(resolve => {
  const socket = net.createConnection({host: '127.0.0.1', port});
  let settled = false;
  const finish = value => {
    if (settled) return;
    settled = true;
    socket.destroy();
    resolve(value);
  };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.setTimeout(1000, () => finish(false));
});
for (const port of [4323, 4324]) {
  if (await isListening(port)) lingering.push(port);
}
let report = null;
try {
  report = readPlaywrightReport(reportPath);
} catch (error) {
  diagnostics.push(evidenceDiagnostic(error));
}
if (result.error) diagnostics.push(`PROCESS_ERROR: ${result.error.message}`);
else if (result.signal) diagnostics.push(`PROCESS_SIGNAL: Playwright terminated with ${result.signal}`);
else if (result.status !== 0) diagnostics.push(`PROCESS_EXIT: Playwright exited with status ${result.status}`);
const stats = report?.stats;
const reportBytes = report ? fs.readFileSync(reportPath) : Buffer.alloc(0);
const testCount = stats?.expected ?? 0;
const failedCount = stats?.unexpected ?? 0;
const skippedCount = stats?.skipped ?? 0;
if (!Number.isSafeInteger(testCount) || testCount < 1) diagnostics.push('REPORT_INVALID: Playwright report contains no expected tests');
if (failedCount !== 0) diagnostics.push(`REPORT_INVALID: Playwright report contains ${failedCount} unexpected test(s)`);
if (!Number.isSafeInteger(skippedCount) || skippedCount > 1) diagnostics.push(`REPORT_INVALID: Playwright report contains ${skippedCount} skipped test(s)`);
if (lingering.length) diagnostics.push(`SERVER_LINGERING: ports ${lingering.join(', ')} remain open`);
const receipt = {sourceSha: process.env.CNB_PULL_REQUEST_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  targetSha: process.env.CNB_PULL_REQUEST_TARGET_SHA || null, mergeSha: process.env.CNB_PULL_REQUEST_MERGE_SHA || null,
  testedSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), node: process.version,
  status: diagnostics.length ? 'FAIL' : 'PASS', diagnostics, reportPresent: Boolean(report), elapsedMs: Date.now() - started,
  exitCode: result.status, signal: result.signal, lingeringPorts: lingering, testCount, failedCount, skippedCount,
  reportSha256: report ? createHash('sha256').update(reportBytes).digest('hex') : null};
fs.writeFileSync('artifacts/cnb-browser/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
if (diagnostics.length) {
  for (const diagnostic of diagnostics) console.error(diagnostic);
  process.exitCode = 1;
}
