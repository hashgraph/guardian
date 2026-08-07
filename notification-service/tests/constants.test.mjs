import assert from 'node:assert/strict';
import { DEFAULT as DEFAULT_MONGO } from '../dist/constants/mongo.js';
import { DEFAULT_MONGO as DEFAULT_MONGO_BARREL } from '../dist/constants/index.js';

describe('constants barrel (notification-service)', () => {
    it('re-exports DEFAULT_MONGO from the mongo module', () => {
        assert.equal(DEFAULT_MONGO_BARREL, DEFAULT_MONGO);
    });
});

describe('DEFAULT_MONGO constants (notification-service)', () => {
    it('exposes the expected mongo pool defaults', () => {
        assert.deepEqual(DEFAULT_MONGO, {
            MIN_POOL_SIZE: '1',
            MAX_POOL_SIZE: '5',
            MAX_IDLE_TIME_MS: '30000',
        });
    });

    it('values are strings (env-style)', () => {
        for (const key of Object.keys(DEFAULT_MONGO)) {
            assert.equal(typeof DEFAULT_MONGO[key], 'string', `${key} should be a string`);
        }
    });

    it('min pool size <= max pool size', () => {
        assert.ok(
            Number(DEFAULT_MONGO.MIN_POOL_SIZE) <= Number(DEFAULT_MONGO.MAX_POOL_SIZE)
        );
    });

    it('max idle time is positive', () => {
        assert.ok(Number(DEFAULT_MONGO.MAX_IDLE_TIME_MS) > 0);
    });
});
