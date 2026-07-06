import { assert } from 'chai';
import { CommonVariables } from '../../../dist/helpers/common-variables.js';

describe('CommonVariables store', () => {
    it('round-trips a stored value', () => {
        const cv = new CommonVariables();
        cv.setVariable('alpha', 'one');
        assert.equal(cv.getVariable('alpha'), 'one');
    });

    it('returns undefined for an unknown key', () => {
        const cv = new CommonVariables();
        assert.equal(cv.getVariable('does-not-exist-xyz'), undefined);
    });

    it('overwrites an existing key with the latest value', () => {
        const cv = new CommonVariables();
        cv.setVariable('beta', 1);
        cv.setVariable('beta', 2);
        assert.equal(cv.getVariable('beta'), 2);
    });

    it('stores and returns null distinctly from undefined', () => {
        const cv = new CommonVariables();
        cv.setVariable('gamma', null);
        assert.strictEqual(cv.getVariable('gamma'), null);
    });

    it('preserves object identity for stored references', () => {
        const cv = new CommonVariables();
        const obj = { nested: true };
        cv.setVariable('delta', obj);
        assert.strictEqual(cv.getVariable('delta'), obj);
    });

    it('keeps distinct keys independent', () => {
        const cv = new CommonVariables();
        cv.setVariable('k1', 'v1');
        cv.setVariable('k2', 'v2');
        assert.equal(cv.getVariable('k1'), 'v1');
        assert.equal(cv.getVariable('k2'), 'v2');
    });
});
