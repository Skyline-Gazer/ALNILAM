import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ciRoot = path.dirname(fileURLToPath(import.meta.url));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-browser-script-'));
  const candidate = path.join(root, 'candidate');
  const source = path.join(root, 'trusted-source');
  const cli = path.join(source, 'node_modules/@playwright/test/cli.js');
  fs.mkdirSync(candidate);
  fs.mkdirSync(path.dirname(cli), {recursive: true});
  execFileSync('git', ['init', '-q'], {cwd: candidate});
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '--allow-empty', '-q', '-m', 'fixture'], {cwd: candidate});
  fs.writeFileSync(cli, `
import fs from 'node:fs';
import path from 'node:path';
const mode = process.env.CNB_FAKE_PLAYWRIGHT;
if (mode === 'signal') {
  process.kill(process.pid, 'SIGTERM');
} else if (mode === 'successful-negative') {
  const output = process.argv.find(value => value.startsWith('--output=')).slice('--output='.length);
  fs.mkdirSync(output, {recursive: true});
  const screenshot = path.join(output, 'negative-browser.png');
  const trace = path.join(output, 'trace.zip');
  fs.writeFileSync(screenshot, 'png');
  fs.writeFileSync(trace, 'zip');
  const report = {
    stats: {startTime: new Date().toISOString(), expected: 0, unexpected: 1},
    suites: [{specs: [{title: 'intentional browser failure probe', tests: [{results: [{
      status: 'failed',
      errors: [{message: 'CNB_INTENTIONAL_BROWSER_FAILURE'}],
      attachments: [
        {path: screenshot, contentType: 'image/png'},
        {path: trace, contentType: 'application/zip'},
      ],
    }]}]}]}],
  };
  fs.writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify(report));
  process.exit(1);
} else if (mode === 'missing-failure') {
  process.exit(1);
} else {
  process.exit(0);
}
`);
  return {root, candidate, source};
}

function environment(entry, mode) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    CNB_TRUSTED_SOURCE_ROOT: entry.source,
    CNB_PULL_REQUEST_SHA: 'a'.repeat(40),
    CNB_PULL_REQUEST_TARGET_SHA: 'b'.repeat(40),
    CNB_PULL_REQUEST_MERGE_SHA: 'c'.repeat(40),
    CNB_FAKE_PLAYWRIGHT: mode,
  };
}

test('browser audit writes a named failure receipt when Playwright omits its report', () => {
  const entry = fixture();
  try {
    const result = spawnSync(process.execPath, [path.join(ciRoot, 'cnb-browser-audit.mjs')], {
      cwd: entry.candidate,
      encoding: 'utf8',
      env: environment(entry, 'missing-pass'),
    });
    assert.notEqual(result.status, 0);
    const receipt = JSON.parse(fs.readFileSync(path.join(entry.candidate, 'artifacts/cnb-browser/receipt.json'), 'utf8'));
    assert.equal(receipt.status, 'FAIL');
    assert.equal(receipt.reportPresent, false);
    assert.ok(receipt.diagnostics.some(message => message.startsWith('REPORT_MISSING:')));
    assert.match(result.stderr, /REPORT_MISSING:/);
  } finally {
    fs.rmSync(entry.root, {recursive: true, force: true});
  }
});

test('browser negative diagnostics survive missing reports and terminated processes', () => {
  const entry = fixture();
  try {
    for (const [mode, pattern] of [['missing-failure', /^REPORT_MISSING:/m], ['signal', /^PROCESS_SIGNAL:/m]]) {
      const result = spawnSync(process.execPath, [path.join(ciRoot, 'cnb-browser-negative.mjs')], {
        cwd: entry.candidate,
        encoding: 'utf8',
        env: environment(entry, mode),
      });
      assert.notEqual(result.status, 0);
      const receipt = JSON.parse(fs.readFileSync(path.join(entry.candidate, 'artifacts/cnb-browser/negative-receipt.json'), 'utf8'));
      assert.equal(receipt.status, 'FAIL');
      assert.ok(receipt.diagnostics.some(message => pattern.test(message)), receipt.diagnostics.join('\n'));
      assert.match(receipt.runId, /^[0-9a-f-]{36}$/);
    }
  } finally {
    fs.rmSync(entry.root, {recursive: true, force: true});
  }
});

test('successful negative probes use fresh run-specific attachment directories', () => {
  const entry = fixture();
  try {
    const receipts = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = spawnSync(process.execPath, [path.join(ciRoot, 'cnb-browser-negative.mjs')], {
        cwd: entry.candidate,
        encoding: 'utf8',
        env: environment(entry, 'successful-negative'),
      });
      assert.equal(result.status, 0, result.stderr);
      const receipt = JSON.parse(fs.readFileSync(path.join(entry.candidate, 'artifacts/cnb-browser/negative-receipt.json'), 'utf8'));
      assert.equal(receipt.status, 'EXPECTED_RED_VERIFIED');
      assert.deepEqual(receipt.diagnostics, []);
      assert.equal(receipt.reportPresent, true);
      assert.deepEqual(Object.keys(receipt.attachments).sort(), ['screenshot', 'trace']);
      assert.ok(fs.existsSync(path.join(entry.candidate, receipt.outputRoot, receipt.attachments.screenshot.path)));
      receipts.push(receipt);
    }
    assert.notEqual(receipts[0].runId, receipts[1].runId);
    assert.notEqual(receipts[0].outputRoot, receipts[1].outputRoot);
  } finally {
    fs.rmSync(entry.root, {recursive: true, force: true});
  }
});
