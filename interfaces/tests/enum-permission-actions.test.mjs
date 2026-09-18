import assert from 'node:assert/strict';
import { PermissionActions } from '../dist/type/permissions.type.js';

describe('PermissionActions enum', () => {
    it('exposes the standard CRUD-plus-extras action set', () => {
        for (const k of ['ALL', 'READ', 'CREATE', 'UPDATE', 'DELETE', 'REVIEW', 'TAG', 'AUDIT', 'EXECUTE', 'MANAGE']) {
            assert.equal(PermissionActions[k], k);
        }
    });
});
