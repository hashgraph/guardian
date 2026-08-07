import assert from 'node:assert/strict';
import { getCacheKey } from '../dist/helpers/interceptors/utils/cache.js';
import { CACHE_PREFIXES } from '../dist/constants/index.js';

describe('getCacheKey', () => {
    const user = { id: 'u1', did: 'did:hedera:1' };
    const otherUser = { id: 'u2', did: 'did:hedera:2' };

    it('returns one entry per input route', () => {
        const keys = getCacheKey(['/a', '/b', '/c'], user);
        assert.equal(keys.length, 3);
    });

    it('uses the TAG prefix by default', () => {
        const [key] = getCacheKey(['/a'], user);
        assert.ok(key.startsWith(CACHE_PREFIXES.TAG));
    });

    it('respects an explicit prefix', () => {
        const [key] = getCacheKey(['/a'], user, CACHE_PREFIXES.CACHE);
        assert.ok(key.startsWith(CACHE_PREFIXES.CACHE));
    });

    it('produces a stable hash for the same user and route', () => {
        const [a] = getCacheKey(['/x'], user);
        const [b] = getCacheKey(['/x'], user);
        assert.equal(a, b);
    });

    it('produces different keys for different users on the same route', () => {
        const [a] = getCacheKey(['/x'], user);
        const [b] = getCacheKey(['/x'], otherUser);
        assert.notEqual(a, b);
    });

    it('decodes percent-encoded characters that decodeURI handles', () => {
        // decodeURI decodes %20 (space) but not reserved chars like %2F.
        const [encoded] = getCacheKey(['/hello%20world'], user);
        const [decoded] = getCacheKey(['/hello world'], user);
        assert.equal(encoded, decoded);
    });

    it('falls back to the raw route when decoding throws', () => {
        const malformed = '/bad%E0%A4%A';
        const keys = getCacheKey([malformed], user);
        assert.ok(keys[0].includes(malformed));
    });

    it('treats null and undefined users equivalently', () => {
        const [a] = getCacheKey(['/x'], null);
        const [b] = getCacheKey(['/x'], undefined);
        assert.equal(a, b);
    });
});
