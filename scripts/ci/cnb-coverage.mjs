#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const MIN_SOURCE_COVERAGE = 77;
const includedSource = source => source?.endsWith('.mjs') && /(?:^|\/)(?:packages\/core\/src\/|apps\/web\/src\/lib\/|scripts\/(?:site-contract|upgrade-check|compose)\.mjs$)/.test(source);
export function nodeSourceLCOV(text) {
  return text.split('end_of_record').filter(record => {
    const source = record.match(/^SF:(.+)$/m)?.[1]?.replaceAll('\\', '/');
    return includedSource(source);
  }).map(record => record.trim() + '\nend_of_record\n').join('');
}
export function sourceCoverage(text) {
  let lines = 0, hit = 0, files = 0;
  for (const record of nodeSourceLCOV(text).split('end_of_record')) {
    const source = record.match(/^SF:(.+)$/m)?.[1]?.replaceAll('\\', '/');
    if (!source) continue;
    files++;
    for (const match of record.matchAll(/^DA:(\d+),(\d+)(?:,.*)?$/gm)) {
      lines++;
      if (Number(match[2]) > 0) hit++;
    }
  }
  if (!files || !lines) throw Error('Missing Node-source LCOV data (test files do not count)');
  const percent = hit / lines * 100;
  if (percent < MIN_SOURCE_COVERAGE) throw Error(`Node source coverage regression: ${percent} < ${MIN_SOURCE_COVERAGE}`);
  return {files, lines, hit, percent, minimum: MIN_SOURCE_COVERAGE, scope: 'Node-imported .mjs under packages/core/src and apps/web/src/lib, plus scripts/site-contract.mjs, scripts/upgrade-check.mjs and scripts/compose.mjs; excludes Astro/Svelte UI and browser/E2E code'};
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const text = fs.readFileSync(process.argv[2], 'utf8');
    const report = sourceCoverage(text);
    fs.writeFileSync(path.join(path.dirname(process.argv[2]), 'source.lcov.info'), nodeSourceLCOV(text));
    const target = path.join(path.dirname(process.argv[2]), 'source-summary.json');
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
