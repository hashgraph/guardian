import assert from 'node:assert/strict';
import { prepareValidationResponse } from '../dist/middlewares/validation/index.js';
import { IsNumberOrString } from '../dist/middlewares/validation/string-or-number.js';
import { IsStringOrObject } from '../dist/middlewares/validation/string-or-object.js';

describe('prepareValidationResponse', () => {
    it('uses err.errors when present', () => {
        const out = prepareValidationResponse({ errors: ['a', 'b'] });
        assert.deepEqual(out, { type: 'ValidationError', message: ['a', 'b'] });
    });

    it('falls back to wrapping the error itself when no .errors', () => {
        const err = 'oops';
        const out = prepareValidationResponse(err);
        assert.deepEqual(out, { type: 'ValidationError', message: ['oops'] });
    });

    it('respects an explicit type override', () => {
        const out = prepareValidationResponse({ errors: ['x'] }, 'CustomType');
        assert.equal(out.type, 'CustomType');
    });

    it('wraps null/undefined errors in a single-element array', () => {
        assert.deepEqual(
            prepareValidationResponse(null).message,
            [null]
        );
    });
});

describe('IsNumberOrString constraint', () => {
    const c = new IsNumberOrString();

    it('accepts strings (incl. empty)', () => {
        assert.equal(c.validate('', {}), true);
        assert.equal(c.validate('hello', {}), true);
    });

    it('accepts numbers (incl. 0 and NaN)', () => {
        assert.equal(c.validate(0, {}), true);
        assert.equal(c.validate(-1.5, {}), true);
        assert.equal(c.validate(NaN, {}), true);
    });

    it('rejects booleans, null, undefined, objects, arrays', () => {
        assert.equal(c.validate(true, {}), false);
        assert.equal(c.validate(null, {}), false);
        assert.equal(c.validate(undefined, {}), false);
        assert.equal(c.validate({}, {}), false);
        assert.equal(c.validate([], {}), false);
    });

    it('produces a default message that mentions value type', () => {
        const msg = c.defaultMessage({});
        assert.ok(/must be number or string/.test(msg));
    });
});

describe('IsStringOrObject constraint', () => {
    const c = new IsStringOrObject();

    it('accepts strings and objects (incl. arrays — typeof "object")', () => {
        assert.equal(c.validate('hi', {}), true);
        assert.equal(c.validate({ a: 1 }, {}), true);
        assert.equal(c.validate([1, 2], {}), true);
    });

    it('accepts null because typeof null === "object"', () => {
        // Document the actual behavior — null is treated as object by typeof.
        assert.equal(c.validate(null, {}), true);
    });

    it('rejects numbers, booleans, undefined', () => {
        assert.equal(c.validate(1, {}), false);
        assert.equal(c.validate(true, {}), false);
        assert.equal(c.validate(undefined, {}), false);
    });

    it('produces a default message that mentions value type', () => {
        const msg = c.defaultMessage({});
        assert.ok(/must be object or string/.test(msg));
    });
});
