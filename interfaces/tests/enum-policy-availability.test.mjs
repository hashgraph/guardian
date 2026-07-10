import assert from 'node:assert/strict';
import { PolicyAvailability } from '../dist/type/policy-availability.type.js';

describe('PolicyAvailability enum', () => {
    it('uses lowercase private/public', () => {
        assert.equal(PolicyAvailability.PRIVATE, 'private');
        assert.equal(PolicyAvailability.PUBLIC, 'public');
    });
});
