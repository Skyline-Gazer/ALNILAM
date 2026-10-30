#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const MIN_SOURCE_COVERAGE = 77;
const sourceKey = source => {
  const normalized = source?.replaceAll('\\', '/');
  if (!normalized?.endsWith('.mjs')) return null;
  const candidates = [
    /(?:^|\/)(packages\/core\/src\/.*\.mjs)$/,
    /(?:^|\/)(apps\/web\/src\/lib\/.*\.mjs)$/,
    /(?:^|\/)(scripts\/(?:site-contract|upgrade-check|compose)\.mjs)$/,
  ].flatMap(pattern => {
    const match = pattern.exec(normalized);
    return match ? [{index: match.index, source: match[1]}] : [];
  });
  return candidates.sort((left, right) => left.index - right.index)[0]?.source || null;
};
const sourceRecords = text => {
  const files = new Map();
  for (const record of text.split('end_of_record')) {
    const source = sourceKey(record.match(/^SF:(.+)$/m)?.[1]);
    if (!source) continue;
    if (!files.has(source)) files.set(source, new Map());
    const lines = files.get(source);
    for (const match of record.matchAll(/^DA:(\d+),(\d+)(?:,.*)?$/gm)) {
      const line = Number(match[1]);
      lines.set(line, Math.max(lines.get(line) ?? 0, Number(match[2])));
    }
  }
  return files;
};
export function nodeSourceLCOV(text) {
  return [...sourceRecords(text)]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, lines]) => [
      `SF:${source}`,
      ...[...lines].sort(([left], [right]) => left - right).map(([line, hit]) => `DA:${line},${hit}`),
      'end_of_record',
      '',
    ].join('\n'))
    .join('');
}
export function sourceCoverage(text) {
  let lines = 0, hit = 0, files = 0;
  for (const sourceLines of sourceRecords(text).values()) {
    files++;
    lines += sourceLines.size;
    hit += [...sourceLines.values()].filter(count => count > 0).length;
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
