import assert from 'node:assert/strict';
import { Bitstring } from '../dist/helpers/credentials-validation/bitstring.js';

describe('Bitstring', () => {
    describe('construction', () => {
        it('builds a zero-filled bitstring from a length', () => {
            const bs = new Bitstring({ length: 16 });
            for (let i = 0; i < 16; i++) {
                assert.equal(bs.get(i), false);
            }
        });

        it('rounds up to the next byte for non-multiples of 8', () => {
            const bs = new Bitstring({ length: 9 });
            assert.equal(bs.get(8), false);
            assert.throws(() => bs.get(9), /out of range/);
        });

        it('refuses both length and buffer at once', () => {
            assert.throws(
                () => new Bitstring({ length: 8, buffer: new Uint8Array(1) }),
                /Only one of "length" or "buffer"/,
            );
        });

        it('refuses both leftToRightIndexing and littleEndianBits', () => {
            assert.throws(
                () => new Bitstring({ length: 8, leftToRightIndexing: true, littleEndianBits: false }),
                /not allowed/,
            );
        });

        it('accepts littleEndianBits as a deprecated alias for leftToRightIndexing', () => {
            const buffer = new Uint8Array([0b1000_0000]);
            const ltr = new Bitstring({ buffer, leftToRightIndexing: true });
            const alias = new Bitstring({ buffer, littleEndianBits: true });
            assert.equal(ltr.get(0), alias.get(0));
            assert.equal(ltr.get(7), alias.get(7));
        });

        it('rejects a non-positive length', () => {
            assert.throws(() => new Bitstring({ length: 0 }), /positive integer/);
            assert.throws(() => new Bitstring({ length: -1 }), /positive integer/);
        });

        it('rejects a non-Uint8Array buffer', () => {
            assert.throws(() => new Bitstring({ buffer: [1, 2] }), /Uint8Array/);
        });
    });

    describe('get with leftToRightIndexing=true (default)', () => {
        it('reads bit 0 as the most-significant bit of byte 0', () => {
            const buffer = new Uint8Array([0b1000_0000]);
            const bs = new Bitstring({ buffer });
            assert.equal(bs.get(0), true);
            assert.equal(bs.get(7), false);
        });

        it('reads bit 7 as the least-significant bit of byte 0', () => {
            const buffer = new Uint8Array([0b0000_0001]);
            const bs = new Bitstring({ buffer });
            assert.equal(bs.get(0), false);
            assert.equal(bs.get(7), true);
        });

        it('crosses byte boundaries correctly', () => {
            const buffer = new Uint8Array([0x00, 0b1000_0000]);
            const bs = new Bitstring({ buffer });
            assert.equal(bs.get(7), false);
            assert.equal(bs.get(8), true);
        });
    });

    describe('get with leftToRightIndexing=false', () => {
        it('reads bit 0 as the least-significant bit of byte 0', () => {
            const buffer = new Uint8Array([0b0000_0001]);
            const bs = new Bitstring({ buffer, leftToRightIndexing: false });
            assert.equal(bs.get(0), true);
            assert.equal(bs.get(7), false);
        });
    });

    describe('get range checks', () => {
        it('throws when position is out of range', () => {
            const bs = new Bitstring({ length: 8 });
            assert.throws(() => bs.get(8), /out of range/);
        });

        it('throws when position is negative (non-non-negative integer)', () => {
            const bs = new Bitstring({ length: 8 });
            assert.throws(() => bs.get(-1), /non-negative integer/);
        });

        it('throws when position is not a number', () => {
            const bs = new Bitstring({ length: 8 });
            assert.throws(() => bs.get('0'), /must be number/);
        });
    });

    describe('decodeBits', () => {
        it('rejects non-string input', async () => {
            await assert.rejects(Bitstring.decodeBits({ encoded: 123 }), /must be a string/);
        });
    });
});
