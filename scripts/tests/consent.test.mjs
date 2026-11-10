import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";

const base = {
  schemaVersion: 2,
  site: { title: "t", url: "https://example.com" },
};

const withPrivacy = (privacy) => normalizeSiteConfig({ ...base, ...privacy });

test("consent/analytics/ads default to fully disabled with no identifiers", () => {
  const config = withPrivacy({});
  assert.equal(config.consent.mode, "off");
  assert.equal(config.analytics.googleAnalytics.enabled, false);
  assert.equal(config.analytics.googleAnalytics.measurementId, "");
  assert.equal(config.ads.adsense.enabled, false);
  assert.equal(config.ads.adsense.clientId, "");
  assert.equal(config.ads.adsense.mode, "auto");
  assert.equal(config.ads.adsense.adsTxt, "");
  assert.equal(config.ads.adsense.recovery.mode, "off");
  assert.equal(config.ads.adsense.recovery.googleTag, "");
  assert.equal(config.ads.adsense.recovery.dismissDays, 7);
});

test("consent.mode accepts basic and rejects unknown values and fields", () => {
  assert.equal(withPrivacy({ consent: { mode: "basic" } }).consent.mode, "basic");
  assert.throws(() => withPrivacy({ consent: { mode: "advanced" } }), /consent\.mode/);
  assert.throws(() => withPrivacy({ consent: { gate: true } }), /unknown consent field/);
});

test("googleAnalytics validates measurement IDs and fails closed when enabled", () => {
  const ga = (googleAnalytics) => withPrivacy({ analytics: { googleAnalytics } }).analytics.googleAnalytics;
  assert.equal(ga({ enabled: true, measurementId: "G-ABC123" }).enabled, true);
  assert.equal(ga({ enabled: true, measurementId: "G-ABC123" }).measurementId, "G-ABC123");
  assert.throws(() => ga({ enabled: true }), /measurementId is required/);
  assert.throws(() => ga({ enabled: true, measurementId: "not-an-id" }), /measurementId must match/);
  assert.throws(() => ga({ enabled: true, measurementId: "G-abc123" }), /measurementId must match/);
  assert.throws(() => ga({ enabled: false, measurementId: "AW-123" }), /measurementId must match/);
  assert.throws(() => withPrivacy({ analytics: { ga4: { enabled: true } } }), /unknown analytics field/);
  assert.throws(
    () => ga({ enabled: true, measurementId: "G-ABC123", apiSecret: "s3cret" }),
    /unknown analytics\.googleAnalytics field/,
  );
});

test("adsense validates client IDs, auto mode and required identifiers", () => {
  const adsense = (value) => withPrivacy({ ads: { adsense: value } }).ads.adsense;
  const ok = { enabled: true, clientId: "ca-pub-1234567890123456" };
  assert.equal(adsense(ok).enabled, true);
  assert.equal(adsense(ok).clientId, "ca-pub-1234567890123456");
  assert.throws(() => adsense({ enabled: true }), /clientId is required/);
  assert.throws(() => adsense({ enabled: true, clientId: "pub-123" }), /clientId must match/);
  assert.throws(() => adsense({ enabled: true, clientId: "ca-pub-abc" }), /clientId must match/);
  assert.throws(() => adsense({ enabled: false, clientId: "google_ad_client=X" }), /clientId must match/);
  assert.throws(() => adsense({ ...ok, mode: "manual" }), /adsense\.mode/);
  assert.throws(() => adsense({ ...ok, slot: "123" }), /unknown ads\.adsense field/);
  assert.equal(adsense({ adsTxt: "google.com, pub-1, DIRECT, f08c47fec0942fa0" }).adsTxt, "google.com, pub-1, DIRECT, f08c47fec0942fa0");
});

test("recovery modes are mutually exclusive by schema and google requires its tag", () => {
  const recovery = (value) =>
    withPrivacy({ ads: { adsense: { enabled: true, clientId: "ca-pub-1234567890123456", recovery: value } } })
      .ads.adsense.recovery;
  assert.equal(recovery({ mode: "google", googleTag: "ca-pub-1234567890123456" }).mode, "google");
  assert.equal(recovery({ mode: "custom" }).mode, "custom");
  assert.throws(() => recovery({ mode: "google" }), /googleTag is required/);
  assert.throws(() => recovery({ mode: "banana" }), /recovery\.mode/);
  assert.throws(() => recovery({ mode: "custom", dismissDays: 0 }), /dismissDays/);
  assert.throws(() => recovery({ mode: "custom", dismissDays: 366 }), /dismissDays/);
  assert.throws(() => recovery({ mode: "custom", googleTag: "ca-pub-1" }), /googleTag is only valid/);
  assert.equal(recovery({ mode: "custom", dismissDays: 30 }).dismissDays, 30);
});
