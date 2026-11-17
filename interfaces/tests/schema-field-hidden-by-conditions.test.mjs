import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const field = (name, over = {}) => ({
    name, title: name, description: name, type: 'string', required: false,
    isArray: false, isRef: false, readOnly: false, fields: null, conditions: null, ...over,
});

// has == true reveals projectLocations
const conditions = [{
    ifCondition: { field: field('has'), fieldValue: 'true', comparator: undefined },
    thenFields: [field('projectLocations')],
    elseFields: [],
}];

describe('SchemaHelper.isFieldHiddenByConditions', () => {
    it('hidden when the condition is false', () => {
        assert.equal(SchemaHelper.isFieldHiddenByConditions(conditions, { has: 'false' }, 'projectLocations'), true);
    });
    it('not hidden when the condition is true', () => {
        assert.equal(SchemaHelper.isFieldHiddenByConditions(conditions, { has: 'true' }, 'projectLocations'), false);
    });
    it('not hidden for a field no condition reveals', () => {
        assert.equal(SchemaHelper.isFieldHiddenByConditions(conditions, { has: 'false' }, 'other'), false);
    });
    it('not hidden without conditions or data', () => {
        assert.equal(SchemaHelper.isFieldHiddenByConditions([], { has: 'false' }, 'projectLocations'), false);
        assert.equal(SchemaHelper.isFieldHiddenByConditions(conditions, null, 'projectLocations'), false);
    });
    it('fails closed for cross-schema predicates', () => {
        const cross = [{
            ifCondition: { field: field('x'), fieldPath: ['sub', 'x'], fieldValue: '1' },
            thenFields: [field('projectLocations')],
            elseFields: [],
        }];
        assert.equal(SchemaHelper.isFieldHiddenByConditions(cross, { sub: { x: '2' } }, 'projectLocations'), false);
    });
    it('else branch field is hidden while the condition is true', () => {
        const c = [{
            ifCondition: { field: field('has'), fieldValue: 'true' },
            thenFields: [],
            elseFields: [field('reason')],
        }];
        assert.equal(SchemaHelper.isFieldHiddenByConditions(c, { has: 'true' }, 'reason'), true);
        assert.equal(SchemaHelper.isFieldHiddenByConditions(c, { has: 'false' }, 'reason'), false);
    });
});
