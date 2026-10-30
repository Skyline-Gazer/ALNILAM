import {test} from 'node:test';
import assert from 'node:assert/strict';
test('intentional mirror CI rejection fixture', () => assert.fail('EXPECTED_MIRROR_CI_FAILURE'));
