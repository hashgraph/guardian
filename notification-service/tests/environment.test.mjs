import assert from 'node:assert/strict';
import { ApplicationEnvironment } from '../dist/environment.js';

describe('ApplicationEnvironment', () => {
    it('is exported as an object', () => {
        assert.equal(typeof ApplicationEnvironment, 'object');
        assert.notEqual(ApplicationEnvironment, null);
    });

    it('exposes a boolean demoMode flag', () => {
        assert.equal(typeof ApplicationEnvironment.demoMode, 'boolean');
    });

    it('defaults demoMode to true', () => {
        assert.equal(ApplicationEnvironment.demoMode, true);
    });
});
