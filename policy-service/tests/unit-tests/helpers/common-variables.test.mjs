import { assert } from 'chai';
import { CommonVariables } from '../../../dist/helpers/common-variables.js';

describe('@unit CommonVariables', () => {
    it('stores and retrieves a value by name', () => {
        const vars = new CommonVariables();
        vars.setVariable('alpha', 123);
        assert.equal(vars.getVariable('alpha'), 123);
    });

    it('returns undefined for an unknown variable', () => {
        const vars = new CommonVariables();
        assert.equal(vars.getVariable('does-not-exist-xyz'), undefined);
    });

    it('overwrites an existing value', () => {
        const vars = new CommonVariables();
        vars.setVariable('beta', 'first');
        vars.setVariable('beta', 'second');
        assert.equal(vars.getVariable('beta'), 'second');
    });

    it('supports object and array values', () => {
        const vars = new CommonVariables();
        const obj = { a: 1 };
        const arr = [1, 2, 3];
        vars.setVariable('obj', obj);
        vars.setVariable('arr', arr);
        assert.strictEqual(vars.getVariable('obj'), obj);
        assert.strictEqual(vars.getVariable('arr'), arr);
    });

    it('supports null and falsy values distinct from undefined', () => {
        const vars = new CommonVariables();
        vars.setVariable('nullish', null);
        vars.setVariable('zero', 0);
        vars.setVariable('empty', '');
        assert.equal(vars.getVariable('nullish'), null);
        assert.equal(vars.getVariable('zero'), 0);
        assert.equal(vars.getVariable('empty'), '');
    });

    it('behaves as a singleton: state is shared across instances', () => {
        const a = new CommonVariables();
        a.setVariable('shared-key', 'shared-value');
        const b = new CommonVariables();
        assert.equal(b.getVariable('shared-key'), 'shared-value');
    });

    it('singleton returns the same underlying instance', () => {
        const a = new CommonVariables();
        const b = new CommonVariables();
        assert.strictEqual(a, b);
    });
});
