import assert from 'node:assert/strict';
import { IsStringOrObject } from '../../dist/middlewares/validation/string-or-object.js';

describe('IsStringOrObject validator', () => {
    const constraint = new IsStringOrObject();

    it('is constructible and exposes validate/defaultMessage', () => {
        assert.equal(typeof constraint.validate, 'function');
        assert.equal(typeof constraint.defaultMessage, 'function');
    });

    it('accepts a plain object', () => {
        assert.equal(constraint.validate({ a: 1 }, {}), true);
    });

    it('accepts an empty object', () => {
        assert.equal(constraint.validate({}, {}), true);
    });

    it('accepts an array (typeof object)', () => {
        assert.equal(constraint.validate([1, 2, 3], {}), true);
    });

    it('accepts null (typeof object)', () => {
        assert.equal(constraint.validate(null, {}), true);
    });

    it('accepts a string', () => {
        assert.equal(constraint.validate('value', {}), true);
    });

    it('accepts an empty string', () => {
        assert.equal(constraint.validate('', {}), true);
    });

    it('rejects a number', () => {
        assert.equal(constraint.validate(123, {}), false);
    });

    it('rejects a boolean', () => {
        assert.equal(constraint.validate(false, {}), false);
    });

    it('rejects undefined', () => {
        assert.equal(constraint.validate(undefined, {}), false);
    });

    it('returns the documented default message', () => {
        assert.equal(constraint.defaultMessage({}), '($value) must be object or string');
    });
});
