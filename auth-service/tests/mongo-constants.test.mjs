import assert from 'node:assert/strict';
import { DEFAULT } from '../dist/constants/mongo.js';

describe('auth-service mongo defaults', () => {
    it('exposes pool/idle defaults as numeric strings', () => {
        assert.equal(DEFAULT.MIN_POOL_SIZE, '1');
        assert.equal(DEFAULT.MAX_POOL_SIZE, '5');
        assert.equal(DEFAULT.MAX_IDLE_TIME_MS, '30000');
    });
    it('values parse as positive numbers', () => {
        assert.ok(Number(DEFAULT.MIN_POOL_SIZE) > 0);
        assert.ok(Number(DEFAULT.MAX_POOL_SIZE) >= Number(DEFAULT.MIN_POOL_SIZE));
        assert.ok(Number(DEFAULT.MAX_IDLE_TIME_MS) > 0);
    });
});
