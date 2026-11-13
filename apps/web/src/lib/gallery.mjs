import fs from "node:fs";
import path from "node:path";
import { parseSiteConfigDocument } from "@alnilam/core";

const DATA_FILE = "data/albums.yaml";
const ALBUM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALBUM_KEYS = new Set([
  "id", "title", "description", "cover", "date", "location", "tags",
  "layout", "columns", "photos",
]);
const PHOTO_KEYS = new Set([
  "id", "src", "thumbnail", "alt", "title", "description", "tags", "date", "location", "width", "height",
]);

function fail(label, message) {
  throw new Error(`ALNILAM: ${DATA_FILE} ${label} ${message}`);
}

function assertKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label, "must be a mapping");
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(label, `has unknown field ${JSON.stringify(key)}`);
  }
}

function text(value, label, { required = false } = {}) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || (required && !value.trim())) {
    fail(label, "must be a non-empty string");
  }
  return value.trim();
}

function date(value, label) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(label, "must use YYYY-MM-DD");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(label, "must be a valid calendar date");
  }
  return value;
}

function stringList(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(label, "must be an array of non-empty strings");
  }
  return value.map((item) => item.trim());
}

function safePathname(pathname, label) {
  const segments = pathname.replace(/^\//, "").split("/");
  if (!pathname || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    fail(label, "contains an invalid path segment");
  }
  for (const segment of segments) {
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      fail(label, "contains invalid percent encoding");
    }
    if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
      fail(label, "contains an encoded path traversal segment");
    }
  }
}

/** Resolve a Site asset reference without fetching it or rewriting URL queries. */
export function normalizeGalleryImageUrl(value, label = "image URL") {
  const raw = text(value, label, { required: true });
  if (/[\u0000-\u001f\\]/.test(raw)) fail(label, "contains a control character or backslash");

  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      fail(label, "must be a valid HTTPS URL or Site path");
    }
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      fail(label, "external images must use an HTTPS URL without embedded credentials");
    }
    return raw;
  }

  if (raw.startsWith("//")) fail(label, "must use a complete HTTPS URL, not a protocol-relative URL");
  const suffixAt = raw.search(/[?#]/);
  const pathname = suffixAt < 0 ? raw : raw.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? "" : raw.slice(suffixAt);
  if (pathname.startsWith("/")) {
    safePathname(pathname, label);
    return `${pathname}${suffix}`;
  }

  const relative = pathname.replace(/^\.\//, "");
  safePathname(relative, label);
  const assetPath = relative.startsWith("assets/")
    ? relative.slice("assets/".length)
    : relative.startsWith("site-assets/")
      ? relative.slice("site-assets/".length)
      : relative;
  safePathname(assetPath, label);
  return `/site-assets/${assetPath}${suffix}`;
}

function normalizePhoto(value, albumId, index) {
  const label = `album ${albumId} photo ${index + 1}`;
  assertKeys(value, PHOTO_KEYS, label);
  const id = text(value.id, `${label}.id`) || `${albumId}-photo-${index + 1}`;
  if (!ALBUM_ID.test(id)) fail(`${label}.id`, "must be a lowercase URL-safe slug");
  const width = value.width;
  const height = value.height;
  if ((width === undefined) !== (height === undefined)) {
    fail(label, "width and height must be provided together");
  }
  if (width !== undefined && (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)) {
    fail(label, "width and height must be positive integers");
  }
  const title = text(value.title, `${label}.title`);
  return {
    id,
    src: normalizeGalleryImageUrl(value.src, `${label}.src`),
    ...(value.thumbnail !== undefined
      ? { thumbnail: normalizeGalleryImageUrl(value.thumbnail, `${label}.thumbnail`) }
      : {}),
    alt: text(value.alt, `${label}.alt`, { required: true }),
    ...(title ? { title } : {}),
    ...(text(value.location, `${label}.location`) ? { location: text(value.location, `${label}.location`) } : {}),
    tags: stringList(value.tags, `${label}.tags`),
    ...(value.date !== undefined ? { date: date(value.date, `${label}.date`) } : {}),
    ...(width !== undefined ? { width, height } : {}),
  };
}

function normalizeAlbum(value, index) {
  const label = `album ${index + 1}`;
  assertKeys(value, ALBUM_KEYS, label);
  const id = text(value.id, `${label}.id`, { required: true });
  if (!ALBUM_ID.test(id)) fail(`${label}.id`, "must be a lowercase URL-safe slug");
  const title = text(value.title, `${label}.title`, { required: true });
  if (!Array.isArray(value.photos)) fail(`${label}.photos`, "must be an array (use [] for an empty album)");
  const photos = value.photos.map((photo, photoIndex) => normalizePhoto(photo, id, photoIndex));
  const photoIds = new Set();
  for (const photo of photos) {
    if (photoIds.has(photo.id)) fail(`${label}.photos`, `contains duplicate id ${JSON.stringify(photo.id)}`);
    photoIds.add(photo.id);
  }
  const layout = value.layout ?? "grid";
  if (layout !== "grid" && layout !== "masonry") fail(`${label}.layout`, "must be grid or masonry");
  const columns = value.columns ?? 3;
  if (!Number.isInteger(columns) || columns < 2 || columns > 4) fail(`${label}.columns`, "must be 2, 3 or 4");
  const cover = value.cover === undefined ? "" : normalizeGalleryImageUrl(value.cover, `${label}.cover`);
  return {
    id,
    title,
    description: text(value.description, `${label}.description`),
    cover,
    date: date(value.date, `${label}.date`),
    location: text(value.location, `${label}.location`),
    tags: stringList(value.tags, `${label}.tags`),
    layout,
    columns,
    hidden: false,
    photos,
  };
}

/** Load only Gallery data; callers invoke this only for the enabled module. */
export function loadSiteGallery(siteRoot) {
  const file = path.join(siteRoot, DATA_FILE);
  if (!fs.existsSync(file)) return [];
  const raw = parseSiteConfigDocument(fs.readFileSync(file, "utf8"), { filename: DATA_FILE });
  assertKeys(raw, new Set(["schemaVersion", "albums"]), DATA_FILE);
  if (raw.schemaVersion !== 1) fail("schemaVersion", "must be 1");
  if (!Array.isArray(raw.albums)) fail("albums", "must be an array");
  const albums = raw.albums.map(normalizeAlbum);
  const ids = new Set();
  for (const album of albums) {
    if (ids.has(album.id)) fail("albums", `contains duplicate id ${JSON.stringify(album.id)}`);
    ids.add(album.id);
  }
  return albums;
}

export function galleryRouteLocales(config) {
  return config.routing.prefixDefaultLocale
    ? config.locales
    : config.locales.filter((locale) => locale !== config.site.locale);
}

export function toAlbumIndexItem(album) {
  const { photos, ...metadata } = album;
  return { ...metadata, photoCount: photos.length, protected: false };
}

const PAGE_COPY = {
  en: { title: "Albums", description: "A visual archive of places, people and passing moments.", back: "Back to albums", photos: "photos" },
  es: { title: "Álbumes", description: "Un archivo visual de lugares, personas y momentos.", back: "Volver a álbumes", photos: "fotos" },
  id: { title: "Album", description: "Arsip visual tempat, orang, dan momen yang berlalu.", back: "Kembali ke album", photos: "foto" },
  ja: { title: "アルバム", description: "場所、人、過ぎゆく瞬間を集めたビジュアルアーカイブ。", back: "アルバムに戻る", photos: "枚の写真" },
  ko: { title: "앨범", description: "장소와 사람, 스쳐 가는 순간을 담은 시각 아카이브입니다.", back: "앨범으로 돌아가기", photos: "개 사진" },
  th: { title: "อัลบั้ม", description: "คลังภาพของสถานที่ ผู้คน และช่วงเวลาที่ผ่านไป", back: "กลับไปที่อัลบั้ม", photos: "รูปภาพ" },
  tr: { title: "Albümler", description: "Yerlerin, insanların ve geçen anların görsel arşivi.", back: "Albümlere dön", photos: "fotoğraf" },
  vi: { title: "Album", description: "Kho lưu trữ hình ảnh về địa điểm, con người và những khoảnh khắc đã qua.", back: "Quay lại album", photos: "ảnh" },
  "zh-CN": { title: "相册", description: "记录地点、人物与流转瞬间的视觉档案。", back: "返回相册", photos: "张照片" },
  "zh-TW": { title: "相簿", description: "記錄地點、人物與流轉瞬間的視覺檔案。", back: "返回相簿", photos: "張照片" },
};

export function galleryPageText(locale) {
  const normalized = String(locale || "en").toLowerCase();
  const language = normalized.startsWith("zh-tw")
    ? "zh-TW"
    : normalized.startsWith("zh")
      ? "zh-CN"
      : Object.keys(PAGE_COPY).find((key) => !key.startsWith("zh-") && normalized.startsWith(key)) || "en";
  return PAGE_COPY[language] || PAGE_COPY.en;
}
