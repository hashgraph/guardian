import { assert } from 'chai';
import { CommonVariables } from '../../../dist/helpers/common-variables.js';

describe('CommonVariables', () => {
    it('round-trips a simple value', () => {
        const v = new CommonVariables();
        v.setVariable('greeting', 'hello');
        assert.equal(v.getVariable('greeting'), 'hello');
    });

    it('returns undefined for unknown keys', () => {
        const v = new CommonVariables();
        assert.equal(v.getVariable('does-not-exist'), undefined);
    });

    it('overwrites a previously set value', () => {
        const v = new CommonVariables();
        v.setVariable('k', 1);
        v.setVariable('k', 2);
        assert.equal(v.getVariable('k'), 2);
    });

    it('keeps separate keys independent', () => {
        const v = new CommonVariables();
        v.setVariable('a', 1);
        v.setVariable('b', 2);
        assert.equal(v.getVariable('a'), 1);
        assert.equal(v.getVariable('b'), 2);
    });

    it('stores objects/arrays/null intact', () => {
        const v = new CommonVariables();
        const obj = { a: 1 };
        const arr = [1, 2];
        v.setVariable('obj', obj);
        v.setVariable('arr', arr);
        v.setVariable('nul', null);
        assert.equal(v.getVariable('obj'), obj);
        assert.equal(v.getVariable('arr'), arr);
        assert.equal(v.getVariable('nul'), null);
    });

    it('is a Singleton — fresh instances share state', () => {
        // The @Singleton decorator wraps the constructor so all `new`
        // invocations return the same instance.
        const a = new CommonVariables();
        const b = new CommonVariables();
        a.setVariable('shared', 'x');
        assert.equal(b.getVariable('shared'), 'x');
        assert.equal(a, b);
    });
});
