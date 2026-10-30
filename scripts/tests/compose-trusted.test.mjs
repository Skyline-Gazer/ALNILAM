import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('external trusted toolchain runs its own CLI from the candidate workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alnilam-trusted-compose-'));
  const candidate = path.join(root, 'candidate');
  const tools = path.join(root, 'tools');
  const site = path.join(candidate, 'sites/demo');
  const output = path.join(root, 'output');
  const log = path.join(root, 'tools.log');
  const sourceRoot = process.env.CNB_TRUSTED_SOURCE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    fs.mkdirSync(path.join(site, 'content/posts'), {recursive: true});
    fs.mkdirSync(path.join(candidate, 'apps/web'), {recursive: true});
    fs.writeFileSync(path.join(site, 'alnilam.config.toml'), 'fixture');
    const astro = path.join(tools, 'apps/web/node_modules/astro/bin/astro.mjs');
    const pagefind = path.join(tools, 'apps/web/node_modules/pagefind/lib/runner/bin.cjs');
    fs.mkdirSync(path.dirname(astro), {recursive: true});
    fs.mkdirSync(path.dirname(pagefind), {recursive: true});
    fs.writeFileSync(astro, `import fs from 'node:fs';
fs.appendFileSync(process.env.TOOL_LOG, JSON.stringify({tool:'astro', cwd:process.cwd(), args:process.argv.slice(2)})+'\\n');
fs.writeFileSync(process.env.ALNILAM_OUTPUT_DIR + '/index.html', 'fixture');`);
    fs.writeFileSync(pagefind, `const fs = require('node:fs');
fs.appendFileSync(process.env.TOOL_LOG, JSON.stringify({tool:'pagefind', cwd:process.cwd(), args:process.argv.slice(2)})+'\\n');`);
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'pnpm'), '#!/bin/sh\nexit 61\n', {mode: 0o755});
    const result = spawnSync(process.execPath, [path.join(sourceRoot, 'scripts/compose.mjs'), '--site', site, '--out', output], {
      cwd: candidate, encoding: 'utf8',
      env: {...process.env, PATH: bin + path.delimiter + process.env.PATH, ALNILAM_REPO_ROOT: candidate,
        ALNILAM_TOOLCHAIN_ROOT: tools, ALNILAM_CORE_REV: 'fixture', TOOL_LOG: log},
    });
    assert.equal(result.status, 0, result.stderr);
    const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map(call => call.tool), ['astro', 'pagefind']);
    assert.ok(calls.every(call => call.cwd === candidate));
    assert.deepEqual(calls[0].args, ['build', '--root', path.join(candidate, 'apps/web')]);
    assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'fixture');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
