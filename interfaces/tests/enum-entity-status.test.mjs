import assert from 'node:assert/strict';
import { EntityStatus } from '../dist/type/entity-status.type.js';

describe('EntityStatus enum', () => {
    it('exposes DRAFT / DRY_RUN / PUBLISHED / ERROR / ACTIVE', () => {
        for (const k of ['DRAFT', 'DRY_RUN', 'PUBLISHED', 'ERROR', 'ACTIVE']) {
            assert.equal(EntityStatus[k], k);
        }
    });
    it('has exactly five entries', () => {
        assert.equal(Object.keys(EntityStatus).length, 5);
    });
});
