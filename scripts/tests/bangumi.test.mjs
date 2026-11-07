import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadBangumiCollections, materializeBangumiCovers } from "../../apps/web/src/lib/bangumi.mjs";

const config = { userId: "fixture-user", subjectType: "anime", limit: 10 };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aZkAAAAASUVORK5CYII=", "base64");
const entry = (id, subjectType, cover = false, status = 2) => ({
  subject_type: subjectType,
  type: status,
  subject: {
    id, type: subjectType, name: `Fixture ${id}`, name_cn: `测试 ${id}`, short_summary: "Summary",
    ...(cover ? {
      images: { common: typeof cover === "string" ? cover : "https://lain.bgm.tv/pic/cover/fixture.png" },
    } : {}),
  },
  comment: "Seen", updated_at: "2024-01-01T00:00:00Z",
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-bangumi-test-"));
  const previousCache = process.env.ALNILAM_CACHE_DIR;
  const previousBangumiCache = process.env.ALNILAM_BANGUMI_CACHE;
  const previousFetch = globalThis.fetch;
  process.env.ALNILAM_CACHE_DIR = root;
  delete process.env.ALNILAM_BANGUMI_CACHE;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousCache === undefined) delete process.env.ALNILAM_CACHE_DIR;
    else process.env.ALNILAM_CACHE_DIR = previousCache;
    if (previousBangumiCache === undefined) delete process.env.ALNILAM_BANGUMI_CACHE;
    else process.env.ALNILAM_BANGUMI_CACHE = previousBangumiCache;
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function respond(data, requests = []) {
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).startsWith("https://api.bgm.tv/")) return Response.json({ data });
    if (String(url) === "https://lain.bgm.tv/pic/cover/fixture.png") {
      return new Response(png, { headers: { "content-type": "image/png" } });
    }
    throw new Error(`Unexpected fixture request: ${url}`);
  };
}

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

test("successful collection maps categories and downloads local covers", async (t) => {
  const root = fixture(t);
  const requests = [];
  respond([entry(7, 2, true, 3), entry(8, 2, false, 1)], requests);
  const result = await loadBangumiCollections(config);
  assert.equal(result.stale, false);
  assert.ok(!result.error);
  assert.equal(result.collections.length, 2);
  const [first, second] = result.collections;
  assert.equal(first.nameCn, "测试 7");
  assert.equal(first.name, "Fixture 7");
  assert.equal(first.summary, "Summary");
  assert.equal(first.comment, "Seen");
  assert.equal(first.updatedAt, "2024-01-01T00:00:00Z");
  assert.equal(first.href, "https://bgm.tv/subject/7");
  assert.match(first.cover, /^\/bangumi-covers\/[^/]+\.png$/);
  assert.equal(second.cover, "");
  assert.equal(first.category, "anime");
  assert.equal(second.category, "anime");
  assert.equal(first.status, "doing");
  assert.equal(second.status, "wish");
  const api = new URL(requests[0].url);
  assert.equal(api.pathname, "/v0/users/fixture-user/collections");
  assert.equal(api.searchParams.get("subject_type"), "2");
  assert.equal(api.searchParams.get("limit"), "10");
  assert.equal(requests[0].options.headers.Accept, "application/json");
  assert.ok(requests[0].options.signal instanceof AbortSignal);
  assert.equal(requests.length, 2, "one API request and one trusted cover download");
  const cachedCover = filesUnder(root).find((file) => fs.readFileSync(file).equals(png));
  assert.ok(cachedCover?.includes(`${path.sep}covers${path.sep}`), "cover bytes are cached for static output");
  const output = path.join(root, "output");
  materializeBangumiCovers(output, result.collections);
  const published = path.join(output, first.cover.slice(1));
  assert.deepEqual(fs.readFileSync(published), png);
  assert.equal(fs.statSync(published).mode & 0o444, 0o444);
  fs.chmodSync(published, 0o444);
  materializeBangumiCovers(output, result.collections);
  assert.equal(fs.statSync(published).mode & 0o777, 0o444, "existing covers retain their permissions");
  assert.doesNotMatch(JSON.stringify(result.collections), /lain\.bgm\.tv|api\.bgm\.tv/);
});

test("each configured subject type maps to its category", async (t) => {
  fixture(t);
  for (const [subjectType, code] of [["book", 1], ["anime", 2], ["music", 3], ["game", 4]]) {
    const requests = [];
    respond([entry(100 + code, code)], requests);
    const result = await loadBangumiCollections({ ...config, subjectType });
    assert.equal(result.collections[0].category, subjectType);
    assert.equal(new URL(requests[0].url).searchParams.get("subject_type"), String(code));
  }
});

test("collection status is independent from subject category", async (t) => {
  fixture(t);
  const page = fs.readFileSync(new URL("../../apps/web/src/modules/bangumi.astro", import.meta.url), "utf8");
  const labelsMatch = page.match(/const STATUS_LABELS: Record<string, string> = (\{[^\n]+\});/);
  assert.ok(labelsMatch, "page defines translated status labels");
  const labels = JSON.parse(labelsMatch[1]);
  assert.match(page, /c\.status && STATUS_LABELS\[c\.status\] && <p[^>]*bangumi-status[^>]*>\{STATUS_LABELS\[c\.status\]\}<\/p>/);
  for (const [code, status, label] of [[1, "wish", "想收藏"], [2, "collected", "已完成"], [3, "doing", "进行中"], [4, "onHold", "搁置"], [5, "dropped", "抛弃"]]) {
    respond([entry(200 + code, 2, false, code)]);
    const result = await loadBangumiCollections(config);
    assert.equal(result.collections[0].category, "anime");
    assert.equal(result.collections[0].status, status);
    assert.equal(labels[result.collections[0].status], label);
  }
  const missing = entry(300, 2);
  delete missing.type;
  respond([missing]);
  const result = await loadBangumiCollections(config);
  assert.equal(result.collections[0].status, "");
});

test("empty success replaces an earlier snapshot", async (t) => {
  fixture(t);
  respond([entry(7, 2)]);
  await loadBangumiCollections(config);
  respond([]);
  const empty = await loadBangumiCollections(config);
  assert.deepEqual(empty.collections, []);
  assert.equal(empty.stale, false);
  assert.ok(!empty.error);
  globalThis.fetch = async () => { throw new Error("offline"); };
  const recovered = await loadBangumiCollections(config);
  assert.deepEqual(recovered.collections, []);
  assert.equal(recovered.stale, true);
});

test("network and malformed responses retain the last valid snapshot", async (t) => {
  const root = fixture(t);
  respond([entry(7, 2)]);
  const good = await loadBangumiCollections(config);
  const cached = () => new Map(filesUnder(root).map((file) => [file, fs.readFileSync(file).toString("hex")]));
  const before = cached();
  globalThis.fetch = async () => { throw new Error("offline credential-secret"); };
  const offline = await loadBangumiCollections(config);
  assert.equal(offline.stale, true);
  assert.ok(offline.error);
  assert.deepEqual(offline.collections, good.collections);
  assert.doesNotMatch(JSON.stringify(offline), /credential-secret/);
  assert.deepEqual(cached(), before, "a failed fetch must not rewrite the valid snapshot");
  globalThis.fetch = async () => Response.json({ data: "invalid" });
  const malformed = await loadBangumiCollections(config);
  assert.equal(malformed.stale, true);
  assert.deepEqual(malformed.collections, good.collections);
  assert.deepEqual(cached(), before, "malformed data must not replace the valid snapshot");
});
test("prototype keys in subject types cannot replace the last valid snapshot", async (t) => {
  const root = fixture(t);
  respond([entry(7, 2)]);
  const good = await loadBangumiCollections(config);
  const cached = () => new Map(filesUnder(root).map((file) => [file, fs.readFileSync(file).toString("hex")]));
  const before = cached();
  for (const type of ["constructor", "__proto__", "toString"]) {
    for (const field of ["subject_type", "type"]) {
      const invalid = entry(8, 2);
      if (field === "subject_type") invalid.subject_type = type;
      else {
        delete invalid.subject_type;
        invalid.subject.type = type;
      }
      respond([invalid]);
      const result = await loadBangumiCollections(config);
      assert.equal(result.stale, true, `${field}: ${type}`);
      assert.match(result.error, /malformed/);
      assert.deepEqual(result.collections, good.collections);
      assert.deepEqual(cached(), before, "invalid subject types must not rewrite the snapshot");
    }
  }
  globalThis.fetch = async () => { throw new Error("offline"); };
  const offline = await loadBangumiCollections(config);
  assert.equal(offline.stale, true);
  assert.deepEqual(offline.collections, good.collections);
});


test("cover download failure preserves the prior snapshot", async (t) => {
  fixture(t);
  respond([entry(7, 2, true)]);
  const good = await loadBangumiCollections(config);
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://api.bgm.tv/")) return Response.json({ data: [entry(8, 2, true)] });
    return new Response("unavailable", { status: 503 });
  };
  const failed = await loadBangumiCollections(config);
  assert.equal(failed.stale, true);
  assert.ok(failed.error);
  assert.deepEqual(failed.collections, good.collections);
  assert.doesNotMatch(JSON.stringify(failed), /unavailable|503/);
});

test("untrusted, credential-bearing and redirecting covers are rejected", async (t) => {
  fixture(t);
  respond([entry(7, 2)]);
  const good = await loadBangumiCollections(config);
  for (const coverUrl of [
    "https://user:b3adc0ffee@lain.bgm.tv/pic/cover/fixture.png",
    "https://evil.example/pic/cover/fixture.png",
    "http://lain.bgm.tv/pic/cover/fixture.png",
  ]) {
    const requests = [];
    globalThis.fetch = async (url) => {
      requests.push(String(url));
      if (String(url).startsWith("https://api.bgm.tv/")) {
        return Response.json({ data: [entry(8, 2, coverUrl)] });
      }
      throw new Error(`unexpected cover request: ${url}`);
    };
    const result = await loadBangumiCollections(config);
    assert.equal(result.stale, true);
    assert.deepEqual(result.collections, good.collections);
    assert.equal(requests.length, 1, "a rejected cover URL must not be requested");
    assert.doesNotMatch(JSON.stringify(result), /b3adc0ffee|evil\.example/);
  }

  let coverFetches = 0;
  const redirectRequests = [];
  globalThis.fetch = async (url) => {
    redirectRequests.push(String(url));
    if (String(url).startsWith("https://api.bgm.tv/")) {
      return Response.json({ data: [entry(9, 2, true)] });
    }
    coverFetches += 1;
    return new Response(null, { status: 302, headers: { location: "https://evil.example/pic/cover/fixture.png" } });
  };
  const redirected = await loadBangumiCollections(config);
  assert.equal(redirected.stale, true);
  assert.deepEqual(redirected.collections, good.collections);
  assert.equal(coverFetches, 1);
  assert.ok(!redirectRequests.some((url) => url.includes("evil.example")));
});

test("request timeout is reported as a safe provider failure", async (t) => {
  fixture(t);
  const timeout = new Error("internal deadline detail");
  timeout.name = "TimeoutError";
  globalThis.fetch = async () => { throw timeout; };
  const result = await loadBangumiCollections(config);
  assert.deepEqual(result.collections, []);
  assert.equal(result.stale, false);
  assert.match(result.error, /timed out/);
  assert.doesNotMatch(JSON.stringify(result), /internal deadline detail/);
});

test("failure without a snapshot is safe and snapshots are scoped by all query fields", async (t) => {
  const root = fixture(t);
  respond([entry(7, 2)]);
  await loadBangumiCollections(config);
  globalThis.fetch = async () => { throw new Error("credential-secret"); };
  for (const query of [
    { ...config, userId: "another-user" },
    { ...config, subjectType: "book" },
    { ...config, limit: 11 },
  ]) {
    const result = await loadBangumiCollections(query);
    assert.deepEqual(result.collections, []);
    assert.equal(result.stale, false);
    assert.ok(result.error);
    assert.doesNotMatch(JSON.stringify(result), /credential-secret/);
  }
  globalThis.fetch = async () => Response.json({ data: { unexpected: true } });
  const malformed = await loadBangumiCollections({ ...config, userId: "malformed-user" });
  assert.deepEqual(malformed.collections, []);
  assert.equal(malformed.stale, false);
  assert.ok(malformed.error);
  assert.doesNotMatch(JSON.stringify(malformed), /credential-secret|unexpected/);
  for (const file of filesUnder(root)) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /credential-secret/);
});
