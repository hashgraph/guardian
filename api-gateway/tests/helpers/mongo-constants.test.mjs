import assert from 'node:assert/strict';
import { DEFAULT, LOGGER_PROVIDER } from '../../dist/constants/mongo.js';

describe('api-gateway mongo constants', () => {
    it('DEFAULT exposes pool/idle defaults as numeric strings', () => {
        assert.equal(DEFAULT.MIN_POOL_SIZE, '1');
        assert.equal(DEFAULT.MAX_POOL_SIZE, '5');
        assert.equal(DEFAULT.MAX_IDLE_TIME_MS, '30000');
    });
    it('LOGGER_PROVIDER is the string DI token used in NestJS modules', () => {
        assert.equal(LOGGER_PROVIDER, 'LOGGER_MONGO_PROVIDER');
    });
});
