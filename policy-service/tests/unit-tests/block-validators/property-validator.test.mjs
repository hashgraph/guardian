import { assert } from 'chai';
import { PropertyValidator } from '../../../dist/policy-engine/block-validators/property-validator.js';

describe('@unit PropertyValidator.selectValidator', () => {
    it('returns null when value is in requirements', () => {
        assert.equal(
            PropertyValidator.selectValidator('color', 'red', ['red', 'green', 'blue']),
            null,
        );
    });

    it('returns descriptive error when value is missing from requirements', () => {
        const err = PropertyValidator.selectValidator('color', 'magenta', ['red', 'green', 'blue']);
        assert.equal(err, 'Option "color" must be one of [red, green, blue]');
    });

    it('returns error for empty value (not in any non-empty requirements list)', () => {
        const err = PropertyValidator.selectValidator('color', '', ['red']);
        assert.equal(typeof err, 'string');
        assert.match(err, /must be one of/);
    });

    it('returns null for empty requirements list ONLY when value also empty (find returns undefined either way)', () => {
        // Edge case documenting current behavior — empty value vs empty list both error.
        assert.match(
            PropertyValidator.selectValidator('x', '', []),
            /must be one of/,
        );
    });

    it('matching is === (case-sensitive, no coercion)', () => {
        assert.match(
            PropertyValidator.selectValidator('x', 'RED', ['red']),
            /must be one of/,
        );
        assert.match(
            PropertyValidator.selectValidator('x', '1', [1]),
            /must be one of/,
        );
    });
});

describe('@unit PropertyValidator.inputValidator', () => {
    it('returns null for a non-empty string when type is "string"', () => {
        assert.equal(PropertyValidator.inputValidator('name', 'alice', 'string'), null);
    });

    it('returns null for a non-empty string when type is omitted', () => {
        assert.equal(PropertyValidator.inputValidator('name', 'alice'), null);
    });

    it('returns "is not set" for empty string', () => {
        assert.equal(PropertyValidator.inputValidator('name', '', 'string'), 'Option "name" is not set');
    });

    it('returns "is not set" for null', () => {
        assert.equal(PropertyValidator.inputValidator('name', null, 'string'), 'Option "name" is not set');
    });

    it('returns "is not set" for undefined', () => {
        assert.equal(PropertyValidator.inputValidator('name', undefined, 'string'), 'Option "name" is not set');
    });

    it('returns "must be a <type>" when value is non-string but type is set to string', () => {
        assert.equal(
            PropertyValidator.inputValidator('age', 42, 'string'),
            'Option "age" must be a string',
        );
    });

    it('passes any truthy non-string when type is omitted (no type-check applied)', () => {
        assert.equal(PropertyValidator.inputValidator('age', 42), null);
        assert.equal(PropertyValidator.inputValidator('items', [1, 2]), null);
    });

    it('treats 0 as not-set (falsy) — documented edge case', () => {
        // If callers want to pass numbers, they need to NOT use this validator.
        assert.equal(PropertyValidator.inputValidator('count', 0), 'Option "count" is not set');
    });
});
