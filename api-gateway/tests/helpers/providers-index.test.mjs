import assert from 'node:assert/strict';
import * as providers from '../../dist/helpers/providers/index.js';
import * as cache from '../../dist/helpers/providers/cache-provider.js';
import * as mongo from '../../dist/helpers/providers/logger-mongo-provider.js';
import * as pino from '../../dist/helpers/providers/pino-logger-provider.js';

describe('providers barrel (helpers/providers/index.js)', () => {
    it('does not re-export a default binding', () => {
        assert.equal(providers.default, undefined);
    });

    it('re-exports the cache-provider bindings', () => {
        assert.equal(providers.cacheProvider, cache.cacheProvider);
        assert.equal(providers.CACHE_CLIENT, cache.CACHE_CLIENT);
    });

    it('re-exports the mongo logger provider', () => {
        assert.equal(providers.loggerMongoProvider, mongo.loggerMongoProvider);
    });

    it('re-exports the pino logger provider', () => {
        assert.equal(providers.pinoLoggerProvider, pino.pinoLoggerProvider);
    });

    it('re-exports every named binding from each sub-module', () => {
        for (const sub of [cache, mongo, pino]) {
            for (const key of Object.keys(sub)) {
                if (key === 'default') {
                    continue;
                }
                assert.ok(
                    Object.prototype.hasOwnProperty.call(providers, key),
                    `barrel is missing re-export "${key}"`
                );
                assert.equal(providers[key], sub[key], `binding "${key}" should be identical`);
            }
        }
    });
});
