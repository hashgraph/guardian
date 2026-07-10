import assert from 'node:assert/strict';
import { SchemaCategory } from '../dist/type/schema-category.type.js';

describe('SchemaCategory enum', () => {
    it('exposes POLICY/MODULE/SYSTEM/TAG/TOOL/STATISTIC/LABEL', () => {
        for (const k of ['POLICY', 'MODULE', 'SYSTEM', 'TAG', 'TOOL', 'STATISTIC', 'LABEL']) {
            assert.equal(SchemaCategory[k], k);
        }
        assert.equal(Object.keys(SchemaCategory).length, 7);
    });
});
