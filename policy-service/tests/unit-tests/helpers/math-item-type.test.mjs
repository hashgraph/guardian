import assert from 'node:assert/strict';
import { MathItemType } from '../../../dist/policy-engine/helpers/math-model/math-item.type.js';

describe('MathItemType enum', () => {
    it('exposes link/function/variable/group with lowercase values', () => {
        assert.equal(MathItemType.LINK, 'link');
        assert.equal(MathItemType.FUNCTION, 'function');
        assert.equal(MathItemType.VARIABLE, 'variable');
        assert.equal(MathItemType.GROUP, 'group');
    });
    it('has exactly four entries', () => {
        assert.equal(Object.keys(MathItemType).length, 4);
    });
});
