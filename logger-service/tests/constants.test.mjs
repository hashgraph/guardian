import assert from 'node:assert/strict';
import { DEFAULT as DEFAULT_MONGO } from '../dist/constants/mongo.js';
import { DEFAULT_MONGO as DEFAULT_MONGO_BARREL } from '../dist/constants/index.js';

describe('constants barrel (logger-service)', () => {
    it('re-exports DEFAULT_MONGO from the mongo module', () => {
        assert.equal(DEFAULT_MONGO_BARREL, DEFAULT_MONGO);
    });
});

describe('DEFAULT_MONGO constants (logger-service)', () => {
    it('exposes the expected mongo pool defaults', () => {
        assert.deepEqual(DEFAULT_MONGO, {
            MIN_POOL_SIZE: '1',
            MAX_POOL_SIZE: '5',
            MAX_IDLE_TIME_MS: '30000',
        });
    });

    it('all values are strings (env-style)', () => {
        for (const [k, v] of Object.entries(DEFAULT_MONGO)) {
            assert.equal(typeof v, 'string', `${k} should be a string`);
        }
    });

    it('min pool size is <= max pool size and both are positive integers', () => {
        const min = Number(DEFAULT_MONGO.MIN_POOL_SIZE);
        const max = Number(DEFAULT_MONGO.MAX_POOL_SIZE);
        assert.ok(Number.isInteger(min) && min > 0);
        assert.ok(Number.isInteger(max) && max > 0);
        assert.ok(min <= max);
    });

    it('max idle time parses to a positive number', () => {
        const idle = Number(DEFAULT_MONGO.MAX_IDLE_TIME_MS);
        assert.ok(Number.isFinite(idle) && idle > 0);
    });
});
