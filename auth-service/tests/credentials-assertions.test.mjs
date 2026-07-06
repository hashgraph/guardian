import assert from 'node:assert/strict';
import * as A from '../dist/helpers/credentials-validation/assertions.js';

describe('credentials-validation assertions', () => {
    it('isNumber accepts numbers, throws on others', () => {
        assert.doesNotThrow(() => A.isNumber(1, 'x'));
        assert.throws(() => A.isNumber('1', 'x'), /must be number/);
        assert.throws(() => A.isNumber(null, 'x'), /must be number/);
    });

    it('isPositiveInteger rejects 0, negatives, fractionals, and non-numbers', () => {
        assert.doesNotThrow(() => A.isPositiveInteger(1, 'x'));
        assert.doesNotThrow(() => A.isPositiveInteger(7, 'x'));
        assert.throws(() => A.isPositiveInteger(0, 'x'), /positive integer/);
        assert.throws(() => A.isPositiveInteger(-1, 'x'), /positive integer/);
        assert.throws(() => A.isPositiveInteger(1.5, 'x'), /positive integer/);
        assert.throws(() => A.isPositiveInteger('1', 'x'), /positive integer/);
    });

    it('isString accepts strings only', () => {
        assert.doesNotThrow(() => A.isString('', 'x'));
        assert.throws(() => A.isString(0, 'x'), /must be a string/);
    });

    it('isBoolean accepts booleans only', () => {
        assert.doesNotThrow(() => A.isBoolean(false, 'x'));
        assert.throws(() => A.isBoolean(0, 'x'), /must be a boolean/);
    });

    it('isNonNegativeInteger allows 0, rejects negatives', () => {
        assert.doesNotThrow(() => A.isNonNegativeInteger(0, 'x'));
        assert.doesNotThrow(() => A.isNonNegativeInteger(7, 'x'));
        assert.throws(() => A.isNonNegativeInteger(-1, 'x'), /non-negative integer/);
        assert.throws(() => A.isNonNegativeInteger(1.5, 'x'), /non-negative integer/);
    });

    it('isUint8Array accepts only Uint8Array (Buffer counts since it extends Uint8Array)', () => {
        assert.doesNotThrow(() => A.isUint8Array(new Uint8Array([1, 2, 3]), 'x'));
        assert.doesNotThrow(() => A.isUint8Array(Buffer.from([1, 2, 3]), 'x'));
        assert.throws(() => A.isUint8Array([1, 2, 3], 'x'), /Uint8Array/);
        assert.throws(() => A.isUint8Array('abc', 'x'), /Uint8Array/);
    });
});
