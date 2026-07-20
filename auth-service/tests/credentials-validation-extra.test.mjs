import { assert } from 'chai';
import pako from 'pako';
import { Bitstring } from '../dist/helpers/credentials-validation/bitstring.js';
import { StatusList } from '../dist/helpers/credentials-validation/status-list.js';
import {
    isNumber,
    isPositiveInteger,
    isString,
    isBoolean,
    isNonNegativeInteger,
    isUint8Array,
} from '../dist/helpers/credentials-validation/assertions.js';

function encode(bytes) {
    const gz = pako.gzip(new Uint8Array(bytes));
    return Buffer.from(gz).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('@unit assertions.isNumber', () => {
    it('accepts an integer', () => assert.doesNotThrow(() => isNumber(5, 'n')));
    it('accepts a float', () => assert.doesNotThrow(() => isNumber(1.5, 'n')));
    it('accepts zero', () => assert.doesNotThrow(() => isNumber(0, 'n')));
    it('accepts a negative number', () => assert.doesNotThrow(() => isNumber(-3, 'n')));
    it('accepts NaN (typeof number)', () => assert.doesNotThrow(() => isNumber(NaN, 'n')));
    it('rejects a string', () => assert.throws(() => isNumber('5', 'n'), /"n" must be number/));
    it('rejects null', () => assert.throws(() => isNumber(null, 'n'), /must be number/));
    it('rejects undefined', () => assert.throws(() => isNumber(undefined, 'n'), /must be number/));
    it('rejects a boolean', () => assert.throws(() => isNumber(true, 'n'), /must be number/));
});

describe('@unit assertions.isPositiveInteger', () => {
    it('accepts 1', () => assert.doesNotThrow(() => isPositiveInteger(1, 'p')));
    it('accepts a large integer', () => assert.doesNotThrow(() => isPositiveInteger(99999, 'p')));
    it('rejects 0', () => assert.throws(() => isPositiveInteger(0, 'p'), /positive integer/));
    it('rejects a negative integer', () => assert.throws(() => isPositiveInteger(-1, 'p'), /positive integer/));
    it('rejects a float', () => assert.throws(() => isPositiveInteger(1.5, 'p'), /positive integer/));
    it('rejects a numeric string', () => assert.throws(() => isPositiveInteger('1', 'p'), /positive integer/));
    it('rejects NaN', () => assert.throws(() => isPositiveInteger(NaN, 'p'), /positive integer/));
});

describe('@unit assertions.isString', () => {
    it('accepts an empty string', () => assert.doesNotThrow(() => isString('', 's')));
    it('accepts a non-empty string', () => assert.doesNotThrow(() => isString('hi', 's')));
    it('rejects a number', () => assert.throws(() => isString(1, 's'), /must be a string/));
    it('rejects null', () => assert.throws(() => isString(null, 's'), /must be a string/));
    it('rejects an array', () => assert.throws(() => isString([], 's'), /must be a string/));
});

describe('@unit assertions.isBoolean', () => {
    it('accepts true', () => assert.doesNotThrow(() => isBoolean(true, 'b')));
    it('accepts false', () => assert.doesNotThrow(() => isBoolean(false, 'b')));
    it('rejects 0', () => assert.throws(() => isBoolean(0, 'b'), /must be a boolean/));
    it('rejects a string', () => assert.throws(() => isBoolean('true', 'b'), /must be a boolean/));
    it('rejects null', () => assert.throws(() => isBoolean(null, 'b'), /must be a boolean/));
});

describe('@unit assertions.isNonNegativeInteger', () => {
    it('accepts 0', () => assert.doesNotThrow(() => isNonNegativeInteger(0, 'i')));
    it('accepts a positive integer', () => assert.doesNotThrow(() => isNonNegativeInteger(10, 'i')));
    it('rejects -1', () => assert.throws(() => isNonNegativeInteger(-1, 'i'), /non-negative integer/));
    it('rejects a float', () => assert.throws(() => isNonNegativeInteger(0.5, 'i'), /non-negative integer/));
    it('rejects a string', () => assert.throws(() => isNonNegativeInteger('0', 'i'), /non-negative integer/));
});

describe('@unit assertions.isUint8Array', () => {
    it('accepts a Uint8Array', () => assert.doesNotThrow(() => isUint8Array(new Uint8Array(2), 'u')));
    it('accepts an empty Uint8Array', () => assert.doesNotThrow(() => isUint8Array(new Uint8Array(0), 'u')));
    it('rejects a plain array', () => assert.throws(() => isUint8Array([1, 2], 'u'), /must be a Uint8Array/));
    it('rejects null', () => assert.throws(() => isUint8Array(null, 'u'), /must be a Uint8Array/));
    it('rejects an ArrayBuffer', () => assert.throws(() => isUint8Array(new ArrayBuffer(2), 'u'), /must be a Uint8Array/));
});

describe('@unit Bitstring.get — full-byte patterns (leftToRight default)', () => {
    it('all-ones byte reads true at every position', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0xff]) });
        for (let i = 0; i < 8; i++) assert.isTrue(bs.get(i));
    });

    it('all-zero byte reads false at every position', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0x00]) });
        for (let i = 0; i < 8; i++) assert.isFalse(bs.get(i));
    });

    it('alternating 0b10101010 reads true on even indices', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0b10101010]) });
        assert.isTrue(bs.get(0));
        assert.isFalse(bs.get(1));
        assert.isTrue(bs.get(2));
        assert.isFalse(bs.get(3));
    });

    it('alternating 0b01010101 reads false on even indices', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0b01010101]) });
        assert.isFalse(bs.get(0));
        assert.isTrue(bs.get(1));
        assert.isFalse(bs.get(2));
        assert.isTrue(bs.get(7));
    });

    it('reads across three bytes', () => {
        const bs = new Bitstring({ buffer: new Uint8Array([0x00, 0xff, 0x00]) });
        assert.isFalse(bs.get(0));
        assert.isTrue(bs.get(8));
        assert.isTrue(bs.get(15));
        assert.isFalse(bs.get(16));
    });
});

describe('@unit Bitstring.get — leftToRightIndexing=false', () => {
    it('reverses the within-byte bit order', () => {
        const buffer = new Uint8Array([0b0000_0001]);
        const bs = new Bitstring({ buffer, leftToRightIndexing: false });
        assert.isTrue(bs.get(0));
        assert.isFalse(bs.get(7));
    });

    it('MSB is read at index 7', () => {
        const buffer = new Uint8Array([0b1000_0000]);
        const bs = new Bitstring({ buffer, leftToRightIndexing: false });
        assert.isFalse(bs.get(0));
        assert.isTrue(bs.get(7));
    });
});

describe('@unit Bitstring construction edge cases', () => {
    it('length=1 yields a single addressable bit', () => {
        const bs = new Bitstring({ length: 1 });
        assert.isFalse(bs.get(0));
        assert.throws(() => bs.get(1), /out of range/);
    });

    it('length=8 spans exactly one byte', () => {
        const bs = new Bitstring({ length: 8 });
        assert.isFalse(bs.get(7));
        assert.throws(() => bs.get(8), /out of range/);
    });

    it('buffer length determines bit length (n*8)', () => {
        const bs = new Bitstring({ buffer: new Uint8Array(3) });
        assert.isFalse(bs.get(23));
        assert.throws(() => bs.get(24), /out of range/);
    });
});

describe('@unit Bitstring.decodeBits — gzip round-trips', () => {
    it('recovers a single byte', async () => {
        const out = await Bitstring.decodeBits({ encoded: encode([0xab]) });
        assert.deepEqual(Array.from(out), [0xab]);
    });

    it('recovers multiple bytes', async () => {
        const out = await Bitstring.decodeBits({ encoded: encode([1, 2, 3, 4, 5]) });
        assert.deepEqual(Array.from(out), [1, 2, 3, 4, 5]);
    });

    it('recovers all-zero bytes', async () => {
        const out = await Bitstring.decodeBits({ encoded: encode([0, 0, 0, 0]) });
        assert.deepEqual(Array.from(out), [0, 0, 0, 0]);
    });

    it('result is a Uint8Array', async () => {
        const out = await Bitstring.decodeBits({ encoded: encode([7]) });
        assert.instanceOf(out, Uint8Array);
    });

    it('rejects non-string encoded input', async () => {
        let threw = false;
        try { await Bitstring.decodeBits({ encoded: 42 }); } catch { threw = true; }
        assert.isTrue(threw);
    });
});

describe('@unit StatusList.decode + getStatus', () => {
    it('reconstructs bit length from the decoded buffer', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0x00]) });
        assert.equal(sl.length, 8);
    });

    it('reads a set MSB at index 0', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0b1000_0000]) });
        assert.isTrue(sl.getStatus(0));
        assert.isFalse(sl.getStatus(1));
    });

    it('reads a set LSB at index 7', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0b0000_0001]) });
        assert.isTrue(sl.getStatus(7));
        assert.isFalse(sl.getStatus(0));
    });

    it('reads both ends set (0b10000001)', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0b1000_0001]) });
        assert.isTrue(sl.getStatus(0));
        assert.isTrue(sl.getStatus(7));
        assert.isFalse(sl.getStatus(3));
    });

    it('two bytes give length 16', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0x00, 0xff]) });
        assert.equal(sl.length, 16);
        assert.isFalse(sl.getStatus(0));
        assert.isTrue(sl.getStatus(8));
        assert.isTrue(sl.getStatus(15));
    });

    it('rejects an undecodable encoded list', async () => {
        let threw = false;
        try { await StatusList.decode({ encodedList: 'not-valid-gzip-base64url' }); } catch { threw = true; }
        assert.isTrue(threw);
    });
});

describe('@unit StatusList.convertToBinaryString', () => {
    it('renders an all-zero byte as eight zeros', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0x00]) });
        assert.equal(sl.convertToBinaryString(), '00000000');
    });

    it('renders an all-ones byte as eight ones', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0xff]) });
        assert.equal(sl.convertToBinaryString(), '11111111');
    });

    it('renders a known pattern with leading-zero padding', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0b0000_0001]) });
        assert.equal(sl.convertToBinaryString(), '00000001');
    });

    it('concatenates multiple bytes in order', async () => {
        const sl = await StatusList.decode({ encodedList: encode([0b1000_0000, 0b0000_0001]) });
        assert.equal(sl.convertToBinaryString(), '1000000000000001');
    });

    it('output length equals 8 * byte count', async () => {
        const sl = await StatusList.decode({ encodedList: encode([1, 2, 3]) });
        assert.lengthOf(sl.convertToBinaryString(), 24);
    });
});

describe('@unit StatusList constructor from buffer', () => {
    it('exposes a length of buffer.length * 8', () => {
        const sl = new StatusList({ buffer: new Uint8Array(2) });
        assert.equal(sl.length, 16);
    });

    it('reads status from a directly-supplied buffer', () => {
        const sl = new StatusList({ buffer: new Uint8Array([0b1000_0000]) });
        assert.isTrue(sl.getStatus(0));
        assert.isFalse(sl.getStatus(7));
    });

    it('builds from a length producing all-false statuses', () => {
        const sl = new StatusList({ length: 16 });
        assert.equal(sl.length, 16);
        for (let i = 0; i < 16; i++) assert.isFalse(sl.getStatus(i));
    });
});
