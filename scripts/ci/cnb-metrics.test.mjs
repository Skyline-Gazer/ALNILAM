import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateCLS, assertCLSBudget} from './cnb-metrics.mjs';
const shift = (startTime, value = 0.01, hadRecentInput = false) => ({startTime, value, hadRecentInput});
test('CLS uses maximal session, excludes input, and sorts entries', () => {
  assert.equal(calculateCLS([shift(3000, 0.08), shift(0, 0.02), shift(500, 0.03), shift(1000, 1, true)]), 0.08);
  assert.equal(calculateCLS([]), 0);
});
test('one-second gaps and five-second windows use strict greater-than boundaries', () => {
  assert.equal(calculateCLS(Array.from({length: 7}, (_, i) => shift(i * 1000))), 0.060000000000000005);
  assert.equal(calculateCLS([shift(0, 0), shift(500, 0.03), shift(1501, 0.04)]), 0.04);
});
test('large shift fails the same gate used by browser fixtures', () => {
  assert.equal(assertCLSBudget([shift(0, 0.05)]), 0.05);
  assert.throws(() => assertCLSBudget([shift(0, 0.25)]), /CLS regression/);
  assert.throws(() => calculateCLS([shift(0, NaN)]));
});
