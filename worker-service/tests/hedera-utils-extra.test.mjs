import assert from 'node:assert/strict';
import { PrivateKey } from '@hiero-ledger/sdk';
import { HederaUtils, timeout } from '../dist/api/helpers/utils.js';

describe('HederaUtils.encode — additional cases', () => {
    it('encodes an empty Uint8Array to an empty string', () => {
        assert.equal(HederaUtils.encode(new Uint8Array([])), '');
    });

    it('encodes ASCII bytes to the matching string', () => {
        const bytes = new Uint8Array([104, 105]);
        assert.equal(HederaUtils.encode(bytes), 'hi');
    });

    it('returns a string type', () => {
        assert.equal(typeof HederaUtils.encode(new Uint8Array([1])), 'string');
    });

    it('encodes from a Buffer instance', () => {
        assert.equal(HederaUtils.encode(Buffer.from('abc')), 'abc');
    });
});

describe('HederaUtils.decode — additional cases', () => {
    it('decodes an empty string to an empty Uint8Array', () => {
        const out = HederaUtils.decode('');
        assert.ok(out instanceof Uint8Array);
        assert.equal(out.length, 0);
    });

    it('decodes ASCII text to the correct byte values', () => {
        assert.deepEqual(Array.from(HederaUtils.decode('AB')), [65, 66]);
    });

    it('returns a Uint8Array type', () => {
        assert.ok(HederaUtils.decode('x') instanceof Uint8Array);
    });

    it('round-trips pure ASCII bytes through encode then decode', () => {
        const original = new Uint8Array([0, 10, 65, 90, 127]);
        const round = HederaUtils.decode(HederaUtils.encode(original));
        assert.deepEqual(Array.from(round), Array.from(original));
    });
});

describe('HederaUtils.randomKey — additional cases', () => {
    it('produces unique values across many calls', () => {
        const set = new Set();
        for (let i = 0; i < 50; i++) {
            set.add(HederaUtils.randomKey());
        }
        assert.equal(set.size, 50);
    });

    it('returns a non-empty string each call', () => {
        const key = HederaUtils.randomKey();
        assert.equal(typeof key, 'string');
        assert.ok(key.length > 0);
    });

    it('always returns a string', () => {
        for (let i = 0; i < 5; i++) {
            assert.equal(typeof HederaUtils.randomKey(), 'string');
        }
    });
});

describe('HederaUtils.parsPrivateKey — additional branches', () => {
    it('defaults keyName to "Private Key" on invalid string', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('bad', true), /Invalid Private Key/);
    });

    it('throws Invalid even when notNull=false for a non-empty bad string', () => {
        assert.throws(() => HederaUtils.parsPrivateKey('bad', false), /Invalid Private Key/);
    });

    it('uses the custom keyName in the not-set message', () => {
        assert.throws(() => HederaUtils.parsPrivateKey(null, true, 'Op Key'), /Op Key is not set/);
    });

    it('returns null for undefined when notNull=false', () => {
        assert.equal(HederaUtils.parsPrivateKey(undefined, false), null);
    });

    it('returns the same PrivateKey object instance when given one', () => {
        const key = PrivateKey.generate();
        assert.equal(HederaUtils.parsPrivateKey(key, true), key);
    });

    it('treats notNull default (true) as throwing on empty string', () => {
        assert.throws(() => HederaUtils.parsPrivateKey(''), /Private Key is not set/);
    });
});

describe('timeout decorator', () => {
    it('is exported as a function factory', () => {
        assert.equal(typeof timeout, 'function');
        assert.equal(typeof timeout(1000), 'function');
    });

    it('resolves with the underlying method result before the timeout', async () => {
        class Svc {
            async fast() {
                return 'done';
            }
        }
        const descriptor = Object.getOwnPropertyDescriptor(Svc.prototype, 'fast');
        timeout(1000)(Svc.prototype, 'fast', descriptor);
        Object.defineProperty(Svc.prototype, 'fast', descriptor);
        const result = await new Svc().fast();
        assert.equal(result, 'done');
    });

    it('rejects with the timeout error when the method is too slow', async () => {
        class Svc {
            async slow() {
                return new Promise((resolve) => setTimeout(() => resolve('late'), 100));
            }
        }
        const descriptor = Object.getOwnPropertyDescriptor(Svc.prototype, 'slow');
        timeout(10, 'too slow')(Svc.prototype, 'slow', descriptor);
        Object.defineProperty(Svc.prototype, 'slow', descriptor);
        await assert.rejects(() => new Svc().slow(), /too slow/);
    });

    it('uses the default timeout message when none is supplied', async () => {
        class Svc {
            async slow() {
                return new Promise((resolve) => setTimeout(() => resolve('late'), 100));
            }
        }
        const descriptor = Object.getOwnPropertyDescriptor(Svc.prototype, 'slow');
        timeout(10)(Svc.prototype, 'slow', descriptor);
        Object.defineProperty(Svc.prototype, 'slow', descriptor);
        await assert.rejects(() => new Svc().slow(), /Transaction timeout exceeded/);
    });
});
