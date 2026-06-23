import assert from 'node:assert/strict';
import { ApplicationEnvironment } from '../dist/environment.js';

describe('topic-listener-service ApplicationEnvironment', () => {
    it('exposes a boolean demoMode flag', () => {
        assert.equal(typeof ApplicationEnvironment.demoMode, 'boolean');
    });

    it('demoMode defaults to true', () => {
        assert.equal(ApplicationEnvironment.demoMode, true);
    });

    it('is mutable so callers can flip it at runtime', () => {
        const original = ApplicationEnvironment.demoMode;
        ApplicationEnvironment.demoMode = false;
        assert.equal(ApplicationEnvironment.demoMode, false);
        ApplicationEnvironment.demoMode = original;
    });
});
