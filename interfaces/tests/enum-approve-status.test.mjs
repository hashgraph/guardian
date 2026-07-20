import assert from 'node:assert/strict';
import { ApproveStatus } from '../dist/type/approve-status.type.js';

describe('ApproveStatus enum', () => {
    it('exposes NEW / APPROVED / REJECTED', () => {
        assert.equal(ApproveStatus.NEW, 'NEW');
        assert.equal(ApproveStatus.APPROVED, 'APPROVED');
        assert.equal(ApproveStatus.REJECTED, 'REJECTED');
    });
    it('has exactly three entries', () => {
        assert.equal(Object.keys(ApproveStatus).length, 3);
    });
});
