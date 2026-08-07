import assert from 'node:assert/strict';
import { PolicyActionType, PolicyActionStatus } from '../dist/type/policy-action.type.js';

describe('PolicyActionType enum', () => {
    it('exposes ACTION / REQUEST / REMOTE_ACTION', () => {
        assert.equal(PolicyActionType.ACTION, 'ACTION');
        assert.equal(PolicyActionType.REQUEST, 'REQUEST');
        assert.equal(PolicyActionType.REMOTE_ACTION, 'REMOTE_ACTION');
    });
});

describe('PolicyActionStatus enum', () => {
    it('exposes the 5 lifecycle statuses', () => {
        for (const k of ['NEW', 'ERROR', 'COMPLETED', 'REJECTED', 'CANCELED']) {
            assert.equal(PolicyActionStatus[k], k);
        }
    });
});
