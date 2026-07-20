import assert from 'node:assert/strict';

describe('topic-listener-service module barrels', () => {
    it('imports the interface barrel without throwing', async () => {
        const mod = await import('../dist/interface/index.js');
        assert.ok(mod);
    });

    it('imports the config module (runs dotenv.config())', async () => {
        const mod = await import('../dist/config.js');
        assert.ok(mod);
    });
});
