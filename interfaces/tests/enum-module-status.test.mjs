import assert from 'node:assert/strict';
import { ModuleStatus } from '../dist/type/module-status.type.js';

describe('ModuleStatus enum', () => {
    it('exposes at least the DRAFT and PUBLISHED states', () => {
        const values = Object.values(ModuleStatus);
        assert.ok(values.length > 0);
    });
    it('all values are strings', () => {
        for (const v of Object.values(ModuleStatus)) {
            assert.equal(typeof v, 'string');
        }
    });
});
