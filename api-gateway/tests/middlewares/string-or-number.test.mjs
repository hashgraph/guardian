import assert from 'node:assert/strict';
import { IsNumberOrString } from '../../dist/middlewares/validation/string-or-number.js';

describe('IsNumberOrString validator', () => {
    const constraint = new IsNumberOrString();

    it('is constructible and exposes validate/defaultMessage', () => {
        assert.equal(typeof constraint.validate, 'function');
        assert.equal(typeof constraint.defaultMessage, 'function');
    });

    it('accepts a number', () => {
        assert.equal(constraint.validate(42, {}), true);
    });

    it('accepts zero', () => {
        assert.equal(constraint.validate(0, {}), true);
    });

    it('accepts a negative number', () => {
        assert.equal(constraint.validate(-7, {}), true);
    });

    it('accepts NaN (typeof number)', () => {
        assert.equal(constraint.validate(NaN, {}), true);
    });

    it('accepts a string', () => {
        assert.equal(constraint.validate('hello', {}), true);
    });

    it('accepts an empty string', () => {
        assert.equal(constraint.validate('', {}), true);
    });

    it('rejects a boolean', () => {
        assert.equal(constraint.validate(true, {}), false);
    });

    it('rejects an object', () => {
        assert.equal(constraint.validate({}, {}), false);
    });

    it('rejects an array', () => {
        assert.equal(constraint.validate([1, 2], {}), false);
    });

    it('rejects null', () => {
        assert.equal(constraint.validate(null, {}), false);
    });

    it('rejects undefined', () => {
        assert.equal(constraint.validate(undefined, {}), false);
    });

    it('returns the documented default message', () => {
        assert.equal(constraint.defaultMessage({}), '($value) must be number or string');
    });
});
