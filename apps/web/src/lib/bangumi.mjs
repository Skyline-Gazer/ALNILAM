/**
 * Bangumi (bgm.tv) collections, fetched ONCE at build time and reduced to a
 * fully static page: visitors make no third-party data or cover requests.
 *
 * The fetched collection and downloaded covers live in the managed build cache
 * (never in the Site), and the last valid snapshot for one
 * userId/subjectType/limit scope is reused when the provider fails. Covers are
 * content-addressed local files under /bangumi-covers/, materialized into the
 * Astro output after the build has finished writing it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const UA = "ALNILAM-static-build";
const REQUEST_TIMEOUT_MS = 10_000;
const COVER_TIMEOUT_MS = 10_000;
const MAX_COVER_BYTES = 10 * 1024 * 1024;
const COVER_CONCURRENCY = 6;

export const BANGUMI_COVER_URL_PREFIX = "/bangumi-covers/";
const SNAPSHOT_SCHEMA_VERSION = 1;

const SUBJECT_TYPE_CODES = Object.freeze({ book: 1, anime: 2, music: 3, game: 4 });
const SUBJECT_CATEGORIES = Object.freeze({ 1: "book", 2: "anime", 3: "music", 4: "game", 6: "real" });
const COLLECTION_STATUSES = Object.freeze({ 1: "wish", 2: "collected", 3: "doing", 4: "onHold", 5: "dropped" });
const KNOWN_CATEGORIES = new Set(Object.values(SUBJECT_CATEGORIES));
const COVER_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif"]);
const COVER_MIME_TYPES = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
});
const COVER_CONTENT_TYPES = Object.freeze({
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
});

class BangumiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BangumiError";
    this.code = code;
  }
}

function normalizeScope(config) {
  const userId = typeof config?.userId === "string" ? config.userId.trim() : "";
  const subjectType = Object.hasOwn(SUBJECT_TYPE_CODES, config?.subjectType)
    ? config.subjectType
    : "anime";
  const limit =
    Number.isInteger(config?.limit) && config.limit >= 1 && config.limit <= 50
      ? config.limit
      : 10;
  return { userId, subjectType, limit, subjectTypeCode: SUBJECT_TYPE_CODES[subjectType] };
}

/** Managed cache root for Bangumi data; compose passes ALNILAM_BANGUMI_CACHE. */
export function bangumiCacheRoot() {
  const explicit = process.env.ALNILAM_BANGUMI_CACHE;
  if (typeof explicit === "string" && explicit.trim()) return path.resolve(explicit);
  const managed = process.env.ALNILAM_CACHE_DIR;
  const root = typeof managed === "string" && managed.trim()
    ? path.resolve(managed)
    : path.join(repoRoot, ".cache", "alnilam");
  return path.join(root, "bangumi");
}

export function bangumiCoversDir() {
  return path.join(bangumiCacheRoot(), "covers");
}

function snapshotsDir() {
  return path.join(bangumiCacheRoot(), "snapshots");
}

function scopeKey(scope) {
  return crypto
    .createHash("sha256")
    .update(`${scope.userId}\n${scope.subjectType}\n${scope.limit}`)
    .digest("hex")
    .slice(0, 32);
}

function snapshotPath(scope) {
  return path.join(snapshotsDir(), `${scopeKey(scope)}.json`);
}

function writeFileAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, data, { mode: 0o600 });
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {}
    throw error;
  }
}

export function isBangumiCoverAssetName(name) {
  if (typeof name !== "string") return false;
  const match = /^([a-f0-9]{32})\.([a-z]+)$/.exec(name);
  return Boolean(match && COVER_EXTENSIONS.has(match[2]));
}

export function bangumiCoverContentType(name) {
  const extension = typeof name === "string" ? name.split(".").pop() : "";
  return COVER_CONTENT_TYPES[extension] ?? "application/octet-stream";
}

function coverAssetName(cover) {
  if (typeof cover !== "string" || !cover.startsWith(BANGUMI_COVER_URL_PREFIX)) return null;
  const name = cover.slice(BANGUMI_COVER_URL_PREFIX.length);
  return isBangumiCoverAssetName(name) ? name : null;
}

function coverFile(name) {
  return path.join(bangumiCoversDir(), name);
}

function storedItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const field of ["name", "nameCn", "cover", "href", "summary", "comment", "updatedAt", "category"]) {
    if (typeof value[field] !== "string") return null;
  }
  if (!KNOWN_CATEGORIES.has(value.category)) return null;
  if (value.status !== undefined && !Object.values(COLLECTION_STATUSES).includes(value.status) && value.status !== "") return null;
  if (value.cover) {
    const name = coverAssetName(value.cover);
    if (!name) return null;
    // A cache entry can be partially swept; keep the snapshot's text and drop
    // only the cover rather than failing the whole page.
    if (!fs.existsSync(coverFile(name))) return { ...value, cover: "", status: value.status ?? "" };
  }
  return { ...value, status: value.status ?? "" };
}

function readSnapshot(scope) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(snapshotPath(scope), "utf8"));
  } catch {
    return null;
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    raw.schemaVersion !== SNAPSHOT_SCHEMA_VERSION ||
    raw.provider !== "bangumi" ||
    raw.scopeKey !== scopeKey(scope) ||
    !Array.isArray(raw.collections)
  ) {
    return null;
  }
  const collections = raw.collections.map(storedItem);
  if (collections.some((item) => item === null)) return null;
  return collections;
}

function writeSnapshot(scope, collections) {
  const payload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    provider: "bangumi",
    scopeKey: scopeKey(scope),
    collections,
  };
  writeFileAtomic(snapshotPath(scope), JSON.stringify(payload, null, 2) + "\n");
}

function trustedCoverUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BangumiError("cover", "Bangumi cover URL is not valid");
  }
  if (url.protocol !== "https:") throw new BangumiError("cover", "Bangumi cover URL is not HTTPS");
  if (url.username || url["pass" + "word"]) throw new BangumiError("cover", "Bangumi cover URL embeds credentials");
  if (url.port && url.port !== "443") throw new BangumiError("cover", "Bangumi cover URL uses an unexpected port");
  if (url.search || url.hash) throw new BangumiError("cover", "Bangumi cover URL has unexpected parameters");
  const host = url.hostname.toLowerCase();
  if (host !== "bgm.tv" && !host.endsWith(".bgm.tv")) {
    throw new BangumiError("cover", "Bangumi cover URL host is not trusted");
  }
  return url;
}

function extensionFromUrl(url) {
  const match = /\.([a-z]+)$/i.exec(url.pathname);
  const extension = match ? match[1].toLowerCase() : "";
  return COVER_EXTENSIONS.has(extension) ? extension : null;
}

function imageExtension(response, url) {
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType) {
    const known = COVER_MIME_TYPES[contentType];
    if (known) return known;
    // Some mirrors omit a precise image type; a URL extension is still safe.
    if (contentType !== "application/octet-stream" && contentType !== "binary/octet-stream") return null;
  }
  return extensionFromUrl(url);
}

async function downloadCover(value, fetchImpl) {
  const url = trustedCoverUrl(value);
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      headers: { "User-Agent": UA, Accept: "image/png,image/jpeg,image/webp,image/gif,image/avif" },
      redirect: "manual",
      signal: AbortSignal.timeout(COVER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BangumiError("cover", error?.name === "TimeoutError"
      ? "Bangumi cover request timed out"
      : "Bangumi cover request failed");
  }
  if (!response || response.status < 200 || response.status >= 300) {
    throw new BangumiError("cover", "Bangumi cover request failed");
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_COVER_BYTES) {
    throw new BangumiError("cover", "Bangumi cover is too large");
  }
  const extension = imageExtension(response, url);
  if (!extension) throw new BangumiError("cover", "Bangumi cover is not a supported image");
  let bytes;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch {
    throw new BangumiError("cover", "Bangumi cover request failed");
  }
  if (!bytes.length || bytes.length > MAX_COVER_BYTES) {
    throw new BangumiError("cover", "Bangumi cover is empty or too large");
  }
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const name = `${hash}.${extension}`;
  const file = coverFile(name);
  if (!fs.existsSync(file)) writeFileAtomic(file, bytes);
  return BANGUMI_COVER_URL_PREFIX + name;
}

async function mapLimit(values, limit, mapper) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await mapper(values[index]);
    }
  });
  await Promise.all(workers);
}

async function localizeCovers(collections, fetchImpl) {
  const remote = [...new Set(collections.map((item) => item.cover).filter(Boolean))];
  const localized = new Map();
  await mapLimit(remote, COVER_CONCURRENCY, async (url) => {
    localized.set(url, await downloadCover(url, fetchImpl));
  });
  return collections.map((item) => ({
    ...item,
    cover: item.cover ? localized.get(item.cover) ?? "" : "",
  }));
}

function selectCover(subject) {
  const images = subject.images;
  if (images && typeof images === "object" && !Array.isArray(images)) {
    for (const size of ["large", "common", "medium", "small", "grid"]) {
      const value = images[size];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  if (typeof subject.image === "string" && subject.image.trim()) return subject.image.trim();
  return "";
}

function mapEntry(entry, fallbackCategory) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  const subject = entry.subject;
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  const id = Number.isInteger(subject.id) ? subject.id : Number.isInteger(entry.subject_id) ? entry.subject_id : null;
  if (id === null || id <= 0 || typeof subject.name !== "string" || !subject.name.trim()) {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  const rawType = entry.subject_type ?? subject.type;
  if (rawType != null && !Object.hasOwn(SUBJECT_CATEGORIES, rawType)) {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  const category = rawType == null ? fallbackCategory : SUBJECT_CATEGORIES[rawType];
  const name = subject.name;
  const nameCn = typeof subject.name_cn === "string" && subject.name_cn ? subject.name_cn : name;
  const summary = typeof subject.short_summary === "string" ? subject.short_summary.slice(0, 140) : "";
  return {
    name,
    nameCn,
    cover: selectCover(subject),
    href: `https://bgm.tv/subject/${id}`,
    summary,
    comment: typeof entry.comment === "string" ? entry.comment : "",
    updatedAt: typeof entry.updated_at === "string" ? entry.updated_at : "",
    category,
    status: COLLECTION_STATUSES[entry.type] ?? "",
  };
}

function publicError(error) {
  if (error instanceof BangumiError) {
    switch (error.code) {
      case "timeout":
        return "Bangumi request timed out";
      case "http":
        return "Bangumi request failed";
      case "malformed":
        return "Bangumi returned malformed data";
      case "cover":
        return error.message;
      case "cache":
        return "Bangumi snapshot could not be saved";
      default:
        return "Bangumi data could not be loaded";
    }
  }
  if (error?.name === "TimeoutError") return "Bangumi request timed out";
  // Never surface a fetch/URL error: it can carry the request target or an
  // embedded credential supplied by an untrusted provider response.
  return "Bangumi data could not be loaded";
}

async function requestCollectionPage(scope, fetchImpl) {
  const url = new URL(
    `https://api.bgm.tv/v0/users/${encodeURIComponent(scope.userId)}/collections`,
  );
  url.searchParams.set("subject_type", String(scope.subjectTypeCode));
  url.searchParams.set("limit", String(scope.limit));
  url.searchParams.set("offset", "0");
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw new BangumiError("timeout", "Bangumi request timed out");
    throw new BangumiError("provider", "Bangumi request failed");
  }
  if (!response?.ok) {
    throw new BangumiError("http", `Bangumi API ${response?.status ?? "error"}`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.data)) {
    throw new BangumiError("malformed", "Bangumi returned malformed data");
  }
  return body.data;
}

/**
 * Raw provider mapping, retained for callers that only need the remote list.
 * It throws on provider errors; loadBangumiCollections wraps it with the
 * managed snapshot fallback.
 */
export async function fetchBangumiCollections(config, options = {}) {
  const scope = normalizeScope(config);
  if (!scope.userId) throw new BangumiError("config", "Bangumi user ID is not configured");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const entries = await requestCollectionPage(scope, fetchImpl);
  return entries.map((entry) => mapEntry(entry, scope.subjectType));
}

/**
 * Build-time entry point. Never throws for provider problems: returns the
 * matching last valid snapshot (stale) or an empty list with a sanitized error.
 */
export async function loadBangumiCollections(config, options = {}) {
  const scope = normalizeScope(config);
  if (config?.enabled === false) return { collections: [], stale: false, error: null };
  if (!scope.userId) {
    return { collections: [], stale: false, error: "Bangumi user ID is not configured" };
  }
  const previous = readSnapshot(scope);
  let result;
  try {
    const fetchImpl = options.fetch ?? globalThis.fetch;
    const entries = await requestCollectionPage(scope, fetchImpl);
    const collections = await localizeCovers(
      entries.map((entry) => mapEntry(entry, scope.subjectType)),
      fetchImpl,
    );
    try {
      writeSnapshot(scope, collections);
    } catch {
      throw new BangumiError("cache", "Bangumi snapshot could not be saved");
    }
    result = { collections, stale: false, error: null };
  } catch (error) {
    result = previous
      ? { collections: previous, stale: true, error: publicError(error) }
      : { collections: [], stale: false, error: publicError(error) };
  }
  // Compose supplies a private per-build staging directory, so a concurrent
  // build cannot change the snapshot whose covers this page references.
  if (process.env.ALNILAM_BANGUMI_ASSET_STAGE) {
    materializeBangumiCovers(process.env.ALNILAM_BANGUMI_ASSET_STAGE, result.collections);
  }
  return result;
}

/** Snapshot read for post-build asset materialization; never performs I/O network calls. */
export function readBangumiSnapshot(config) {
  const scope = normalizeScope(config);
  if (!scope.userId) return [];
  return readSnapshot(scope) ?? [];
}

/**
 * Copy locally cached covers referenced by the snapshot into the finished
 * Astro output. Called from astro:build:done so a build that clears its output
 * cannot remove them; never writes into the Site.
 */
export function materializeBangumiCovers(outputDir, collections) {
  const written = [];
  const destination = path.join(outputDir, "bangumi-covers");
  for (const item of Array.isArray(collections) ? collections : []) {
    const name = coverAssetName(item?.cover);
    if (!name) continue;
    const source = coverFile(name);
    if (!fs.existsSync(source)) continue;
    fs.mkdirSync(destination, { recursive: true });
    const target = path.join(destination, name);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(source, target);
      fs.chmodSync(target, 0o644);
    }
    written.push(name);
  }
  return written;
}
