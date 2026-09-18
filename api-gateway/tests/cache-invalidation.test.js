import assert from 'node:assert/strict';
import { getCacheKey } from '../dist/helpers/interceptors/utils/cache.js';
import { CacheService } from '../dist/helpers/cache-service.js';
import { CACHE_PREFIXES, CACHE_TAG_PREFIXES } from '../dist/constants/index.js';

class FakeCacheClient {
    constructor() {
        this.values = new Map();
        this.tags = new Map();
    }

    async set(key, value) {
        this.values.set(key, value);
    }

    async get(key) {
        return this.values.get(key) ?? null;
    }

    async sadd(tag, key) {
        if (!this.tags.has(tag)) {
            this.tags.set(tag, new Set());
        }
        this.tags.get(tag).add(key);
    }

    async smembers(tag) {
        return Array.from(this.tags.get(tag) ?? []);
    }

    async del(keys) {
        for (const key of [].concat(keys)) {
            this.values.delete(key);
            this.tags.delete(key);
        }
    }

    async keys(pattern) {
        const prefix = pattern.replace(/\*$/, '');
        return Array.from(this.tags.keys()).filter(tag => tag.startsWith(prefix));
    }
}

describe('cache invalidation', () => {
    const user = { id: 'u1', did: 'did:hedera:1' };

    describe('getCacheKey', () => {
        it('strips the query string from a tag', () => {
            const [withQuery] = getCacheKey(['/schemas/0.0.1?pageIndex=0'], user);
            const [withoutQuery] = getCacheKey(['/schemas/0.0.1'], user);
            assert.equal(withQuery, withoutQuery);
        });

        it('keeps the query string in a cache key', () => {
            const [withQuery] = getCacheKey(['/schemas/0.0.1?pageIndex=0'], user, CACHE_PREFIXES.CACHE);
            const [withoutQuery] = getCacheKey(['/schemas/0.0.1'], user, CACHE_PREFIXES.CACHE);
            assert.notEqual(withQuery, withoutQuery);
            assert.ok(withQuery.includes('?pageIndex=0'));
        });

        it('lets a mutation carrying query params invalidate the tag of its own route', async () => {
            const client = new FakeCacheClient();
            const service = new CacheService(client);

            const [readKey] = getCacheKey(['/schemas/id1'], user, CACHE_PREFIXES.CACHE);
            const [readTag] = getCacheKey(['/schemas/id1'], user);
            await service.set(readKey, 'cached', 600, readTag);

            // The delete handler sees `/schemas/id1?includeChildren=false`.
            await service.invalidate(getCacheKey(['/schemas/id1?includeChildren=false'], user));

            assert.equal(await service.get(readKey), null);
        });
    });

    describe('CacheService.invalidateAllTagsByPrefixes', () => {
        it('drops every schema listing cached for the user', async () => {
            const client = new FakeCacheClient();
            const service = new CacheService(client);

            const routes = ['/schemas', '/schemas/0.0.1', '/schemas/list/all', '/schemas/schema-with-sub-schemas', '/schema/id1'];
            for (const route of routes) {
                const [key] = getCacheKey([route], user, CACHE_PREFIXES.CACHE);
                const [tag] = getCacheKey([route], user);
                await service.set(key, 'cached', 600, tag);
            }
            const [otherKey] = getCacheKey(['/policies'], user, CACHE_PREFIXES.CACHE);
            const [otherTag] = getCacheKey(['/policies'], user);
            await service.set(otherKey, 'cached', 600, otherTag);

            await service.invalidateAllTagsByPrefixes(CACHE_TAG_PREFIXES.SCHEMAS);

            for (const route of routes) {
                const [key] = getCacheKey([route], user, CACHE_PREFIXES.CACHE);
                assert.equal(await service.get(key), null, `${route} should have been invalidated`);
            }
            assert.equal(await service.get(otherKey), 'cached');
        });

        it('matches the prefixes a tag is actually stored under', () => {
            const [listing] = getCacheKey(['/schemas/0.0.1'], user);
            const [single] = getCacheKey(['/schema/id1'], user);
            assert.ok(CACHE_TAG_PREFIXES.SCHEMAS.some(prefix => listing.startsWith(prefix)));
            assert.ok(CACHE_TAG_PREFIXES.SCHEMAS.some(prefix => single.startsWith(prefix)));
        });
    });
});
