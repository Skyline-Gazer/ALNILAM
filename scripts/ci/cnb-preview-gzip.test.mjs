import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';

async function bootPreview(root) {
  const child = spawn(process.execPath, ['scripts/preview-server.mjs', '--root', root, '--port', '0']);
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Preview startup timed out')), 5000);
    child.stdout.on('data', chunk => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.once('error', reject);
  });
  return {child, origin};
}

function request(origin, headers) {
  const url = new URL(origin + '/');
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview gzips compressible bodies when Accept-Encoding includes gzip', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-preview-gzip-'));
  const body = 'a'.repeat(2048);
  fs.writeFileSync(path.join(root, 'index.html'), body);
  const {child, origin} = await bootPreview(root);
  try {
    const compressed = await request(origin, {'Accept-Encoding': 'gzip'});
    assert.equal(compressed.status, 200);
    assert.equal(compressed.headers['content-encoding'], 'gzip');
    assert.match(String(compressed.headers['content-type'] ?? ''), /text\/html/);
    assert.equal(zlib.gunzipSync(compressed.body).toString('utf8'), body);

    const plain = await request(origin, {'Accept-Encoding': 'identity'});
    assert.equal(plain.status, 200);
    assert.equal(plain.headers['content-encoding'], undefined);
    assert.equal(plain.body.toString('utf8'), body);

    const refused = await request(origin, {'Accept-Encoding': 'gzip;q=0, identity'});
    assert.equal(refused.headers['content-encoding'], undefined);
    assert.equal(refused.headers.vary, 'Accept-Encoding');
    assert.equal(refused.body.toString('utf8'), body);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(root, {recursive: true, force: true});
  }
});
