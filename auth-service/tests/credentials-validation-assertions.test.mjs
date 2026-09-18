import assert from 'node:assert/strict';
import {
    isNumber,
    isPositiveInteger,
    isString,
    isBoolean,
    isNonNegativeInteger,
    isUint8Array,
} from '../dist/helpers/credentials-validation/assertions.js';

describe('credentials-validation/assertions', () => {
    describe('isNumber', () => {
        it('accepts number values', () => {
            assert.doesNotThrow(() => isNumber(0, 'x'));
            assert.doesNotThrow(() => isNumber(-1.5, 'x'));
        });

        it('rejects non-numbers with TypeError naming the field', () => {
            assert.throws(() => isNumber('1', 'pos'), /"pos" must be number/);
            assert.throws(() => isNumber(null, 'pos'), TypeError);
        });
    });

    describe('isPositiveInteger', () => {
        it('accepts positive integers', () => {
            assert.doesNotThrow(() => isPositiveInteger(1, 'len'));
            assert.doesNotThrow(() => isPositiveInteger(1000, 'len'));
        });

        it('rejects zero, negatives, and non-integers', () => {
            assert.throws(() => isPositiveInteger(0, 'len'), /positive integer/);
            assert.throws(() => isPositiveInteger(-3, 'len'), /positive integer/);
            assert.throws(() => isPositiveInteger(1.5, 'len'), /positive integer/);
            assert.throws(() => isPositiveInteger('1', 'len'), /positive integer/);
        });
    });

    describe('isNonNegativeInteger', () => {
        it('accepts zero and positive integers', () => {
            assert.doesNotThrow(() => isNonNegativeInteger(0, 'pos'));
            assert.doesNotThrow(() => isNonNegativeInteger(42, 'pos'));
        });

        it('rejects negatives and non-integers', () => {
            assert.throws(() => isNonNegativeInteger(-1, 'pos'), /non-negative integer/);
            assert.throws(() => isNonNegativeInteger(0.5, 'pos'), /non-negative integer/);
        });
    });

    describe('isString', () => {
        it('accepts strings (including empty)', () => {
            assert.doesNotThrow(() => isString('', 's'));
            assert.doesNotThrow(() => isString('abc', 's'));
        });

        it('rejects non-strings', () => {
            assert.throws(() => isString(1, 's'), /"s" must be a string/);
            assert.throws(() => isString(undefined, 's'), TypeError);
        });
    });

    describe('isBoolean', () => {
        it('accepts true/false', () => {
            assert.doesNotThrow(() => isBoolean(true, 'b'));
            assert.doesNotThrow(() => isBoolean(false, 'b'));
        });

        it('rejects truthy/falsy non-booleans', () => {
            assert.throws(() => isBoolean(1, 'b'), /boolean/);
            assert.throws(() => isBoolean('true', 'b'), /boolean/);
        });
    });

    describe('isUint8Array', () => {
        it('accepts a Uint8Array', () => {
            assert.doesNotThrow(() => isUint8Array(new Uint8Array(2), 'buf'));
        });

        it('rejects ordinary arrays and Buffers-of-ints', () => {
            assert.throws(() => isUint8Array([1, 2], 'buf'), /Uint8Array/);
        });

        it('accepts Buffer (subclass of Uint8Array)', () => {
            assert.doesNotThrow(() => isUint8Array(Buffer.alloc(1), 'buf'));
        });
    });
});
