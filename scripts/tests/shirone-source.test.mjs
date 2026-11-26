import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../themes/shirone/upstream/", import.meta.url));

test("Shirone source ledger covers the vendored tree with current SHA-256 digests", () => {
	const ledger = JSON.parse(readFileSync(resolve(root, "SOURCE.json"), "utf8"));
	const files = readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => !entry.isDirectory() && !(entry.parentPath === root && entry.name === "SOURCE.json"));
	const paths = files.map((entry) => relative(root, resolve(entry.parentPath, entry.name)).split("\\").join("/"));
	assert.deepEqual(ledger.files.map(({ path }) => path).sort(), paths.sort());

	const hashes = new Map(ledger.files.map(({ path, sha256 }) => [path, sha256]));
	const mismatches = [];
	for (const entry of files) {
		const filename = resolve(entry.parentPath, entry.name);
		const path = relative(root, filename).split("\\").join("/");
		assert.ok(entry.isFile(), `${path} must be a regular vendored file`);
		const actual = createHash("sha256").update(readFileSync(filename)).digest("hex");
		if (hashes.get(path) !== actual) mismatches.push(path);
	}
	assert.deepEqual(mismatches.sort(), [], "refresh the listed digests after changing vendored files");
	assert.deepEqual(Object.keys(ledger.modified).filter((path) => !hashes.has(path)), [], "every patch note needs an inventoried file");
});
