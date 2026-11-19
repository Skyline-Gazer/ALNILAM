import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyDistributionNotices } from "../distribution-notices.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ALNI-distribution-notices-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repository = path.join(root, "repository");
  const output = path.join(root, "output");
  fs.mkdirSync(path.join(repository, "LICENSES"), { recursive: true });
  fs.mkdirSync(path.join(output, "site-assets"), { recursive: true });
  return { repository, output };
}

test("copies canonical legal documents as static Demo assets", (t) => {
  const { repository, output } = fixture(t);
  const documents = {
    "LICENSE": "Apache license fixture\n",
    "NOTICE": "Notice fixture\n",
    "CREDITS.md": "Credits fixture\n",
    "THIRD_PARTY_NOTICES.md": "Third-party notice fixture\n",
  };
  for (const [name, contents] of Object.entries(documents)) {
    fs.writeFileSync(path.join(repository, name), contents);
  }
  fs.writeFileSync(path.join(repository, "LICENSES", "Example-MIT.txt"), "MIT license fixture\n");
  fs.writeFileSync(path.join(repository, "LICENSES", "ignored.json"), "not a license text\n");
  fs.writeFileSync(path.join(output, "site-assets", "site-owned.txt"), "keep\n");

  assert.equal(copyDistributionNotices(repository, output), "site-assets/alnilam-notices");
  const destination = path.join(output, "site-assets", "alnilam-notices");
  for (const [name, contents] of Object.entries(documents)) {
    assert.equal(fs.readFileSync(path.join(destination, name), "utf8"), contents);
  }
  assert.equal(fs.readFileSync(path.join(destination, "LICENSES", "Example-MIT.txt"), "utf8"), "MIT license fixture\n");
  assert.equal(fs.existsSync(path.join(destination, "LICENSES", "ignored.json")), false);
  assert.equal(fs.existsSync(path.join(destination, "index.html")), false);
  assert.equal(fs.readFileSync(path.join(output, "site-assets", "site-owned.txt"), "utf8"), "keep\n");
});

test("refuses an existing Site asset path without changing its contents", (t) => {
  const { repository, output } = fixture(t);
  for (const name of ["LICENSE", "NOTICE", "CREDITS.md", "THIRD_PARTY_NOTICES.md"]) {
    fs.writeFileSync(path.join(repository, name), "canonical\n");
  }
  fs.writeFileSync(path.join(repository, "LICENSES", "Example-MIT.txt"), "license\n");
  const destination = path.join(output, "site-assets", "alnilam-notices");
  fs.mkdirSync(destination);
  fs.writeFileSync(path.join(destination, "site-owned.txt"), "keep\n");

  assert.throws(() => copyDistributionNotices(repository, output), /Refusing to overwrite an existing Demo asset path/);
  assert.equal(fs.readFileSync(path.join(destination, "site-owned.txt"), "utf8"), "keep\n");
});
