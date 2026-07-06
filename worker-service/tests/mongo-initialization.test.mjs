import assert from 'node:assert/strict';
import { mongoInitialization } from '../dist/helpers/mongo-initialization.js';

describe('mongoInitialization', () => {
    let original;

    before(() => {
        original = process.env.DB_DATABASE;
    });

    after(() => {
        if (original === undefined) { delete process.env.DB_DATABASE; }
        else { process.env.DB_DATABASE = original; }
    });

    it('is an async function', () => {
        assert.equal(typeof mongoInitialization, 'function');
        assert.equal(mongoInitialization.constructor.name, 'AsyncFunction');
    });

    it('returns null when DB_DATABASE is not set', async () => {
        delete process.env.DB_DATABASE;
        const result = await mongoInitialization();
        assert.equal(result, null);
    });

    it('returns null when DB_DATABASE is an empty string', async () => {
        process.env.DB_DATABASE = '';
        const result = await mongoInitialization();
        assert.equal(result, null);
    });

    it('returns a promise', () => {
        delete process.env.DB_DATABASE;
        const p = mongoInitialization();
        assert.equal(typeof p.then, 'function');
        return p;
    });
});
