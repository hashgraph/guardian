import assert from 'node:assert/strict';
import { AssignedEntityType } from '../dist/type/assigned-entity.type.js';

describe('AssignedEntityType enum', () => {
    it('covers Schema / Policy / Token / Module', () => {
        const values = Object.values(AssignedEntityType);
        for (const expected of ['Schema', 'Policy', 'Token', 'Module']) {
            assert.ok(values.includes(expected), `missing ${expected}`);
        }
    });
    it('has exactly five entries', () => {
        assert.equal(Object.keys(AssignedEntityType).length, 5);
    });
});
