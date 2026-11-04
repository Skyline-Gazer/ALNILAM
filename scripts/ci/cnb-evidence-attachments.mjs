#!/usr/bin/env node
// Commit attachments are uploaded and downloaded by cnbcool/attachments. Keep the
// locally generated manifest outside the plugin's download directory for verification.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, open, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PART_BYTES = 90 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;

async function digest(file) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}

function validName(name) {
  return typeof name === 'string' && name !== '.' && name !== '..' &&
    path.basename(name) === name && !/[\\/\0,\n\r*?\[\]{}!]/.test(name);
}

function validate(manifest) {
  if (manifest?.version !== 1 || !validName(manifest.file) ||
      !Number.isSafeInteger(manifest.bytes) || manifest.bytes < 0 ||
      !SHA256.test(manifest.sha256) || !Array.isArray(manifest.parts) || !manifest.parts.length) {
    throw new Error('Invalid evidence manifest');
  }
  const names = new Set();
  let total = 0;
  for (const part of manifest.parts) {
    if (!validName(part.file) || names.has(part.file) ||
        !Number.isSafeInteger(part.bytes) || part.bytes < 0 || !SHA256.test(part.sha256)) {
      throw new Error('Invalid evidence manifest part');
    }
    names.add(part.file);
    total += part.bytes;
  }
  if (!Number.isSafeInteger(total) || total !== manifest.bytes ||
      (manifest.parts.length === 1 && manifest.parts[0].file === manifest.file &&
        manifest.parts[0].sha256 !== manifest.sha256)) {
    throw new Error('Inconsistent evidence manifest');
  }
}

async function split(file, directory, name) {
  const parts = [];
  const source = await open(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let offset = 0;
    let index = 0;
    const size = (await source.stat()).size;
    while (offset < size) {
      const partName = `${name}.part${String(++index).padStart(4, '0')}`;
      const output = await open(path.join(directory, partName), 'wx');
      const hash = createHash('sha256');
      let bytes = 0;
      try {
        while (bytes < PART_BYTES && offset < size) {
          const { bytesRead } = await source.read(buffer, 0, Math.min(buffer.length, PART_BYTES - bytes, size - offset), offset);
          if (!bytesRead) throw new Error('Evidence file changed while splitting');
          const chunk = buffer.subarray(0, bytesRead);
          hash.update(chunk);
          let written = 0;
          while (written < bytesRead) {
            const result = await output.write(chunk, written, bytesRead - written);
            if (!result.bytesWritten) throw new Error('Unable to write evidence part');
            written += result.bytesWritten;
          }
          bytes += bytesRead;
          offset += bytesRead;
        }
      } finally {
        await output.close();
      }
      parts.push({ file: partName, bytes, sha256: hash.digest('hex') });
    }
  } finally {
    await source.close();
  }
  return parts;
}

export async function prepare(file, manifestPath, splitDirectory) {
  const name = path.basename(file);
  if (!validName(name) || !validName(path.basename(manifestPath)) || name === path.basename(manifestPath)) {
    throw new Error('Evidence and manifest need distinct, plugin-safe filenames');
  }
  const original = await digest(file);
  let parts = [{ file: name, ...original }];
  if (splitDirectory) {
    if (original.bytes <= PART_BYTES) throw new Error('Evidence is no larger than one 90 MiB part');
    parts = await split(file, splitDirectory, name);
    const current = await digest(file);
    if (current.bytes !== original.bytes || current.sha256 !== original.sha256) throw new Error('Evidence changed while splitting');
  }
  const manifest = { version: 1, file: name, ...original, parts };
  validate(manifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ manifest: manifestPath, attachments: parts.map(part => splitDirectory ? path.join(splitDirectory, part.file) : file) }));
}

async function verify(manifestPath, downloadDirectory) {
  const expectedBytes = await readFile(manifestPath);
  const manifest = JSON.parse(expectedBytes);
  validate(manifest);
  const manifestName = path.basename(manifestPath);
  if (!validName(manifestName) || manifest.parts.some(part => part.file === manifestName)) throw new Error('Invalid manifest filename');
  if (path.resolve(manifestPath) === path.resolve(downloadDirectory, manifestName)) throw new Error('Keep the trusted manifest outside the download directory');
  const downloadedManifest = await readFile(path.join(downloadDirectory, manifestName));
  if (!expectedBytes.equals(downloadedManifest)) throw new Error('Downloaded manifest differs from local manifest');
  const fullHash = createHash('sha256');
  let total = 0;
  for (const part of manifest.parts) {
    const file = path.join(downloadDirectory, part.file);
    if (!(await stat(file)).isFile()) throw new Error(`Not a file: ${part.file}`);
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of createReadStream(file)) {
      bytes += chunk.length;
      total += chunk.length;
      hash.update(chunk);
      fullHash.update(chunk);
    }
    if (bytes !== part.bytes || hash.digest('hex') !== part.sha256) throw new Error(`Downloaded evidence mismatch: ${part.file}`);
  }
  if (total !== manifest.bytes || fullHash.digest('hex') !== manifest.sha256) throw new Error('Downloaded evidence does not reconstruct the original');
  console.log(`Verified downloaded commit attachments: ${manifest.file} (${total} bytes, SHA-256 ${manifest.sha256})`);
}

const [command, ...args] = process.argv.slice(2);
// Only a response explicitly describing a single-file size maximum permits splitting.
// HTTP 413 alone and storage/account quotas do not identify a per-file limit.
export function perFileLimit(log) {
  const messages = [...log.matchAll(/errmsg:([^\r\n]*)/gi)].map(match => match[1]);
  return messages.some(message =>
    !/(quota|storage|capacity|空间|配额|总量|总容量|总大小)/i.test(message) &&
    /(per[ -]?file|single[ -]?file|individual file|单个文件|单文件|单个附件|单附件)/i.test(message) &&
    /(limit|maximum|max(?:imum)? size|exceed|限制|上限|最大|超过)/i.test(message) &&
    /100\s*(?:m(?:i?b)?|兆)/i.test(message));
}

export function quotaExceeded(log) {
  return [...log.matchAll(/errmsg:([^\r\n]*)/gi)].some(match =>
    /(quota|storage|capacity|空间|配额|总量|总容量|总大小)/i.test(match[1]) &&
    /(limit|exceed|full|insufficient|限制|上限|超过|不足|已满)/i.test(match[1]));
}

async function plugin(type, attachments, cwd, commit) {
  const env = { ...process.env, PLUGIN_TYPE: type, PLUGIN_ATTACHMENTS: JSON.stringify(attachments), PLUGIN_COMMIT: commit, CNB_IS_TAG: 'false' };
  delete env.PLUGIN_TAG;
  return await new Promise((resolve, reject) => {
    const child = spawn('/plugins/dist/entrypoint.js', [], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    const collect = chunk => { if (log.length < 1024 * 1024) log += chunk.toString().slice(0, 1024 * 1024 - log.length); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('close', code => resolve({ ok: code === 0, log }));
  });
}

async function deliver(archive, commit) {
  if (!/^[a-f0-9]{40,64}$/i.test(commit)) throw new Error('A full commit SHA is required');
  const name = path.basename(archive);
  if (!validName(name)) throw new Error('Invalid evidence filename');
  const root = await mkdtemp(path.join(tmpdir(), 'cnb-evidence-'));
  try {
    const uploadDir = path.join(root, 'upload');
    const downloadDir = path.join(root, 'download');
    const trustedDir = path.join(root, 'trusted');
    await Promise.all([mkdir(uploadDir), mkdir(downloadDir), mkdir(trustedDir)]);
    const localArchive = path.join(uploadDir, name);
    const manifestName = `${name}.manifest.json`;
    const manifestPath = path.join(trustedDir, manifestName);
    await copyFile(archive, localArchive);
    await prepare(localArchive, manifestPath);
    let result = await plugin('UPLOAD', [name], uploadDir, commit);
    if (!result.ok) {
      if (quotaExceeded(result.log)) throw new Error('Archive upload failed: storage quota or capacity exceeded; splitting cannot resolve total quota');
      if (!perFileLimit(result.log)) throw new Error('Archive upload failed; no confirmed per-file 100 MB limit');
      await unlink(manifestPath);
      await prepare(localArchive, manifestPath, uploadDir);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      for (const part of manifest.parts) {
        result = await plugin('UPLOAD', [part.file], uploadDir, commit);
        if (!result.ok) throw new Error(`Evidence part upload failed: ${part.file}`);
      }
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await copyFile(manifestPath, path.join(uploadDir, manifestName));
    result = await plugin('UPLOAD', [manifestName], uploadDir, commit);
    if (!result.ok) throw new Error('Evidence manifest upload failed');
    for (const file of [...manifest.parts.map(part => part.file), manifestName]) {
      result = await plugin('DOWNLOAD', [file], downloadDir, commit);
      if (!result.ok) throw new Error(`Evidence download failed: ${file}`);
    }
    await verify(manifestPath, downloadDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (command === 'prepare' && args.length === 2) await prepare(args[0], args[1]);
    else if (command === 'verify' && args.length === 2) await verify(args[0], args[1]);
    else if (command === 'deliver' && args.length === 2) await deliver(args[0], args[1]);
    else throw new Error('Usage: prepare <archive> <manifest> | verify <local-manifest> <download-directory> | deliver <archive> <commit-sha>');
  } catch (error) {
    console.error(`Evidence attachments: ${error.message}`);
    process.exitCode = 1;
  }
}
