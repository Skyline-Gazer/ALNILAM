import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchBangumiCollections } from "../../apps/web/src/lib/bangumi.mjs";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Bangumi maps a successful response and applies the request timeout", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return Response.json({
      data: [{
        subject: { id: 7, name: "Fixture", name_cn: "测试", short_summary: "Summary" },
        comment: "Seen",
      }],
    });
  };

  assert.deepEqual(await fetchBangumiCollections({ userId: "fixture-user" }), [{
    name: "Fixture",
    nameCn: "测试",
    cover: "",
    href: "https://bgm.tv/subject/7",
    summary: "Summary",
    comment: "Seen",
    updatedAt: "",
  }]);
  assert.equal(new URL(request.url).pathname, "/v0/users/fixture-user/collections");
  assert.equal(request.options.headers.Accept, "application/json");
  assert.ok(request.options.signal instanceof AbortSignal);
});

test("Bangumi provider errors propagate to the optional page boundary", async () => {
  globalThis.fetch = async () => new Response("fixture unavailable", { status: 503 });
  await assert.rejects(fetchBangumiCollections({ userId: "fixture-user" }), /Bangumi API 503/);
});

test("Bangumi fetch aborts on its deadline", async () => {
  let signal;
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  };
  const keepAlive = setTimeout(() => {}, 10_500);
  try {
    await assert.rejects(fetchBangumiCollections({ userId: "fixture-user" }), (error) => error.name === "TimeoutError");
  } finally {
    clearTimeout(keepAlive);
  }
  assert.ok(signal instanceof AbortSignal);
  assert.equal(signal.aborted, true);
});
