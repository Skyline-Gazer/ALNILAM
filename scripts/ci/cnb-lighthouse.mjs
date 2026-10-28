import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from '@playwright/test';
import {trackChild, stopChildren, assertSuccessfulResponses, validateLighthouseReports, validateLighthouseRegression} from './cnb-evidence.mjs';
const cli = 'node_modules/@lhci/cli/src/cli.js';
const env = {...process.env, CHROME_PATH: chromium.executablePath(), ALNILAM_CHROME_PATH: chromium.executablePath()};
const children = [];
const formFactor = process.env.ALNILAM_LHCI_FORM_FACTOR || 'mobile';
if (!['mobile', 'desktop'].includes(formFactor)) throw Error('Unsupported Lighthouse form factor');
const reportDir = `artifacts/lighthouse/${formFactor}`;
const regressionDir = `artifacts/lighthouse-regression/${formFactor}`;
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {env, stdio: 'inherit'});
    children.push(trackChild(child));
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
fs.rmSync(reportDir, {recursive: true, force: true});
fs.rmSync(regressionDir, {recursive: true, force: true});
fs.mkdirSync(reportDir, {recursive: true});
fs.mkdirSync('.tmp/cnb', {recursive: true});
const started = Date.now();
let regression;
const {default: baseline} = await import('../../lighthouserc.cjs');
const runsPerURL = baseline.ci.collect.numberOfRuns;
if (!Number.isSafeInteger(runsPerURL) || runsPerURL < 1) throw Error('Lighthouse numberOfRuns must be a positive integer');
const clsBudget = baseline.ci.assert.assertions['cumulative-layout-shift']?.[1]?.maxNumericValue;
if (!Number.isFinite(clsBudget) || clsBudget < 0) throw Error('Lighthouse CLS budget must be finite and nonnegative');
const root = 'http://127.0.0.1:4323';
const nested = 'http://127.0.0.1:4324/ALNILAM';
// CNB bounds collection to representative demo routes at both supported base paths.
const routes = ['/', '/posts/', '/posts/hello-alnilam/'];
const urls = routes.flatMap(route => [`${root}${route}`, `${nested}${route}`]);
const config = structuredClone(baseline.ci);
config.collect.url = urls;
config.upload.outputDir = reportDir;
fs.writeFileSync(`.tmp/cnb/lighthouse-${formFactor}.json`, JSON.stringify({ci: config}));
const receipt = {coreSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), formFactor, node: process.version, browser: chromium.executablePath(),
  runsPerURL, normalStatus: 'NOT_RUN', regressionStatus: 'NOT_RUN'};
const stop = () => stopChildren(children);
process.once('SIGTERM', async () => {await stop(); process.exit(1);});
try {
  for (const [port, output, base] of [[4323, 'dist/site', '/'], [4324, 'dist/nested-base', '/ALNILAM/']]) {
    const child = spawn(process.execPath, ['scripts/preview-server.mjs', '--port', String(port), '--root', output, '--base', base], {stdio: 'inherit'});
    children.push(trackChild(child));
    await ready(`http://127.0.0.1:${port}${base}`, child);
  }
  await assertSuccessfulResponses(urls);
  if (await run(['autorun', `--config=.tmp/cnb/lighthouse-${formFactor}.json`, '--failOnUploadFailure']) !== 0) throw Error('Lighthouse collection/upload failed');
  const manifest = JSON.parse(fs.readFileSync(path.join(reportDir, 'manifest.json'), 'utf8'));
  validateLighthouseReports(manifest, item => {if (!fs.statSync(item.htmlPath).size) throw Error('Missing HTML');return JSON.parse(fs.readFileSync(item.jsonPath, 'utf8'));}, urls, started, runsPerURL);
  receipt.normalStatus = 'BASELINE_RECORDED';
  regression = http.createServer((request, response) => response.end('<!doctype html><title>CNB regression</title><h1>Visible content shifts</h1><p>Deterministic severe regression.</p><script>setTimeout(()=>{const e=document.createElement("div");e.style.height="700px";document.body.prepend(e)},900)</script>'));
  await new Promise(resolve => regression.listen(0, '127.0.0.1', resolve));
  const regressionConfig = structuredClone(baseline.ci);
  regressionConfig.collect.url = [`http://127.0.0.1:${regression.address().port}/`];
  regressionConfig.upload.outputDir = regressionDir;
  regressionConfig.assert.assertions['cumulative-layout-shift'][0] = 'error';
  fs.writeFileSync(`.tmp/cnb/lighthouse-regression-${formFactor}.json`, JSON.stringify({ci: regressionConfig}));
  if (await run(['collect', `--config=.tmp/cnb/lighthouse-regression-${formFactor}.json`]) !== 0) throw Error('Regression fixture failed to collect');
  const code = await run(['assert', `--config=.tmp/cnb/lighthouse-regression-${formFactor}.json`]);
  const assertions = JSON.parse(fs.readFileSync('.lighthouseci/assertion-results.json', 'utf8'));
  if (code !== 1) throw Error('Regression assertion did not return its expected failure');
  if (await run(['upload', `--config=.tmp/cnb/lighthouse-regression-${formFactor}.json`]) !== 0) throw Error('Regression evidence upload failed');
  const regressionManifest = JSON.parse(fs.readFileSync(path.join(regressionDir, 'manifest.json'), 'utf8'));
  const reports = validateLighthouseReports(regressionManifest, item => JSON.parse(fs.readFileSync(item.jsonPath, 'utf8')), regressionConfig.collect.url, started, runsPerURL);
  validateLighthouseRegression(reports, assertions, regressionConfig.collect.url[0], runsPerURL, clsBudget);
  fs.copyFileSync('.lighthouseci/assertion-results.json', path.join(regressionDir, 'assertion-results.json'));
  receipt.regressionStatus = 'EXPECTED_RED_VERIFIED';
} catch (error) {receipt.error = error.message;console.error(error);process.exitCode = 1;}
finally {
  if (regression) await new Promise(resolve => regression.close(resolve));
  await stop();
  receipt.elapsedMs = Date.now() - started;
  fs.writeFileSync(path.join(reportDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}
