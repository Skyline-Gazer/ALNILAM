import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { summarizeLighthouseReports } from "../p1/lighthouse-summary.mjs";

test("Lighthouse summary reports per-URL medians and keeps lab data separate", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lhci-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const values = [
    { cls: 0.1, lcp: 1200, requests: 8, js: 1000, css: 400, a11y: 0.9 },
    { cls: 0.3, lcp: 1800, requests: 12, js: 3000, css: 800, a11y: 0.7 },
    { cls: 0.2, lcp: 1500, requests: 10, js: 2000, css: 600, a11y: 0.8 },
  ];
  const manifest = values.map((value, index) => {
    const jsonPath = path.join(directory, `run-${index}.report.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      categories: {
        performance: { score: 0.8 + index / 100 },
        accessibility: { score: value.a11y, auditRefs: [{ id: "contrast" }] },
      },
      audits: {
        "cumulative-layout-shift": { numericValue: value.cls },
        "largest-contentful-paint": { numericValue: value.lcp },
        "total-byte-weight": { numericValue: 5000 + index },
        "network-requests": { details: { items: Array.from({ length: value.requests }) } },
        "resource-summary": { details: { items: [
          { resourceType: "script", transferSize: value.js, requestCount: 1 },
          { resourceType: "stylesheet", transferSize: value.css, requestCount: 1 },
        ] } },
        contrast: { title: "Background and foreground colors do not have a sufficient contrast ratio.", score: index === 1 ? 0 : 1 },
      },
    }));
    return { url: "http://127.0.0.1:4323/", jsonPath };
  });
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest));

  const summary = summarizeLighthouseReports(directory, { formFactor: "mobile", testedSha: "abc123" });
  assert.equal(summary.labOnly, true);
  assert.equal(summary.fieldP75, "NOT VERIFIED");
  assert.equal(summary.testedSha, "abc123");
  assert.equal(summary.pages.length, 1);
  assert.equal(summary.pages[0].runs, 3);
  assert.deepEqual(summary.pages[0].median, {
    cls: 0.2,
    lcpMs: 1500,
    inpMs: null,
    performanceScore: 0.81,
    accessibilityScore: 0.8,
    requestCount: 10,
    totalByteWeight: 5001,
    scriptTransferBytes: 2000,
    cssTransferBytes: 600,
  });
  assert.deepEqual(summary.pages[0].accessibilityFindings, [{
    id: "contrast",
    title: "Background and foreground colors do not have a sufficient contrast ratio.",
  }]);
});

test("Lighthouse summary rejects an incomplete run group", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lhci-short-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, "report.json"), JSON.stringify({ audits: {} }));
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify([
    { url: "http://localhost/", jsonPath: path.join(directory, "report.json") },
  ]));
  assert.throws(() => summarizeLighthouseReports(directory), /expected 3 Lighthouse runs/);
});
