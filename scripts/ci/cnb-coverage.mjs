#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function applicationLCOV(text) {
  return text.split('end_of_record').filter(record => {
    const source = record.match(/^SF:(.+)$/m)?.[1]?.replaceAll('\\', '/');
    return source && /(?:^|\/)(?:packages\/core\/src\/|apps\/web\/src\/lib\/|scripts\/(?:site-contract|upgrade-check|compose)\.mjs$)/.test(source);
  }).map(record => record.trim() + '\nend_of_record\n').join('');
}
export function sourceCoverage(text, minimum = 0) {
  let lines = 0, hit = 0, files = 0;
  for (const record of applicationLCOV(text).split('end_of_record')) {
    const source = record.match(/^SF:(.+)$/m)?.[1]?.replaceAll('\\', '/');
    if (!source || !/(?:^|\/)(?:packages\/core\/src\/|apps\/web\/src\/lib\/|scripts\/(?:site-contract|upgrade-check|compose)\.mjs$)/.test(source)) continue;
    files++;
    for (const match of record.matchAll(/^DA:(\d+),(\d+)(?:,.*)?$/gm)) {
      lines++;
      if (Number(match[2]) > 0) hit++;
    }
  }
  if (!files || !lines) throw Error('Missing application-source LCOV data (test files do not count)');
  const percent = hit / lines * 100;
  if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100 || percent < minimum) throw Error(`Source coverage regression: ${percent} < ${minimum}`);
  return {files, lines, hit, percent, scope: 'Node-imported application and composition source; excludes browser/E2E and Astro subprocesses'};
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const text = fs.readFileSync(process.argv[2], 'utf8');
    const report = sourceCoverage(text, Number(process.argv[3] || 0));
    fs.writeFileSync(path.join(path.dirname(process.argv[2]), 'source.lcov.info'), applicationLCOV(text));
    const target = path.join(path.dirname(process.argv[2]), 'source-summary.json');
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
