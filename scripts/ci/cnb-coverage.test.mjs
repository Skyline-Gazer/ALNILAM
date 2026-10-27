import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceCoverage} from './cnb-coverage.mjs';
const report = (file, hits = '1') => `SF:${file}\nDA:1,${hits}\nDA:2,1\nend_of_record\n`;
test('coverage counts actual imported application source, not tests', () => {
  const actual = sourceCoverage(report('packages/core/src/index.mjs') + report('scripts/tests/contract.test.mjs', '0'));
  assert.equal(actual.percent, 100);
  assert.equal(actual.lines, 2);
});
test('empty/missing/test-only reports fail, reduced coverage turns red', () => {
  for (const bad of ['', 'SF:packages/core/src/index.mjs\n', report('scripts/tests/a.test.mjs')]) assert.throws(() => sourceCoverage(bad));
  assert.throws(() => sourceCoverage(report('packages/core/src/index.mjs', '0'), 90), /regression/);
});
