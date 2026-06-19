import assert from 'node:assert/strict';
import { PermissionCategories } from '../dist/type/permissions.type.js';

describe('PermissionCategories enum', () => {
    it('exposes representative top-level categories', () => {
        for (const k of ['ACCOUNTS', 'POLICIES', 'SCHEMAS', 'TOKENS', 'TOOLS', 'PERMISSIONS', 'STATISTICS', 'FORMULAS']) {
            assert.equal(PermissionCategories[k], k);
        }
    });
    it('has 20+ categories', () => {
        assert.ok(Object.keys(PermissionCategories).length >= 20);
    });
});
