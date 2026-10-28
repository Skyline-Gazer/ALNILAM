import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nodeSourceLCOV, sourceCoverage} from './cnb-coverage.mjs';
const report = (file, hits = '1') => `SF:${file}\nDA:1,${hits}\nDA:2,1\nend_of_record\n`;
test('coverage counts imported Node source, not tests', () => {
  const actual = sourceCoverage(report('packages/core/src/index.mjs') + report('scripts/tests/contract.test.mjs', '0'));
  assert.equal(actual.percent, 100);
  assert.equal(actual.lines, 2);
});
test('empty/missing/test-only reports fail, reduced coverage turns red', () => {
  for (const bad of ['', 'SF:packages/core/src/index.mjs\n', report('scripts/tests/a.test.mjs')]) assert.throws(() => sourceCoverage(bad));
  assert.throws(() => sourceCoverage(report('packages/core/src/index.mjs', '0')), /regression/);
});
test('coverage receipt and CNB .mjs gate use the same source extensions', () => {
  const input = report('packages/core/src/index.mjs') + report('packages/core/src/index.ts', '0') +
    report('themes/shirone/src/PostCard.astro', '0') + report('packages/ui/src/Search.svelte', '0');
  const actual = sourceCoverage(input);
  assert.equal(actual.minimum, 77);
  assert.equal(actual.files, 1);
  assert.equal(actual.lines, 2);
  assert.deepEqual([...nodeSourceLCOV(input).matchAll(/^SF:(.+)$/gm)].map(match => match[1]), ['packages/core/src/index.mjs']);
});
