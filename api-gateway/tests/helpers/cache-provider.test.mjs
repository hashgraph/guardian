import assert from 'node:assert/strict';
import esmock from 'esmock';

let cacheCtorArgs;

class FakeCache {
    constructor(options) {
        cacheCtorArgs.push(options);
        this.options = options;
    }
}

const ENV_KEYS = [
    'HOST_CACHE',
    'PORT_CACHE',
    'USE_SENTINEL',
    'SENTINEL_HOSTS',
    'REDIS_MASTER_NAME',
];

beforeEach(function () {
    this.timeout(60000);
});

const loadProvider = async (env) => {
    cacheCtorArgs = [];
    const saved = {};
    for (const key of ENV_KEYS) {
        saved[key] = process.env[key];
        delete process.env[key];
    }
    for (const [key, value] of Object.entries(env)) {
        process.env[key] = value;
    }
    try {
        const mod = await esmock('../../dist/helpers/providers/cache-provider.js', {
            ioredis: { default: FakeCache },
        });
        return mod;
    } finally {
        for (const key of ENV_KEYS) {
            if (saved[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = saved[key];
            }
        }
    }
};

describe('cacheProvider constants', () => {
    it('exports CACHE_CLIENT token equal to the string "CACHE_CLIENT"', async () => {
        const { CACHE_CLIENT } = await loadProvider({});
        assert.equal(CACHE_CLIENT, 'CACHE_CLIENT');
    });

    it('provides under the CACHE_CLIENT token', async () => {
        const { cacheProvider, CACHE_CLIENT } = await loadProvider({});
        assert.equal(cacheProvider.provide, CACHE_CLIENT);
    });

    it('exposes a useFactory function', async () => {
        const { cacheProvider } = await loadProvider({});
        assert.equal(typeof cacheProvider.useFactory, 'function');
    });
});

describe('cacheProvider direct connection branch', () => {
    it('builds a direct Redis client using HOST_CACHE and numeric PORT_CACHE', async () => {
        const { cacheProvider } = await loadProvider({
            HOST_CACHE: 'redis-host',
            PORT_CACHE: '6380',
        });
        const client = cacheProvider.useFactory();
        assert.ok(client instanceof FakeCache);
        assert.deepEqual(cacheCtorArgs[0], { host: 'redis-host', port: 6380 });
    });

    it('uses the direct branch when USE_SENTINEL is unset even if hosts exist', async () => {
        const { cacheProvider } = await loadProvider({
            HOST_CACHE: 'h',
            PORT_CACHE: '1',
            SENTINEL_HOSTS: 'a:1,b:2',
        });
        cacheProvider.useFactory();
        assert.deepEqual(cacheCtorArgs[0], { host: 'h', port: 1 });
    });

    it('uses the direct branch when USE_SENTINEL is "true" but no sentinel hosts are configured', async () => {
        const { cacheProvider } = await loadProvider({
            USE_SENTINEL: 'true',
            HOST_CACHE: 'h2',
            PORT_CACHE: '2',
        });
        cacheProvider.useFactory();
        assert.deepEqual(cacheCtorArgs[0], { host: 'h2', port: 2 });
    });

    it('yields NaN port when PORT_CACHE is missing (pins Number(undefined) behavior)', async () => {
        const { cacheProvider } = await loadProvider({ HOST_CACHE: 'h' });
        cacheProvider.useFactory();
        assert.ok(Number.isNaN(cacheCtorArgs[0].port));
        assert.equal(cacheCtorArgs[0].host, 'h');
    });

    it('treats USE_SENTINEL values other than exactly "true" as false', async () => {
        const { cacheProvider } = await loadProvider({
            USE_SENTINEL: 'TRUE',
            SENTINEL_HOSTS: 'a:1',
            HOST_CACHE: 'h3',
            PORT_CACHE: '3',
        });
        cacheProvider.useFactory();
        assert.deepEqual(cacheCtorArgs[0], { host: 'h3', port: 3 });
    });
});

describe('cacheProvider sentinel branch', () => {
    it('builds a sentinel client mapping host:port pairs and the master name', async () => {
        const { cacheProvider } = await loadProvider({
            USE_SENTINEL: 'true',
            SENTINEL_HOSTS: 's1:26379,s2:26380',
            REDIS_MASTER_NAME: 'mymaster',
        });
        cacheProvider.useFactory();
        assert.deepEqual(cacheCtorArgs[0], {
            sentinels: [
                { host: 's1', port: 26379 },
                { host: 's2', port: 26380 },
            ],
            name: 'mymaster',
        });
    });

    it('passes name as undefined when REDIS_MASTER_NAME is unset', async () => {
        const { cacheProvider } = await loadProvider({
            USE_SENTINEL: 'true',
            SENTINEL_HOSTS: 's1:1',
        });
        cacheProvider.useFactory();
        assert.equal(cacheCtorArgs[0].name, undefined);
        assert.deepEqual(cacheCtorArgs[0].sentinels, [{ host: 's1', port: 1 }]);
    });

    it('parses a sentinel host that has no port to NaN port', async () => {
        const { cacheProvider } = await loadProvider({
            USE_SENTINEL: 'true',
            SENTINEL_HOSTS: 'only-host',
        });
        cacheProvider.useFactory();
        assert.equal(cacheCtorArgs[0].sentinels[0].host, 'only-host');
        assert.ok(Number.isNaN(cacheCtorArgs[0].sentinels[0].port));
    });
});
