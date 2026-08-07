import assert from 'node:assert/strict';
import { ExternalPolicyStatus } from '../dist/type/external-policy-status.type.js';

describe('ExternalPolicyStatus enum', () => {
    it('exposes NEW / APPROVED / REJECTED', () => {
        assert.equal(ExternalPolicyStatus.NEW, 'NEW');
        assert.equal(ExternalPolicyStatus.APPROVED, 'APPROVED');
        assert.equal(ExternalPolicyStatus.REJECTED, 'REJECTED');
    });
    it('has three entries', () => {
        assert.equal(Object.keys(ExternalPolicyStatus).length, 3);
    });
});
