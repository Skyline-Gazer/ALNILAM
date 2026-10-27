#!/usr/bin/env node
// Reuse the lockfile-pinned Shirone suite and its server/context teardown.
import fs from 'node:fs';
import {spawnSync, execFileSync} from 'node:child_process';
fs.mkdirSync('artifacts/cnb-browser', {recursive: true});
const started = Date.now();
const result = spawnSync('pnpm', ['browser'], {stdio: 'inherit', env: {...process.env, CI: 'true'}});
const lingering = [];
for (const port of [4323, 4324]) {
  try { await fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(1000)}); lingering.push(port); } catch {}
}
const receipt = {sourceSha: process.env.CNB_PULL_REQUEST_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  targetSha: process.env.CNB_PULL_REQUEST_TARGET_SHA || null, mergeSha: process.env.CNB_PULL_REQUEST_MERGE_SHA || null,
  testedSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), node: process.version,
  elapsedMs: Date.now() - started, exitCode: result.status, signal: result.signal, lingeringPorts: lingering};
fs.writeFileSync('artifacts/cnb-browser/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
if (result.status !== 0 || lingering.length) process.exitCode = 1;
