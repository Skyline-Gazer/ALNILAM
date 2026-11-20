import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, open, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { perFileLimit, prepare, quotaExceeded } from './cnb-evidence-attachments.mjs';

const cli = fileURLToPath(new URL('./cnb-evidence-attachments.mjs', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'cnb-evidence-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const download = path.join(root, 'download');
  await mkdir(download);
  const archive = path.join(root, 'evidence.tar.gz');
  const manifest = path.join(root, 'manifest.json');
  const contents = Buffer.from('Evidence attachment contents\nwith a second line.\n');
  await writeFile(archive, contents);
  const prepared = run('prepare', archive, manifest);
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.deepEqual(JSON.parse(prepared.stdout), { manifest, attachments: [archive] });
  assert.deepEqual(JSON.parse(await readFile(manifest, 'utf8')), {
    version: 1,
    file: path.basename(archive),
    bytes: contents.length,
    sha256: sha256(contents),
    parts: [{ file: path.basename(archive), bytes: contents.length, sha256: sha256(contents) }],
  });
  await copyFile(manifest, path.join(download, path.basename(manifest)));
  await copyFile(archive, path.join(download, path.basename(archive)));
  return { archive, contents, download, manifest };
}

async function multipart(f) {
  const chunks = [f.contents.subarray(0, 13), f.contents.subarray(13)];
  const parts = chunks.map((chunk, index) => ({
    file: `evidence.tar.gz.part${String(index + 1).padStart(4, '0')}`,
    bytes: chunk.length,
    sha256: sha256(chunk),
  }));
  const manifest = {
    version: 1,
    file: path.basename(f.archive),
    bytes: f.contents.length,
    sha256: sha256(f.contents),
    parts,
  };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(f.manifest, serialized);
  await writeFile(path.join(f.download, path.basename(f.manifest)), serialized);
  await Promise.all(parts.map((part, index) => writeFile(path.join(f.download, part.file), chunks[index])));
  return parts;
}

test('prepare and verify a retrieved evidence attachment', async t => {
  const f = await fixture(t);
  const result = run('verify', f.manifest, f.download);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified downloaded commit attachments: evidence\.tar\.gz/);
  assert.match(result.stdout, new RegExp(sha256(f.contents)));
});

test('verify reconstructs and checks multiple downloaded parts', async t => {
  const f = await fixture(t);
  await multipart(f);
  const result = run('verify', f.manifest, f.download);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(sha256(f.contents)));
});

test('verify rejects a missing downloaded part', async t => {
  const f = await fixture(t);
  const parts = await multipart(f);
  await unlink(path.join(f.download, parts[1].file));
  const result = run('verify', f.manifest, f.download);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT/);
  assert.match(result.stderr, /part0002/);
});

test('verify rejects a corrupt downloaded part of the same size', async t => {
  const f = await fixture(t);
  const parts = await multipart(f);
  await writeFile(path.join(f.download, parts[0].file), Buffer.alloc(parts[0].bytes, 0));
  const result = run('verify', f.manifest, f.download);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Downloaded evidence mismatch: evidence\.tar\.gz\.part0001/);
});

test('verify rejects a tampered downloaded manifest', async t => {
  const f = await fixture(t);
  const downloadedManifest = path.join(f.download, path.basename(f.manifest));
  const manifest = JSON.parse(await readFile(downloadedManifest, 'utf8'));
  manifest.sha256 = '0'.repeat(64);
  await writeFile(downloadedManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = run('verify', f.manifest, f.download);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Downloaded manifest differs from local manifest/);
});

test('verify rejects a manifest with an incorrect reconstructed digest', async t => {
  const f = await fixture(t);
  await multipart(f);
  const manifest = JSON.parse(await readFile(f.manifest, 'utf8'));
  manifest.sha256 = '0'.repeat(64);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(f.manifest, serialized);
  await writeFile(path.join(f.download, path.basename(f.manifest)), serialized);
  const result = run('verify', f.manifest, f.download);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Downloaded evidence does not reconstruct the original/);
});

test('prepare splits at 90 MiB and verify reconstructs the original', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'cnb-evidence-split-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const download = path.join(root, 'download');
  await mkdir(download);
  const archive = path.join(root, 'large.tar.gz');
  const manifest = path.join(root, 'manifest.json');
  const boundary = 90 * 1024 * 1024;
  const file = await open(archive, 'w');
  try {
    await file.truncate(boundary + 1);
    await file.write(Buffer.from([0x42]), 0, 1, boundary - 1);
    await file.write(Buffer.from([0x7f]), 0, 1, boundary);
  } finally {
    await file.close();
  }
  await prepare(archive, manifest, download);
  const actual = JSON.parse(await readFile(manifest, 'utf8'));
  assert.deepEqual(actual.parts.map(part => [part.file, part.bytes]), [
    ['large.tar.gz.part0001', boundary],
    ['large.tar.gz.part0002', 1],
  ]);
  assert.deepEqual(await readFile(path.join(download, actual.parts[1].file)), Buffer.from([0x7f]));
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  assert.equal(actual.sha256, hash.digest('hex'));
  await copyFile(manifest, path.join(download, path.basename(manifest)));
  const result = run('verify', manifest, download);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(actual.sha256));
});

test('upload failure classifiers distinguish per-file limits from quota and unrelated errors', () => {
  for (const message of [
    'errmsg: single-file maximum size 100 MB exceeded',
    'errmsg: 单个附件超过最大限制 100兆',
  ]) {
    assert.equal(perFileLimit(message), true, message);
    assert.equal(quotaExceeded(message), false, message);
  }
  for (const message of [
    'errmsg: storage quota limit exceeded, single-file maximum size 100 MB',
    'errmsg: 存储空间不足',
  ]) {
    assert.equal(perFileLimit(message), false, message);
    assert.equal(quotaExceeded(message), true, message);
  }
  for (const message of ['HTTP 413', 'single-file maximum size 100 MB exceeded', 'errmsg: request failed']) {
    assert.equal(perFileLimit(message), false, message);
    assert.equal(quotaExceeded(message), false, message);
  }
});
