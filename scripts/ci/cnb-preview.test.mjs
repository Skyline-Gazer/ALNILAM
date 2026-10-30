import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
test('preview rejects malformed encoding without terminating the server', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-preview-'));
  fs.writeFileSync(path.join(root, 'index.html'), 'healthy');
  const child = spawn(process.execPath, ['scripts/preview-server.mjs', '--root', root, '--port', '0']);
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Preview startup timed out')), 5000);
      child.stdout.on('data', chunk => {const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if (match) {clearTimeout(timer);resolve(match[0]);}});
      child.once('error', reject);
    });
    assert.equal((await fetch(`${origin}/%E0%A4%A`)).status, 400);
    assert.equal(await (await fetch(`${origin}/`)).text(), 'healthy');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(root, {recursive: true, force: true});
  }
});
