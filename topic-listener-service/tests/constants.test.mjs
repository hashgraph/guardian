import assert from 'node:assert/strict';
import { DEFAULT_MONGO } from '../dist/constants/index.js';

describe('DEFAULT_MONGO constants', () => {
    it('exposes the expected mongo pool defaults', () => {
        assert.deepEqual(DEFAULT_MONGO, {
            MIN_POOL_SIZE: '1',
            MAX_POOL_SIZE: '5',
            MAX_IDLE_TIME_MS: '30000',
        });
    });

    it('values are strings (env-style) so they slot into env-driven config', () => {
        assert.equal(typeof DEFAULT_MONGO.MIN_POOL_SIZE, 'string');
        assert.equal(typeof DEFAULT_MONGO.MAX_POOL_SIZE, 'string');
        assert.equal(typeof DEFAULT_MONGO.MAX_IDLE_TIME_MS, 'string');
    });

    it('min pool size is <= max pool size', () => {
        assert.ok(
            Number(DEFAULT_MONGO.MIN_POOL_SIZE) <= Number(DEFAULT_MONGO.MAX_POOL_SIZE)
        );
    });
});
