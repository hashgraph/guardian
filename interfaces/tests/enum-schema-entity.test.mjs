import assert from 'node:assert/strict';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';

describe('SchemaEntity enum', () => {
    it('covers core schema entity types', () => {
        const values = Object.values(SchemaEntity);
        for (const expected of ['NONE', 'VC', 'EVC', 'STANDARD_REGISTRY', 'USER', 'POLICY']) {
            assert.ok(values.includes(expected), `missing ${expected}`);
        }
    });
});
