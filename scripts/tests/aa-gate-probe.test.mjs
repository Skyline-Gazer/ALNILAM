import test from "node:test";
import assert from "node:assert/strict";

test("CI gate probe: this must fail (#249 validation)", () => {
  assert.equal(0, 1);
});
