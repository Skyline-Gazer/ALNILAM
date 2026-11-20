import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Trusted tests are copied away from the candidate; product code must come
// from the candidate working directory, not the directory containing this test.
const product = await import(pathToFileURL(path.join(process.cwd(), 'apps/web/src/lib/bangumi.mjs')).href);
const apiNames = ['loadBangumiCollections', 'readBangumiSnapshot', 'materializeBangumiCovers'];
const snapshotAvailable = apiNames.some(name => name in product);
test('snapshot API is complete when present', {skip: !snapshotAvailable && 'snapshot API not yet present'}, () => {
  for (const name of apiNames) assert.equal(typeof product[name], 'function', name);
});

const snapshotTest = (name, fn) => test(name, {skip: !snapshotAvailable && 'snapshot API not yet present'}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bangumi-trusted-'));
  const oldCache = process.env.ALNILAM_BANGUMI_CACHE;
  const oldStage = process.env.ALNILAM_BANGUMI_ASSET_STAGE;
  process.env.ALNILAM_BANGUMI_CACHE = path.join(root, 'cache');
  delete process.env.ALNILAM_BANGUMI_ASSET_STAGE;
  try { await fn(root); } finally {
    if (oldCache === undefined) delete process.env.ALNILAM_BANGUMI_CACHE;
    else process.env.ALNILAM_BANGUMI_CACHE = oldCache;
    if (oldStage === undefined) delete process.env.ALNILAM_BANGUMI_ASSET_STAGE;
    else process.env.ALNILAM_BANGUMI_ASSET_STAGE = oldStage;
    fs.rmSync(root, {recursive: true, force: true});
  }
});

const config = {enabled: true, userId: 'reader', subjectType: 'anime', limit: 5};
const entry = (image = '') => ({
  subject_type: 2, type: 3, comment: 'A comment', updated_at: '2026-01-02',
  subject: {id: 42, name: 'Original', name_cn: 'Translated', short_summary: 'A summary', images: image ? {large: image} : {}},
});
const response = data => new Response(JSON.stringify({data}), {headers: {'content-type': 'application/json'}});
const unavailable = async () => { throw new Error('private provider detail'); };

snapshotTest('successful snapshot survives provider failure and is scoped', async () => {
  const calls = [];
  const result = await product.loadBangumiCollections(config, {fetch: async url => {
    calls.push(new URL(url));
    return response([entry()]);
  }});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].origin, 'https://api.bgm.tv');
  assert.equal(calls[0].pathname, '/v0/users/reader/collections');
  assert.equal(calls[0].searchParams.get('subject_type'), '2');
  assert.equal(calls[0].searchParams.get('limit'), '5');
  assert.equal(result.stale, false);
  assert.equal(result.error, null);
  assert.deepEqual(result.collections, [{name: 'Original', nameCn: 'Translated', cover: '', href: 'https://bgm.tv/subject/42', summary: 'A summary', comment: 'A comment', updatedAt: '2026-01-02', category: 'anime', status: 'doing'}]);
  assert.deepEqual(product.readBangumiSnapshot(config), result.collections);
  const stale = await product.loadBangumiCollections(config, {fetch: unavailable});
  assert.deepEqual(stale.collections, result.collections);
  assert.equal(stale.stale, true);
  assert.ok(stale.error);
  assert.doesNotMatch(stale.error, /private provider detail/);
  for (const different of [{...config, userId: 'other'}, {...config, subjectType: 'book'}, {...config, limit: 4}]) {
    const missing = await product.loadBangumiCollections(different, {fetch: unavailable});
    assert.deepEqual(missing.collections, []);
    assert.equal(missing.stale, false);
    assert.ok(missing.error);
  }
});

snapshotTest('empty successful data replaces prior data and remains a valid stale snapshot', async () => {
  await product.loadBangumiCollections(config, {fetch: async () => response([entry()])});
  const empty = await product.loadBangumiCollections(config, {fetch: async () => response([])});
  assert.deepEqual(empty, {collections: [], stale: false, error: null});
  const stale = await product.loadBangumiCollections(config, {fetch: unavailable});
  assert.deepEqual(stale.collections, []);
  assert.equal(stale.stale, true);
  assert.ok(stale.error);
});

snapshotTest('provider errors and malformed data do not replace the last valid snapshot', async () => {
  const good = await product.loadBangumiCollections(config, {fetch: async () => response([entry()])});
  for (const fetch of [
    unavailable,
    async () => new Response('', {status: 503}),
    async () => new Response('not json'),
    async () => new Response(JSON.stringify({data: {}})),
    async () => response([{subject: {id: 0, name: 'bad'}}]),
  ]) {
    const failed = await product.loadBangumiCollections(config, {fetch});
    assert.equal(failed.stale, true);
    assert.ok(failed.error);
    assert.deepEqual(failed.collections, good.collections);
    assert.deepEqual(product.readBangumiSnapshot(config), good.collections);
  }
});

snapshotTest('covers are downloaded, cached and materialized, and failed downloads preserve the snapshot', async root => {
  const coverUrl = 'https://lain.bgm.tv/pic/cover/example.png';
  const bytes = Buffer.from('trusted-cover-bytes');
  const calls = [];
  const result = await product.loadBangumiCollections(config, {fetch: async url => {
    calls.push(String(url));
    if (String(url).startsWith('https://api.bgm.tv/')) return response([entry(coverUrl)]);
    assert.equal(String(url), coverUrl);
    return new Response(bytes, {headers: {'content-type': 'image/png'}});
  }});
  assert.equal(calls.length, 2);
  assert.equal(calls[1], coverUrl);
  assert.equal(result.error, null);
  const cover = result.collections[0].cover;
  assert.match(cover, /^\/bangumi-covers\/[a-f0-9]{32}\.png$/);
  const output = path.join(root, 'output');
  const files = product.materializeBangumiCovers(output, result.collections);
  assert.deepEqual(files, [path.basename(cover)]);
  assert.deepEqual(fs.readFileSync(path.join(output, 'bangumi-covers', files[0])), bytes);
  const failed = await product.loadBangumiCollections(config, {fetch: async url => {
    if (String(url).startsWith('https://api.bgm.tv/')) return response([entry(coverUrl)]);
    return new Response('', {status: 503});
  }});
  assert.equal(failed.stale, true);
  assert.ok(failed.error);
  assert.deepEqual(failed.collections, result.collections);
  fs.rmSync(path.join(root, 'cache', 'covers', files[0]));
  assert.equal(product.readBangumiSnapshot(config)[0].cover, '');
});

snapshotTest('untrusted cover URLs are rejected without requesting them', async () => {
  let calls = 0;
  const failed = await product.loadBangumiCollections(config, {fetch: async () => {
    calls++;
    return response([entry('https://example.com/cover.png')]);
  }});
  assert.equal(calls, 1);
  assert.deepEqual(failed.collections, []);
  assert.equal(failed.stale, false);
  assert.ok(failed.error);
});

snapshotTest('disabled and unconfigured collections do not contact the provider', async () => {
  let calls = 0;
  const never = async () => { calls++; throw new Error('unexpected provider request'); };
  assert.deepEqual(await product.loadBangumiCollections({...config, enabled: false}, {fetch: never}), {collections: [], stale: false, error: null});
  const missing = await product.loadBangumiCollections({...config, userId: ''}, {fetch: never});
  assert.deepEqual(missing.collections, []);
  assert.equal(missing.stale, false);
  assert.ok(missing.error);
  assert.equal(calls, 0);
});
