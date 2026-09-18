import { assert } from 'chai';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

describe('@unit PolicyUtils.evaluateCustomFormula custom comparators', () => {
    it('uses the custom strict equal operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('1 == 1', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('1 == 2', {}));
    });
    it('uses the custom strict unequal operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('1 != 2', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('1 != 1', {}));
    });
    it('uses the custom smaller operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('1 < 2', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('2 < 1', {}));
    });
    it('uses the custom smallerEq operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('2 <= 2', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('3 <= 2', {}));
    });
    it('uses the custom larger operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('3 > 2', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('1 > 2', {}));
    });
    it('uses the custom largerEq operator', () => {
        assert.isTrue(PolicyUtils.evaluateCustomFormula('3 >= 3', {}));
        assert.isFalse(PolicyUtils.evaluateCustomFormula('2 >= 3', {}));
    });
    it('uses the custom compare function', () => {
        assert.equal(PolicyUtils.evaluateCustomFormula('compare(3, 2)', {}), 1);
        assert.equal(PolicyUtils.evaluateCustomFormula('compare(2, 3)', {}), -1);
        assert.equal(PolicyUtils.evaluateCustomFormula('compare(2, 2)', {}), 0);
    });
});
