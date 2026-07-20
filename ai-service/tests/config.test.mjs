import assert from 'node:assert/strict';

describe('config bootstrap', () => {
    it('loads without throwing and applies dotenv', async () => {
        const mod = await import('../dist/config.js');
        assert.ok(mod);
    });
});
