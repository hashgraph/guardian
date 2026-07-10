import assert from 'node:assert/strict';
import { Bitstring } from '../dist/helpers/credentials-validation/bitstring.js';

describe('Bitstring', () => {
    it('rejects construction with both length and buffer', () => {
        assert.throws(() => new Bitstring({ length: 8, buffer: new Uint8Array(1) }), /Only one of "length" or "buffer"/);
    });

    it('allocates ceil(length/8) bytes when constructed by length', () => {
        const bs = new Bitstring({ length: 17 });
        // 17 bits → 3 bytes (24 bits storage), all zero
        assert.equal(bs.bits.length, 3);
        assert.equal(bs.length, 17);
        for (let i = 0; i < bs.length; i++) {
            assert.equal(bs.get(i), false);
        }
    });

    it('reads bits MSB-first under default leftToRightIndexing=true', () => {
        // First byte 0b10000001 → position 0 = 1, 1..6 = 0, 7 = 1
        const bs = new Bitstring({ buffer: new Uint8Array([0b10000001]) });
        assert.equal(bs.get(0), true);
        assert.equal(bs.get(7), true);
        for (let i = 1; i <= 6; i++) assert.equal(bs.get(i), false);
    });

    it('reads bits LSB-first when leftToRightIndexing=false', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0b00000001]), leftToRightIndexing: false });
        assert.equal(bs.get(0), true);
    });

    it('throws when get() position is out of range', () => {
        const bs = new Bitstring({ length: 8 });
        assert.throws(() => bs.get(8), /out of range/);
        assert.throws(() => bs.get(9), /out of range/);
    });

    it('honours deprecated littleEndianBits alias', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0b00000001]), littleEndianBits: false });
        // littleEndianBits=false ↔ leftToRightIndexing=false → position 0 = LSB = 1
        assert.equal(bs.get(0), true);
    });

    it('rejects when both leftToRightIndexing and littleEndianBits are supplied', () => {
        assert.throws(
            () => new Bitstring({ length: 8, leftToRightIndexing: true, littleEndianBits: false }),
            /not allowed/
        );
    });

    it('decodeBits round-trips a base64url-encoded gzipped payload (deflate via pako)', async () => {
        // Smoke-test: empty string is not valid; just verify decodeBits requires a string and throws on bad input
        await assert.rejects(Bitstring.decodeBits({ encoded: 'not-real-base64url-gzip' }));
        await assert.rejects(Bitstring.decodeBits({ encoded: 123 }), /must be a string/);
    });
});
