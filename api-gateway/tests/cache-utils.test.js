import assert from 'node:assert/strict';
import { getHash } from '../dist/helpers/interceptors/utils/hash.js';
import { getCacheKey } from '../dist/helpers/interceptors/utils/cache.js';

describe('getHash', () => {
    it('produces an md5 hex digest (32 chars)', () => {
        const hash = getHash({ id: 'u1', did: 'did:1' });
        assert.match(hash, /^[0-9a-f]{32}$/);
    });

    it('depends only on user.id and user.did', () => {
        const a = getHash({ id: 'u1', did: 'did:1', extra: 'ignored' });
        const b = getHash({ id: 'u1', did: 'did:1' });
        assert.equal(a, b);
    });

    it('produces different hashes for different users', () => {
        const a = getHash({ id: 'u1', did: 'did:1' });
        const b = getHash({ id: 'u2', did: 'did:2' });
        assert.notEqual(a, b);
    });

    it('handles null/undefined as a stable hash', () => {
        const a = getHash(null);
        const b = getHash(undefined);
        // Both serialize to {id: undefined, did: undefined} → identical hash.
        assert.equal(a, b);
    });
});

describe('getCacheKey', () => {
    it('prefixes each route, decodes URI, and appends user hash', () => {
        const keys = getCacheKey(['/api%20path', '/foo'], { id: 'u', did: 'd' }, 'CACHE:');
        assert.equal(keys.length, 2);
        assert.match(keys[0], /^CACHE:\/api path:[0-9a-f]{32}$/);
        assert.match(keys[1], /^CACHE:\/foo:[0-9a-f]{32}$/);
    });

    it('falls back to original route when decodeURI throws', () => {
        // Lone surrogate %ZZ is invalid → decodeURI throws → keep as-is.
        const [key] = getCacheKey(['/bad%ZZ'], null, 'CACHE:');
        assert.match(key, /^CACHE:\/bad%ZZ:[0-9a-f]{32}$/);
    });

    it('uses default TAG prefix when not specified', () => {
        const [key] = getCacheKey(['/foo'], null);
        // Default prefix non-empty.
        assert.ok(key.includes('/foo'));
    });

    it('produces different keys for different users on the same route', () => {
        const [a] = getCacheKey(['/foo'], { id: 'u1', did: 'd1' });
        const [b] = getCacheKey(['/foo'], { id: 'u2', did: 'd2' });
        assert.notEqual(a, b);
    });
});
