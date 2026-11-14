import { createHash, randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function regularFile(file) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Refusing a non-regular Shirone cache file: " + file);
  }
}

function assertNoSymlinkComponents(target) {
  const resolved = path.resolve(target);
  const { root } = path.parse(resolved);
  let current = root;
  for (const part of resolved.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat) break;
    if (stat.isSymbolicLink()) throw new Error("Refusing a symlink in the Shirone cache path: " + current);
  }
}

function atomicWrite(file, contents) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, contents, { flag: "wx" });
  try {
    renameSync(temporary, file);
  } catch (error) {
    if (!existsSync(file) || !readFileSync(file).equals(Buffer.from(contents))) {
      unlinkSync(temporary);
      throw error;
    }
    unlinkSync(temporary);
}
}

function manifestPath(outputDir, cacheKey) {
  const key = createHash("sha256").update(cacheKey).digest("hex").slice(0, 24);
  return path.join(outputDir, `${key}.manifest.json`);
}

async function findHit(outputDir, cacheKey, inputKey) {
  const manifest = manifestPath(outputDir, cacheKey);
  if (!existsSync(manifest)) return null;
  regularFile(manifest);
  let record;
  try {
    record = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    return null;
  }
  if (
    record?.schema !== 1 ||
    record.inputKey !== inputKey ||
    typeof record.file !== "string" ||
    path.basename(record.file) !== record.file ||
    !/^[a-f0-9]{24}\.[a-f0-9]{64}\.mjs$/.test(record.file) ||
    record.file.split(".")[0] !== createHash("sha256").update(cacheKey).digest("hex").slice(0, 24) ||
    record.artifactHash !== record.file.split(".")[1]
  ) return null;
  const artifact = path.join(outputDir, record.file);
  if (!existsSync(artifact)) return null;
  regularFile(artifact);
  return await hashFile(artifact) === record.artifactHash ? artifact : null;
}

/** Return a validated input-keyed artifact, building and atomically publishing on a miss. */
export async function loadBundledArtifact({ outputDir, cacheKey, inputKey, build }) {
  assertNoSymlinkComponents(outputDir);
  mkdirSync(outputDir, { recursive: true });
  assertNoSymlinkComponents(outputDir);
  const cached = await findHit(outputDir, cacheKey, inputKey);
  if (cached) return { file: cached, hit: true };

  const code = await build();
  const artifactHash = createHash("sha256").update(code, "utf8").digest("hex");
  const key = createHash("sha256").update(cacheKey).digest("hex").slice(0, 24);
  const filename = `${key}.${artifactHash}.mjs`;
  const artifact = path.join(outputDir, filename);
  if (existsSync(artifact)) {
    regularFile(artifact);
    if (await hashFile(artifact) !== artifactHash) atomicWrite(artifact, code);
  } else {
    atomicWrite(artifact, code);
  }
  const record = JSON.stringify({ schema: 1, inputKey, file: filename, artifactHash }) + "\n";
  atomicWrite(manifestPath(outputDir, cacheKey), record);
  return { file: artifact, hit: false };
}
