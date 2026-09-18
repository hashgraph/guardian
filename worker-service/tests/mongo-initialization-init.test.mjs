import assert from 'node:assert/strict';
import esmock from 'esmock';

const DIST = '../dist/helpers/mongo-initialization.js';

function makeMocks() {
    const rec = { initArgs: null };
    const mocks = {
        '@mikro-orm/core': {
            MikroORM: {
                init: async (opts) => { rec.initArgs = opts; return { orm: true }; },
            },
        },
        '@mikro-orm/mongodb': { MongoDriver: class {} },
    };
    return { rec, mocks };
}

describe('@unit mongoInitialization with DB_DATABASE set', function () {
    this.timeout(60000);
    let saved;
    beforeEach(() => {
        saved = {
            db: process.env.DB_DATABASE,
            min: process.env.MIN_POOL_SIZE,
            max: process.env.MAX_POOL_SIZE,
            idle: process.env.MAX_IDLE_TIME_MS,
        };
    });
    afterEach(() => {
        const restore = (k, v) => { if (v === undefined) { delete process.env[k]; } else { process.env[k] = v; } };
        restore('DB_DATABASE', saved.db);
        restore('MIN_POOL_SIZE', saved.min);
        restore('MAX_POOL_SIZE', saved.max);
        restore('MAX_IDLE_TIME_MS', saved.idle);
    });

    it('calls MikroORM.init and applies default pool options', async () => {
        process.env.DB_DATABASE = 'guardian_db';
        delete process.env.MIN_POOL_SIZE;
        delete process.env.MAX_POOL_SIZE;
        delete process.env.MAX_IDLE_TIME_MS;
        const { rec, mocks } = makeMocks();
        const { mongoInitialization } = await esmock(DIST, mocks);
        const result = await mongoInitialization();
        assert.deepEqual(result, { orm: true });
        assert.ok(rec.initArgs);
        assert.equal(rec.initArgs.ensureIndexes, true);
        assert.equal(typeof rec.initArgs.driverOptions.minPoolSize, 'number');
        assert.equal(typeof rec.initArgs.driverOptions.maxPoolSize, 'number');
        assert.equal(typeof rec.initArgs.driverOptions.maxIdleTimeMS, 'number');
    });

    it('parses pool overrides from the environment', async () => {
        process.env.DB_DATABASE = 'guardian_db';
        process.env.MIN_POOL_SIZE = '7';
        process.env.MAX_POOL_SIZE = '42';
        process.env.MAX_IDLE_TIME_MS = '9999';
        const { rec, mocks } = makeMocks();
        const { mongoInitialization } = await esmock(DIST, mocks);
        await mongoInitialization();
        assert.equal(rec.initArgs.driverOptions.minPoolSize, 7);
        assert.equal(rec.initArgs.driverOptions.maxPoolSize, 42);
        assert.equal(rec.initArgs.driverOptions.maxIdleTimeMS, 9999);
    });
});
