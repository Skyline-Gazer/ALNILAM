import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {trackChild, stopChildren, assertSuccessfulResponses, validateLighthouseReports, validateLighthouseRegression, validateBrowserNegative} from './cnb-evidence.mjs';

test('teardown handles an already-signalled child without waiting for a past event', async () => {
  const child = Object.assign(new EventEmitter(), {exitCode: null, signalCode: 'SIGKILL', kill() {throw Error('Already ended');}});
  await Promise.race([stopChildren([trackChild(child)]), new Promise((resolve, reject) => {setTimeout(() => reject(Error('Teardown hung')), 100).unref();})]);
});
test('Lighthouse preflight rejects missing demo routes before measuring them', async () => {
  await assertSuccessfulResponses(['http://fixture/'], async () => ({ok: true, status: 200}));
  await assert.rejects(assertSuccessfulResponses(['http://fixture/missing/'], async () => ({ok: false, status: 404})), /HTTP 404/);
  await assert.rejects(assertSuccessfulResponses(['http://fixture/offline/'], async () => {throw Error('offline');}), /Target unavailable/);
});
test('Lighthouse rejects old exports, missing audits and unbalanced per-URL counts', () => {
  const now = Date.now(), url = 'http://fixture/';
  const lhr = {requestedUrl: url, fetchTime: new Date(now).toISOString(), audits: {'cumulative-layout-shift': {numericValue: 0.5}}};
  const manifest = Array.from({length: 3}, () => ({url}));
  assert.equal(validateLighthouseReports(manifest, () => lhr, [url], now, 3).length, 3);
  assert.throws(() => validateLighthouseReports(manifest, () => ({...lhr, fetchTime: new Date(now - 1).toISOString()}), [url], now, 3), /Stale/);
  assert.throws(() => validateLighthouseReports(manifest, () => ({...lhr, audits: {}}), [url], now, 3), /CLS/);
  const other = 'http://other/';
  const unbalanced = [...Array.from({length: 4}, () => ({url})), ...Array.from({length: 2}, () => ({url: other}))];
  assert.throws(() => validateLighthouseReports(unbalanced, item => ({...lhr, requestedUrl: item.url}), [url, other], now, 3), /Missing per-URL repeated Lighthouse reports/);
});
test('expected Lighthouse red needs measured excessive CLS, not auditRan failure', () => {
  const url = 'http://regression/';
  const reports = Array.from({length: 3}, () => ({requestedUrl: url, audits: {'cumulative-layout-shift': {numericValue: 0.5}}}));
  const result = {url, auditId: 'cumulative-layout-shift', name: 'maxNumericValue', passed: false, actual: 0.5};
  validateLighthouseRegression(reports, [result], url, 3, 0.1);
  validateLighthouseRegression(reports, [result], url, 3, 0.4);
  assert.throws(() => validateLighthouseRegression(reports, [{...result, actual: 0.3}], url, 3, 0.4), /Expected a measured maxNumericValue failure/);
  assert.throws(() => validateLighthouseRegression(reports, [result], url, 3), /Invalid Lighthouse regression expectation/);
  assert.throws(() => validateLighthouseRegression(reports, [result], url, 5, 0.1), /needs 5/);
  validateLighthouseRegression(Array.from({length: 5}, () => reports[0]), [result], url, 5, 0.1);
  assert.throws(() => validateLighthouseRegression(reports, [{...result, name: 'auditRan', actual: 0}], url));
  assert.throws(() => validateLighthouseRegression([{requestedUrl: url, audits: {}}, ...reports.slice(1)], [result], url));
});
test('browser negative rejects stale, signalled and unrelated failures', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-negative-evidence-'));
  try {
    const started = Date.now();
    for (const file of ['shot.png', 'trace.zip']) fs.writeFileSync(path.join(root, file), 'fixture');
    const report = {stats: {startTime: new Date(started).toISOString(), unexpected: 1, expected: 0}, suites: [{specs: [{title: 'intentional browser failure probe', tests: [{results: [{status: 'failed', errors: [{message: 'CNB_INTENTIONAL_BROWSER_FAILURE'}], attachments: ['shot.png', 'trace.zip'].map(file => ({path: path.join(root, file)}))}]}]}]}]};
    assert.deepEqual(validateBrowserNegative({status: 1, signal: null}, report, started, root), {screenshotBytes: 7, traceBytes: 7});
    assert.throws(() => validateBrowserNegative({status: 1}, {...report, stats: {...report.stats, expected: 1}}, started, root));
    assert.throws(() => validateBrowserNegative({status: null, signal: 'SIGTERM'}, report, started, root));
    assert.throws(() => validateBrowserNegative({status: 1}, report, started + 1, root));
    const unrelated = structuredClone(report);unrelated.suites[0].specs[0].tests[0].results[0].errors[0].message = 'Server unavailable';
    assert.throws(() => validateBrowserNegative({status: 1}, unrelated, started, root));
  } finally {fs.rmSync(root, {recursive: true, force: true});}
});
