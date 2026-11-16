import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
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
import { pathToFileURL } from "node:url";

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

function objectPath(artifactStoreDir, artifactHash) {
  return path.join(artifactStoreDir, `${artifactHash}.mjs`);
}

function moduleUrl(file, cacheKey, inputKey) {
  const identity = sha256(Buffer.from(`${inputKey}\0${cacheKey}`));
  return `${pathToFileURL(file).href}?alnilam-module=${identity}`;
}

async function publishObject(artifactStoreDir, artifactHash, contents) {
  const artifact = objectPath(artifactStoreDir, artifactHash);
  if (existsSync(artifact)) {
    regularFile(artifact);
    if (await hashFile(artifact) === artifactHash) return artifact;
  }
  atomicWrite(artifact, contents);
  return artifact;
}

async function publishLegacyObject(artifactStoreDir, source, artifactHash) {
  const artifact = objectPath(artifactStoreDir, artifactHash);
  if (existsSync(artifact)) {
    regularFile(artifact);
    if (await hashFile(artifact) === artifactHash) return artifact;
  }
  const temporary = `${artifact}.${process.pid}.${randomUUID()}.tmp`;
  copyFileSync(source, temporary, constants.COPYFILE_EXCL);
  try {
    renameSync(temporary, artifact);
  } catch (error) {
    if (!existsSync(artifact) || await hashFile(artifact) !== artifactHash) {
      unlinkSync(temporary);
      throw error;
    }
    unlinkSync(temporary);
  }
  return artifact;
}

async function findHit(outputDir, artifactStoreDir, cacheKey, inputKey) {
  const manifest = manifestPath(outputDir, cacheKey);
  if (!existsSync(manifest)) return null;
  regularFile(manifest);
  let record;
  try {
    record = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    return null;
  }

  const keyHash = createHash("sha256").update(cacheKey).digest("hex").slice(0, 24);
  if (record?.inputKey !== inputKey || !/^[a-f0-9]{64}$/.test(record.artifactHash ?? "")) return null;
  if (record.schema === 2) {
    if (record.cacheKeyHash !== keyHash) return null;
    const artifact = objectPath(artifactStoreDir, record.artifactHash);
    if (!existsSync(artifact)) return null;
    regularFile(artifact);
    return await hashFile(artifact) === record.artifactHash ? artifact : null;
  }
  if (
    record.schema !== 1 ||
    typeof record.file !== "string" ||
    path.basename(record.file) !== record.file ||
    !/^[a-f0-9]{24}\.[a-f0-9]{64}\.mjs$/.test(record.file) ||
    record.file.split(".")[0] !== keyHash ||
    record.artifactHash !== record.file.split(".")[1]
  ) return null;

  const legacyArtifact = path.join(outputDir, record.file);
  if (!existsSync(legacyArtifact)) return null;
  regularFile(legacyArtifact);
  if (await hashFile(legacyArtifact) !== record.artifactHash) return null;
  const artifact = await publishLegacyObject(artifactStoreDir, legacyArtifact, record.artifactHash);
  atomicWrite(manifest, JSON.stringify({ schema: 2, inputKey, cacheKeyHash: keyHash, artifactHash: record.artifactHash }) + "\n");
  return artifact;
}

/** Return a verified input-key mapping to an immutable, content-addressed bundle object. */
export async function loadBundledArtifact({ outputDir, artifactStoreDir, cacheKey, inputKey, build }) {
  for (const target of [outputDir, artifactStoreDir]) assertNoSymlinkComponents(target);
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(artifactStoreDir, { recursive: true });
  for (const target of [outputDir, artifactStoreDir]) assertNoSymlinkComponents(target);

  const cached = await findHit(outputDir, artifactStoreDir, cacheKey, inputKey);
  if (cached) return { file: cached, url: moduleUrl(cached, cacheKey, inputKey), hit: true };

  const code = await build();
  const artifactHash = sha256(Buffer.from(code, "utf8"));
  const artifact = await publishObject(artifactStoreDir, artifactHash, code);
  const cacheKeyHash = createHash("sha256").update(cacheKey).digest("hex").slice(0, 24);
  const record = JSON.stringify({ schema: 2, inputKey, cacheKeyHash, artifactHash }) + "\n";
  atomicWrite(manifestPath(outputDir, cacheKey), record);
  return { file: artifact, url: moduleUrl(artifact, cacheKey, inputKey), hit: false };
}
