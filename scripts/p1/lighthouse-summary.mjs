import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const numeric = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const median = (values) => {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function reportMetrics(report) {
  const audits = report.audits ?? {};
  const network = audits["network-requests"]?.details?.items ?? [];
  const resources = audits["resource-summary"]?.details?.items ?? [];
  const requestCount = network.length || resources.reduce((total, item) => total + (item.requestCount ?? 0), 0);
  const bytes = (types) => resources
    .filter((item) => types.includes(String(item.resourceType).toLowerCase()))
    .reduce((total, item) => total + (item.transferSize ?? 0), 0);
  return {
    cls: numeric(audits["cumulative-layout-shift"]?.numericValue),
    lcpMs: numeric(audits["largest-contentful-paint"]?.numericValue),
    inpMs: numeric(audits["interaction-to-next-paint"]?.numericValue),
    performanceScore: numeric(report.categories?.performance?.score),
    accessibilityScore: numeric(report.categories?.accessibility?.score),
    requestCount: numeric(requestCount),
    totalByteWeight: numeric(audits["total-byte-weight"]?.numericValue),
    scriptTransferBytes: numeric(bytes(["script"])) ,
    cssTransferBytes: numeric(bytes(["stylesheet", "css"])),
  };
}

export function summarizeLighthouseReports(directory, metadata = {}) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error("LHCI manifest has no reports");
  const grouped = new Map();
  for (const entry of manifest) {
    if (typeof entry.url !== "string" || typeof entry.jsonPath !== "string") {
      throw new Error("LHCI manifest entry is missing url or jsonPath");
    }
    const reportPath = path.resolve(entry.jsonPath);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const group = grouped.get(entry.url) ?? [];
    group.push(report);
    grouped.set(entry.url, group);
  }
  const pages = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([url, reports]) => {
    if (reports.length !== 3) throw new Error(`${url}: expected 3 Lighthouse runs, found ${reports.length}`);
    const runs = reports.map(reportMetrics);
    const metricNames = Object.keys(runs[0]);
    return {
      url,
      runs: reports.length,
      median: Object.fromEntries(metricNames.map((name) => [name, median(runs.map((run) => run[name]))])),
      accessibilityFindings: [...new Map(reports.flatMap((report) =>
        (report.categories?.accessibility?.auditRefs ?? [])
          .filter((ref) => report.audits?.[ref.id]?.score !== null && report.audits?.[ref.id]?.score < 1)
          .map((ref) => [ref.id, { id: ref.id, title: report.audits[ref.id]?.title ?? ref.id }]),
      )).values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
  return {
    schema: 1,
    formFactor: metadata.formFactor ?? "unknown",
    testedSha: metadata.testedSha ?? null,
    siteDigest: metadata.siteDigest ?? null,
    labOnly: true,
    fieldP75: "NOT VERIFIED",
    pages,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? "artifacts/lighthouse";
  const summary = summarizeLighthouseReports(directory, {
    formFactor: process.env.ALNILAM_LHCI_FORM_FACTOR,
    testedSha: process.env.ALNILAM_TESTED_SHA,
    siteDigest: process.env.ALNILAM_SITE_DIGEST,
  });
  fs.writeFileSync(path.join(directory, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`Wrote ${summary.pages.length} Lighthouse median summaries to ${path.join(directory, "summary.json")}`);
}
