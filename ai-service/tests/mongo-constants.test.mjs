import assert from 'node:assert/strict';
import { DEFAULT } from '../dist/constants/mongo.js';
import { DEFAULT_MONGO } from '../dist/constants/index.js';

describe('ai-service mongo defaults', () => {
    it('exposes pool/idle defaults as numeric strings', () => {
        assert.equal(DEFAULT.MIN_POOL_SIZE, '1');
        assert.equal(DEFAULT.MAX_POOL_SIZE, '5');
        assert.equal(DEFAULT.MAX_IDLE_TIME_MS, '30000');
    });
    it('re-exports DEFAULT as DEFAULT_MONGO from the constants barrel', () => {
        assert.equal(DEFAULT_MONGO, DEFAULT);
    });
});
