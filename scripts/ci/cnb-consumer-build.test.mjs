import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('consumer builds use target-owned tools even when the candidate supplies an override', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-toolchain-'));
  const candidate = path.join(root, 'candidate');
  const target = path.join(root, 'target');
  const tests = path.join(root, 'trusted-tests');
  const log = path.join(root, 'compose-calls.jsonl');
  const sourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    fs.mkdirSync(path.join(candidate, 'sites/demo/content/posts'), {recursive: true});
    fs.writeFileSync(path.join(candidate, 'sites/demo/alnilam.config.toml'), 'fixture');
    fs.mkdirSync(path.join(tests, 'scripts/tests'), {recursive: true});
    fs.mkdirSync(path.join(tests, 'scripts/ci'), {recursive: true});
    fs.writeFileSync(path.join(tests, 'scripts/tests/fixture.test.mjs'), '');
    const bootstrap = path.join(root, 'stub.mjs');
    fs.writeFileSync(bootstrap, `
import child from 'node:child_process';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
child.spawnSync = (command, args, options) => {
  if (args.some(arg => String(arg).endsWith('/scripts/compose.mjs'))) {
    fs.appendFileSync(process.env.CNB_TEST_LOG, JSON.stringify({
      repo: options.env.ALNILAM_REPO_ROOT, tools: options.env.ALNILAM_TOOLCHAIN_ROOT,
    }) + '\\n');
  }
  return {status: 0, signal: null};
};
child.execFileSync = () => 'c'.repeat(40);
syncBuiltinESMExports();
`);
    for (const override of [undefined, candidate]) {
      fs.rmSync(log, {force: true});
      const result = spawnSync(process.execPath, ['--import', bootstrap, path.join(sourceRoot, 'scripts/ci/cnb-consumer-build.mjs')], {
        cwd: candidate,
        encoding: 'utf8',
        env: {...process.env, CNB_TRUSTED_SOURCE_ROOT: target, CNB_TRUSTED_TEST_ROOT: tests,
          CNB_TEST_LOG: log, ALNILAM_TOOLCHAIN_ROOT: override},
      });
      assert.equal(result.status, 0, result.stderr);
      const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(calls.length, 3);
      for (const call of calls) assert.deepEqual(call, {repo: candidate, tools: target});
    }
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
