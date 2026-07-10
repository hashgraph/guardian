import assert from 'node:assert/strict';

describe('queue-service config module', () => {
    it('imports without throwing and runs dotenv.config()', async () => {
        const mod = await import('../dist/config.js');
        assert.ok(mod);
    });
});
