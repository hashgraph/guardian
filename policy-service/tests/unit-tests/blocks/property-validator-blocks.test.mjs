import { assert } from 'chai';
import { PropertyValidator } from '../../../dist/policy-engine/block-validators/index.js';

describe('@unit P0 PropertyValidator.selectValidator', () => {
    const reqs = ['a', 'b', 'c'];

    it('returns null when value is in the requirements set', () => {
        assert.isNull(PropertyValidator.selectValidator('x', 'a', reqs));
    });

    it('returns null for the middle requirement', () => {
        assert.isNull(PropertyValidator.selectValidator('x', 'b', reqs));
    });

    it('returns null for the last requirement', () => {
        assert.isNull(PropertyValidator.selectValidator('x', 'c', reqs));
    });

    it('returns an error message when value is missing from the set', () => {
        assert.equal(
            PropertyValidator.selectValidator('mode', 'z', reqs),
            'Option "mode" must be one of [a, b, c]',
        );
    });

    it('includes the option name in the error', () => {
        const err = PropertyValidator.selectValidator('impactType', 'nope', reqs);
        assert.match(err, /^Option "impactType"/);
    });

    it('joins requirements with ", "', () => {
        const err = PropertyValidator.selectValidator('m', 'x', ['one', 'two']);
        assert.include(err, '[one, two]');
    });

    it('rejects undefined value', () => {
        assert.isNotNull(PropertyValidator.selectValidator('m', undefined, reqs));
    });

    it('rejects null value', () => {
        assert.isNotNull(PropertyValidator.selectValidator('m', null, reqs));
    });

    it('rejects empty string when not in set', () => {
        assert.isNotNull(PropertyValidator.selectValidator('m', '', reqs));
    });

    it('flags empty string even when present in set (find returns falsy)', () => {
        assert.isNotNull(PropertyValidator.selectValidator('m', '', ['', 'x']));
    });

    it('does strict equality (number 1 not equal to string "1")', () => {
        assert.isNotNull(PropertyValidator.selectValidator('m', 1, ['1']));
    });

    it('accepts a matching number value', () => {
        assert.isNull(PropertyValidator.selectValidator('m', 1, [1, 2]));
    });

    it('error message for empty requirements list', () => {
        assert.equal(
            PropertyValidator.selectValidator('m', 'x', []),
            'Option "m" must be one of []',
        );
    });

    it('accepts boolean true when present in set', () => {
        assert.isNull(PropertyValidator.selectValidator('flag', true, [true, false]));
    });
});

describe('@unit P0 PropertyValidator.inputValidator', () => {
    it('returns "is not set" when value is empty string', () => {
        assert.equal(
            PropertyValidator.inputValidator('amount', '', 'string'),
            'Option "amount" is not set',
        );
    });

    it('returns "is not set" when value is undefined', () => {
        assert.equal(
            PropertyValidator.inputValidator('amount', undefined, 'string'),
            'Option "amount" is not set',
        );
    });

    it('returns "is not set" when value is null', () => {
        assert.equal(
            PropertyValidator.inputValidator('amount', null, 'string'),
            'Option "amount" is not set',
        );
    });

    it('returns "is not set" when value is 0 (falsy)', () => {
        assert.equal(
            PropertyValidator.inputValidator('amount', 0, 'string'),
            'Option "amount" is not set',
        );
    });

    it('returns "is not set" when value is false (falsy)', () => {
        assert.equal(
            PropertyValidator.inputValidator('flag', false, 'string'),
            'Option "flag" is not set',
        );
    });

    it('returns null for a valid string value', () => {
        assert.isNull(PropertyValidator.inputValidator('amount', '10', 'string'));
    });

    it('flags a non-string value when type is requested', () => {
        assert.equal(
            PropertyValidator.inputValidator('amount', 42, 'string'),
            'Option "amount" must be a string',
        );
    });

    it('does not flag type mismatch when type is not provided', () => {
        assert.isNull(PropertyValidator.inputValidator('amount', 42, undefined));
    });

    it('does not flag type mismatch when type is empty string', () => {
        assert.isNull(PropertyValidator.inputValidator('amount', 42, ''));
    });

    it('flags a truthy object value when string type requested', () => {
        assert.equal(
            PropertyValidator.inputValidator('cfg', { a: 1 }, 'string'),
            'Option "cfg" must be a string',
        );
    });

    it('echoes the requested type in the error message', () => {
        const err = PropertyValidator.inputValidator('n', 5, 'number-ish');
        assert.include(err, 'must be a number-ish');
    });

    it('accepts a non-empty whitespace string', () => {
        assert.isNull(PropertyValidator.inputValidator('n', ' ', 'string'));
    });

    it('includes the option name in the not-set error', () => {
        const err = PropertyValidator.inputValidator('threshold', undefined, 'string');
        assert.include(err, '"threshold"');
    });
});
