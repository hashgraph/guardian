import assert from 'node:assert/strict';
import { DEFAULT } from '../dist/constants/mongo.js';
import { DEFAULT_MONGO, MAX_REDIRECTS } from '../dist/constants/index.js';

describe('worker-service mongo defaults', () => {
    it('DEFAULT exposes pool/idle defaults as numeric strings', () => {
        assert.equal(DEFAULT.MIN_POOL_SIZE, '1');
        assert.equal(DEFAULT.MAX_POOL_SIZE, '5');
        assert.equal(DEFAULT.MAX_IDLE_TIME_MS, '30000');
    });
    it('DEFAULT_MONGO from constants/index.js is the same DEFAULT', () => {
        assert.equal(DEFAULT_MONGO, DEFAULT);
    });
    it('barrel re-exports MAX_REDIRECTS', () => {
        assert.equal(MAX_REDIRECTS.DEFAULT, 5);
    });
});
