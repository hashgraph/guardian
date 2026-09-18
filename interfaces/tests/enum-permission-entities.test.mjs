import assert from 'node:assert/strict';
import { PermissionEntities } from '../dist/type/permissions.type.js';

describe('PermissionEntities enum', () => {
    it('exposes representative resource entities', () => {
        for (const k of ['ACCOUNT', 'STANDARD_REGISTRY', 'USER', 'BALANCE', 'POLICY', 'TOOL', 'DOCUMENT', 'SCHEMA']) {
            assert.equal(PermissionEntities[k], k);
        }
    });
});
