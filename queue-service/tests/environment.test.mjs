import assert from 'node:assert/strict';
import { ApplicationEnvironment } from '../dist/environment.js';

describe('ApplicationEnvironment (queue-service)', () => {
    it('is exported as an object', () => {
        assert.equal(typeof ApplicationEnvironment, 'object');
        assert.notEqual(ApplicationEnvironment, null);
    });

    it('exposes a boolean demoMode flag defaulting to true', () => {
        assert.equal(typeof ApplicationEnvironment.demoMode, 'boolean');
        assert.equal(ApplicationEnvironment.demoMode, true);
    });
});
