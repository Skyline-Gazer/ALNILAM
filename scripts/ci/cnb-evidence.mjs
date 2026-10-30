import fs from 'node:fs';
import path from 'node:path';

export function trackChild(child) {
  const ended = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => {child.once('exit', resolve);child.once('error', resolve);});
  return {child, ended};
}
export async function stopChildren(children) {
  for (const {child} of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  await Promise.all(children.map(entry => entry.ended));
}
export async function assertSuccessfulResponses(urls, request = fetch) {
  for (const url of urls) {
    let response;
    try { response = await request(url); } catch (error) { throw new Error(`Target unavailable: ${url}`, {cause: error}); }
    if (!response.ok) throw Error(`Target returned HTTP ${response.status}: ${url}`);
  }
}
export function validateLighthouseReports(manifest, load, urls, started, count = 3) {
  if (!Array.isArray(manifest) || manifest.length !== urls.length * count) throw Error('Missing repeated Lighthouse manifest');
  const seen = new Map(urls.map(url => [url, 0]));
  return manifest.map(item => {
    if (!seen.has(item.url)) throw Error('Unexpected Lighthouse URL');
    const report = load(item);
    if (report.requestedUrl !== item.url || !Number.isFinite(Date.parse(report.fetchTime)) || Date.parse(report.fetchTime) < started) throw Error('Stale Lighthouse report');
    if (!Number.isFinite(report.audits?.['cumulative-layout-shift']?.numericValue) || report.audits['cumulative-layout-shift'].errorMessage) throw Error('Missing or failed CLS audit');
    seen.set(item.url, seen.get(item.url) + 1);
    if (seen.get(item.url) > count) throw Error('Missing per-URL repeated Lighthouse reports');
    return report;
  });
}
export function validateLighthouseRegression(reports, assertions, url, count, budget) {
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(budget) || budget < 0) throw Error('Invalid Lighthouse regression expectation');
  if (reports.length !== count || reports.some(report => report.requestedUrl !== url || !Number.isFinite(report.audits?.['cumulative-layout-shift']?.numericValue) || report.audits['cumulative-layout-shift'].errorMessage || report.audits['cumulative-layout-shift'].numericValue <= budget)) throw Error(`Regression needs ${count} genuine excessive CLS measurements`);
  if (!Array.isArray(assertions) || !assertions.some(item => item.url === url && item.auditId === 'cumulative-layout-shift' && item.name === 'maxNumericValue' && item.passed === false && Number.isFinite(item.actual) && item.actual > budget)) throw Error('Expected a measured maxNumericValue failure, not a missing audit');
}
export function validateBrowserNegative(result, report, started, root) {
  if (result.error || result.signal || !Number.isInteger(result.status) || result.status <= 0 || Date.parse(report?.stats?.startTime) < started || !Number.isFinite(Date.parse(report?.stats?.startTime)) || report.stats.unexpected !== 1 || report.stats.expected !== 0) throw Error('Fresh intentional browser failure required');
  const specs = [];
  const collect = suites => {for (const suite of suites || []) {specs.push(...(suite.specs || []));collect(suite.suites);}};
  collect(report.suites);
  const spec = specs.find(item => item.title === 'intentional browser failure probe');
  const failed = spec?.tests?.flatMap(test => test.results || []).find(test => test.status === 'failed' && test.errors?.some(error => error.message?.includes('CNB_INTENTIONAL_BROWSER_FAILURE')));
  if (!failed) throw Error('Expected browser assertion did not fail');
  const evidence = {};
  for (const extension of ['.png', '.zip']) {
    const attachment = failed.attachments?.find(item => item.path?.endsWith(extension));
    const filename = attachment?.path && path.resolve(attachment.path);
    if (!filename || !filename.startsWith(path.resolve(root) + path.sep) || !fs.lstatSync(filename).isFile() || !fs.statSync(filename).size) throw Error('Fresh browser screenshot/trace is missing');
    evidence[extension === '.png' ? 'screenshotBytes' : 'traceBytes'] = fs.statSync(filename).size;
  }
  return evidence;
}
