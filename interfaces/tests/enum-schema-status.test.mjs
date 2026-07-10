import assert from 'node:assert/strict';
import { SchemaStatus } from '../dist/type/schema-status.type.js';

describe('SchemaStatus enum', () => {
    it('exposes the six schema lifecycle states', () => {
        for (const k of ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ERROR', 'DEMO', 'VIEW']) {
            assert.equal(SchemaStatus[k], k);
        }
    });
});
