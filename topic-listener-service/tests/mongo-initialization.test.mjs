import assert from 'node:assert/strict';
import { mongoInitialization } from '../dist/helpers/mongo-initialization.js';

describe('mongoInitialization', () => {
    let original;

    before(() => {
        original = process.env.DB_DATABASE;
    });

    after(() => {
        if (original === undefined) { delete process.env.DB_DATABASE; }
        else { process.env.DB_DATABASE = original; }
    });

    it('is an async function', () => {
        assert.equal(typeof mongoInitialization, 'function');
        assert.equal(mongoInitialization.constructor.name, 'AsyncFunction');
    });

    it('returns null when DB_DATABASE is not set', async () => {
        delete process.env.DB_DATABASE;
        const result = await mongoInitialization();
        assert.equal(result, null);
    });

    it('returns null when DB_DATABASE is an empty string', async () => {
        process.env.DB_DATABASE = '';
        const result = await mongoInitialization();
        assert.equal(result, null);
    });

    it('returns a promise', () => {
        delete process.env.DB_DATABASE;
        const p = mongoInitialization();
        assert.equal(typeof p.then, 'function');
        return p;
    });

    it('invokes MikroORM.init when DB_DATABASE is set (env-provided pool sizes)', () => {
        const savedPool = {
            min: process.env.MIN_POOL_SIZE,
            max: process.env.MAX_POOL_SIZE,
            idle: process.env.MAX_IDLE_TIME_MS,
        };
        process.env.DB_DATABASE = 'topic-listener-test';
        process.env.MIN_POOL_SIZE = '2';
        process.env.MAX_POOL_SIZE = '8';
        process.env.MAX_IDLE_TIME_MS = '1000';
        try {
            const result = mongoInitialization();
            assert.notEqual(result, null);
            assert.equal(typeof result.then, 'function');
            result.then(() => {}, () => {});
        } finally {
            const restore = (key, val) => {
                if (val === undefined) { delete process.env[key]; } else { process.env[key] = val; }
            };
            restore('MIN_POOL_SIZE', savedPool.min);
            restore('MAX_POOL_SIZE', savedPool.max);
            restore('MAX_IDLE_TIME_MS', savedPool.idle);
        }
    });
});
