import assert from 'node:assert/strict';
import { MultiPolicyType } from '../dist/type/multi-policy-type.type.js';

describe('MultiPolicyType enum', () => {
    it('exposes Main and Sub (mixed-case display strings)', () => {
        assert.equal(MultiPolicyType.MAIN, 'Main');
        assert.equal(MultiPolicyType.SUB, 'Sub');
    });
});
