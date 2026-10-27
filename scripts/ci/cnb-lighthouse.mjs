#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import {spawn, execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from '@playwright/test';
const cli = 'node_modules/@lhci/cli/src/cli.js';
const env = {...process.env, CHROME_PATH: chromium.executablePath()};
const children = [];
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {env, stdio: 'inherit'});
    children.push(child);
    child.once('error', reject);
    child.once('exit', code => resolve(code));
  });
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw Error('Preview server exited before Lighthouse');
    try { if ((await fetch(url)).ok) return; } catch {}
    await delay(100);
  }
  throw Error(`Preview unavailable: ${url}`);
}
fs.mkdirSync('artifacts/lighthouse', {recursive: true});
const started = Date.now();
let regression;
const receipt = {coreSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), node: process.version, browser: chromium.executablePath(),
  runsPerURL: 3, normalStatus: 'NOT_RUN', regressionStatus: 'NOT_RUN'};
const stop = () => { for (const child of children) if (child.exitCode === null) child.kill('SIGTERM'); };
process.once('SIGTERM', () => {stop(); process.exit(1);});
try {
  for (const [port, root, base] of [[4323, 'dist/site', '/'], [4324, 'dist/nested-base', '/ALNILAM/']]) {
    const child = spawn(process.execPath, ['scripts/preview-server.mjs', '--port', String(port), '--root', root, '--base', base], {stdio: 'inherit'});
    children.push(child);
    await ready(`http://127.0.0.1:${port}${base}`, child);
  }
  if (await run(['autorun', '--config=lighthouserc.cjs']) !== 0) throw Error('Lighthouse collection/upload failed');
  const manifest = JSON.parse(fs.readFileSync('artifacts/lighthouse/manifest.json', 'utf8'));
  if (manifest.length !== 18 || manifest.some(item => !fs.statSync(item.jsonPath).size || !fs.statSync(item.htmlPath).size)) throw Error('Missing repeated Lighthouse HTML/JSON reports');
  receipt.normalStatus = 'BASELINE_RECORDED';
  regression = http.createServer((request, response) => response.end('<!doctype html><title>CNB regression</title><h1>Visible content shifts</h1><p>Deterministic severe regression.</p><script>setTimeout(()=>{const e=document.createElement("div");e.style.height="700px";document.body.prepend(e)},900)</script>'));
  await new Promise(resolve => regression.listen(0, '127.0.0.1', resolve));
  const config = {ci: {collect: {url: [`http://127.0.0.1:${regression.address().port}/`], numberOfRuns: 3, settings: {chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage'}},
    assert: {assertions: {'cumulative-layout-shift': ['error', {maxNumericValue: 0.10}]}}, upload: {target: 'filesystem', outputDir: 'artifacts/lighthouse-regression'}}};
  fs.writeFileSync('.tmp/cnb/lighthouse-regression.json', JSON.stringify(config));
  if (await run(['collect', '--config=.tmp/cnb/lighthouse-regression.json']) !== 0) throw Error('Regression fixture failed to collect');
  const code = await run(['assert', '--config=.tmp/cnb/lighthouse-regression.json']);
  const assertions = JSON.parse(fs.readFileSync('.lighthouseci/assertion-results.json', 'utf8'));
  if (code === 0 || !assertions.some(item => item.auditId === 'cumulative-layout-shift' && item.passed === false)) throw Error('Severe Lighthouse regression did not turn its gate red');
  if (await run(['upload', '--config=.tmp/cnb/lighthouse-regression.json']) !== 0) throw Error('Regression evidence upload failed');
  receipt.regressionStatus = 'EXPECTED_RED_VERIFIED';
} catch (error) {receipt.error = error.message;console.error(error);process.exitCode = 1;}
finally {
  if (regression) await new Promise(resolve => regression.close(resolve));
  stop();
  await Promise.all(children.filter(child => child.exitCode === null).map(child => new Promise(resolve => child.once('exit', resolve))));
  receipt.elapsedMs = Date.now() - started;
  fs.writeFileSync('artifacts/lighthouse/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
}
