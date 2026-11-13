import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";
import { galleryAlbumDetailPath, galleryPageText, galleryRouteLocales, loadSiteGallery, normalizeGalleryImageUrl } from "../../apps/web/src/lib/gallery.mjs";

const demo = path.resolve("sites/demo");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-gallery-test-"));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

function baseConfig(extra = {}) {
  return {
    schemaVersion: 2,
    site: { title: "Gallery Test", url: "https://gallery.example/", locale: "en" },
    ...extra,
  };
}

test("Gallery Site config remains backward-compatible and defaults off", () => {
  assert.equal(normalizeSiteConfig(baseConfig()).gallery.enabled, false);
  assert.equal(normalizeSiteConfig(baseConfig({ gallery: { enabled: true } })).gallery.enabled, true);
  assert.throws(() => normalizeSiteConfig(baseConfig({ gallery: { enabled: "true" } })), /gallery\.enabled/);
  assert.throws(() => normalizeSiteConfig(baseConfig({ gallery: { source: "public" } })), /unknown gallery field/);
});

test("Gallery routes follow Site default-locale prefix policy", () => {
  const locales = ["en", "ja"];
  const unprefixed = normalizeSiteConfig(baseConfig({ locales, routing: { prefixDefaultLocale: false } }));
  const prefixed = normalizeSiteConfig(baseConfig({ locales, routing: { prefixDefaultLocale: true } }));
  assert.deepEqual(galleryRouteLocales(unprefixed), ["ja"]);
  assert.deepEqual(galleryRouteLocales(prefixed), ["en", "ja"]);
  assert.equal(galleryAlbumDetailPath("en", "en", false, "coast-and-mountains"), "/albums/coast-and-mountains/");
  assert.equal(galleryAlbumDetailPath("ja", "en", false, "coast-and-mountains"), "/ja/albums/coast-and-mountains/");
  assert.equal(galleryAlbumDetailPath("en", "en", true, "coast-and-mountains"), "/en/albums/coast-and-mountains/");
});

test("Gallery page copy follows all ten supported locales", () => {
  const titles = {
    en: "Albums",
    es: "Álbumes",
    id: "Album",
    ja: "アルバム",
    ko: "앨범",
    th: "อัลบั้ม",
    tr: "Albümler",
    vi: "Album",
    "zh-CN": "相册",
    "zh-TW": "相簿",
  };
  for (const [locale, title] of Object.entries(titles)) {
    assert.equal(galleryPageText(locale).title, title, locale);
  }
  assert.equal(galleryPageText("en-US").title, titles.en);
});

test("Gallery image URLs preserve queries and resolve Site asset paths", () => {
  assert.equal(
    normalizeGalleryImageUrl("gallery/photo.jpg?width=800&signature=abc123"),
    "/site-assets/gallery/photo.jpg?width=800&signature=abc123",
  );
  assert.equal(
    normalizeGalleryImageUrl("assets/gallery/photo.jpg"),
    "/site-assets/gallery/photo.jpg",
  );
  assert.equal(
    normalizeGalleryImageUrl("/ALNILAM/site-assets/photo.jpg?sig=one"),
    "/ALNILAM/site-assets/photo.jpg?sig=one",
  );
  assert.equal(
    normalizeGalleryImageUrl("https://cdn.example/photo.jpg?sig=a%2Fb&size=full"),
    "https://cdn.example/photo.jpg?sig=a%2Fb&size=full",
  );
  for (const unsafe of ["http://cdn.example/photo.jpg", "//cdn.example/photo.jpg", "../private.jpg", "javascript:alert(1)"]) {
    assert.throws(() => normalizeGalleryImageUrl(unsafe), /ALNILAM: data\/albums\.yaml/);
  }
});

test("Gallery photo descriptions survive Site data normalization", () => {
  const site = path.join(scratch, "photo-description");
  const data = path.join(site, "data");
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(
    path.join(data, "albums.yaml"),
    "schemaVersion: 1\nalbums:\n  - id: sample\n    title: Sample\n    photos:\n      - src: /site-assets/photo.jpg\n        alt: Photo\n        description: View across the lake\n",
  );
  assert.equal(loadSiteGallery(site)[0].photos[0].description, "View across the lake");
});

test("Demo Gallery loads independent local, remote, thumbnail and empty album data", () => {
  const albums = loadSiteGallery(demo);
  assert.equal(albums.length, 4);
  assert.equal(albums[0].photos.length, 3);
  assert.notEqual(albums[0].photos[0].src, albums[0].photos[0].thumbnail);
  assert.equal(albums[0].photos[0].location, "Alpine lake");
  assert.equal(albums[0].photos[0].width, 2400);
  assert.equal(albums[0].photos[2].src, "/site-assets/lighthouse.png");
  assert.equal(albums[1].cover, "/site-assets/orion.svg");
  assert.equal(albums[1].photos[0].src, "/site-assets/orion.svg?variant=gallery#nebula");
  assert.equal(albums[2].cover, "");
  assert.equal(albums[3].photos.length, 0);
});

test("Gallery data rejects duplicate album IDs, unknown fields and invalid image paths", () => {
  const site = path.join(scratch, "site");
  fs.mkdirSync(path.join(site, "data"), { recursive: true });
  const file = path.join(site, "data", "albums.yaml");
  const validAlbum = `  - id: sample\n    title: Sample\n    photos: []\n`;
  fs.writeFileSync(file, `schemaVersion: 1\nalbums:\n${validAlbum}${validAlbum}`);
  assert.throws(() => loadSiteGallery(site), /duplicate id/);

  fs.writeFileSync(file, "schemaVersion: 1\nalbums: []\nextra: true\n");
  assert.throws(() => loadSiteGallery(site), /unknown field/);

  fs.writeFileSync(
    file,
    "schemaVersion: 1\nalbums:\n  - id: sample\n    title: Sample\n    photos:\n      - src: ../private.jpg\n        alt: Private\n",
  );
  assert.throws(() => loadSiteGallery(site), /invalid path segment/);

  fs.writeFileSync(
    file,
    "schemaVersion: 1\nalbums:\n  - id: sample\n    title: Sample\n    photos:\n      - src: /site-assets/photo.jpg\n        alt: Photo\n        width: 800\n",
  );
  assert.throws(() => loadSiteGallery(site), /width and height must be provided together/);
});
