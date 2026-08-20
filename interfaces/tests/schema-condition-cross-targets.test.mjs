import { assert } from 'chai';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const field = (name, required = false) => ({ name, required });

/*
 * A cross-schema condition: the trigger is a field of this schema, the target lives at
 * a path inside another sub-schema. buildDocument compiles targets into nested
 * properties/required and `false`, but validateConditionFields never read them.
 */
const condition = (fieldValue, targetRequired = true) => ([{
    ifCondition: { field: field('kind'), fieldValue, fieldPath: ['kind'] },
    thenFields: [],
    elseFields: [],
    thenTargets: [{ field: field('detail', targetRequired), fieldPath: ['sub', 'detail'] }],
    elseTargets: [],
}]);

describe('@unit SchemaHelper.validateConditionFields cross-schema targets', () => {
    it('requires the target when the condition matches', () => {
        const errors = SchemaHelper.validateConditionFields(condition('full'), { kind: 'full', sub: {} });
        assert.lengthOf(errors, 1);
        assert.include(errors[0], 'detail');
        assert.include(errors[0], 'required');
    });

    it('accepts the target when the condition matches and it is present', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition('full'), { kind: 'full', sub: { detail: 'x' } }
        );
        assert.deepEqual(errors, []);
    });

    // the branch is inactive, so the target must not be carried at all
    it('rejects a target smuggled in while the condition does not match', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition('full'), { kind: 'partial', sub: { detail: 'smuggled' } }
        );
        assert.lengthOf(errors, 1);
        assert.include(errors[0], 'not allowed');
    });

    it('accepts an absent target while the condition does not match', () => {
        const errors = SchemaHelper.validateConditionFields(condition('full'), { kind: 'partial', sub: {} });
        assert.deepEqual(errors, []);
    });

    it('leaves an optional target unenforced', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition('full', false), { kind: 'full', sub: {} }
        );
        assert.deepEqual(errors, []);
    });

    it('ignores a target with no usable path', () => {
        const conditions = [{
            ifCondition: { field: field('kind'), fieldValue: 'full', fieldPath: ['kind'] },
            thenFields: [],
            elseFields: [],
            thenTargets: [{ field: field('detail', true) }],
            elseTargets: [],
        }];
        assert.deepEqual(SchemaHelper.validateConditionFields(conditions, { kind: 'full' }), []);
    });
});
