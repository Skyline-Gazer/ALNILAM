// Secrets boundary regressions (#56): the shipped pipeline must not publish
// injected marker values; provenance carries only its documented fields.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEMO = "sites/demo";

function* walk(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

test("shipped compose omits injected environment secret markers", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-secrets-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const markers = {
    ALNILAM_TEST_TOKEN: "ALNILAM-FAKE-TOKEN-deadbeef01",
    SITE_DEPLOY_SECRET: "ALNILAM-FAKE-SECRET-cafe0002",
  };
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ...markers, SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "compose failed: " + result.stderr);
  for (const file of walk(path.join(root, "out"))) {
    const bytes = fs.readFileSync(file);
    for (const [name, marker] of Object.entries(markers)) {
      assert.equal(
        bytes.includes(marker),
        false,
        `${path.relative(path.join(root, "out"), file)} contains the value of ${name}`,
      );
    }
  }
});

test("provenance carries only its documented fields", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-provkeys-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", DEMO, "--out", path.join(root, "out")], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000", ALNILAM_TEST_TOKEN: "ALNILAM-FAKE-TOKEN-deadbeef03" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "compose failed: " + result.stderr);
  const prov = JSON.parse(fs.readFileSync(path.join(root, "out", "alnilam-provenance.json"), "utf8"));
  assert.deepEqual(Object.keys(prov).sort(), ["core", "generatedAt", "schema", "site"]);
  assert.deepEqual(Object.keys(prov.core).sort(), ["revision"]);
  assert.deepEqual(Object.keys(prov.site).sort(), ["digest", "ref"]);
  const serialized = JSON.stringify(prov);
  assert.doesNotMatch(serialized, /ALNILAM-FAKE-TOKEN/);
  // No absolute source paths: the Site identity is the digest (#52).
  assert.doesNotMatch(serialized, /"\/(home|tmp|Users)\//);
});

test("no legacy TOML parser exists in the Core sources", () => {
  const coreFiles = [];
  for (const file of walk("packages/core/src")) coreFiles.push(file);
  for (const file of fs.globSync("scripts/*.mjs")) coreFiles.push(file);
  for (const file of coreFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /@iarna\/toml|toml-parser|require\(["']toml/i, `${file} imports a TOML parser`);
  }
});
