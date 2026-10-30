// Run target-owned browser tests against candidate output without candidate scripts.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const trustedSourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT;
if (!trustedSourceRoot) throw Error('Trusted dependency root is required');
const trustedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = path.resolve('artifacts/cnb-browser/results.json');
fs.rmSync(reportPath, {force: true});
const started = Date.now();
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
const report = result.status === 0 ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const stats = report?.stats;
const reportBytes = fs.existsSync(reportPath) ? fs.readFileSync(reportPath) : Buffer.alloc(0);
const receipt = {sourceSha: process.env.CNB_PULL_REQUEST_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  targetSha: process.env.CNB_PULL_REQUEST_TARGET_SHA || null, mergeSha: process.env.CNB_PULL_REQUEST_MERGE_SHA || null,
  testedSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), node: process.version,
  elapsedMs: Date.now() - started, exitCode: result.status, signal: result.signal, lingeringPorts: lingering,
  testCount: stats?.expected ?? 0, failedCount: stats?.unexpected ?? 0, skippedCount: stats?.skipped ?? 0,
  reportSha256: reportBytes.length ? createHash('sha256').update(reportBytes).digest('hex') : null};
fs.writeFileSync('artifacts/cnb-browser/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
if (result.status !== 0 || !Number.isSafeInteger(receipt.testCount) || receipt.testCount < 1 ||
    receipt.failedCount !== 0 || receipt.skippedCount > 1 || lingering.length) process.exitCode = 1;
