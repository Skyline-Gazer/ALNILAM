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

test('coverage merges duplicate harness records by logical source and line', () => {
  const input = [
    'SF:scripts/upgrade-check.mjs\nDA:1,1\nDA:2,0\nDA:3,1\nend_of_record\n',
    'SF:../../private/tmp/trusted-harness/scripts/upgrade-check.mjs\nDA:1,0\nDA:2,1\nDA:3,0\nend_of_record\n',
  ].join('');
  const normalized = nodeSourceLCOV(input);
  assert.equal(sourceCoverage(input).files, 1);
  assert.equal(sourceCoverage(input).lines, 3);
  assert.equal(sourceCoverage(input).hit, 3);
  assert.match(normalized, /^SF:scripts\/upgrade-check\.mjs$/m);
  assert.match(normalized, /^DA:1,1$/m);
  assert.match(normalized, /^DA:2,1$/m);
  assert.match(normalized, /^DA:3,1$/m);
  assert.equal([...normalized.matchAll(/^SF:/gm)].length, 1);
});
