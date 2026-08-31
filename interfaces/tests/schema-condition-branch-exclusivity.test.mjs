import { assert } from 'chai';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const field = (name, required = false) => ({ name, required });

/*
 * Branch exclusivity used to be compiled into the schema as `properties: { name: false }` on the
 * opposite branch. That construct corrupts schemas on Guardian before 3.7.0, whose parseFields
 * has no guard for a `false` entry, so the rule is enforced by validateConditionFields instead.
 */
const condition = (thenFields, elseFields) => ([{
    ifCondition: { field: field('kind'), fieldValue: 'full' },
    thenFields,
    elseFields,
}]);

describe('@unit SchemaHelper.validateConditionFields branch exclusivity', () => {
    it('rejects an else-branch field while the then branch is active', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition([field('t1')], [field('e1')]), { kind: 'full', e1: 'x' }
        );
        assert.lengthOf(errors, 1);
        assert.include(errors[0], 'e1');
        assert.include(errors[0], 'not allowed');
    });

    it('rejects a then-branch field while the else branch is active', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition([field('t1')], [field('e1')]), { kind: 'other', t1: 'x' }
        );
        assert.lengthOf(errors, 1);
        assert.include(errors[0], 't1');
        assert.include(errors[0], 'not allowed');
    });

    it('accepts the active branch field', () => {
        assert.deepEqual(
            SchemaHelper.validateConditionFields(
                condition([field('t1')], [field('e1')]), { kind: 'full', t1: 'x' }
            ),
            []
        );
    });

    it('accepts a document carrying neither branch field', () => {
        assert.deepEqual(
            SchemaHelper.validateConditionFields(
                condition([field('t1')], [field('e1')]), { kind: 'full' }
            ),
            []
        );
    });

    // Mirrors the exclusion buildForbid used to apply: a field on both branches is shared.
    it('allows a field listed on both branches', () => {
        assert.deepEqual(
            SchemaHelper.validateConditionFields(
                condition([field('shared')], [field('shared')]), { kind: 'other', shared: 'x' }
            ),
            []
        );
    });

    it('still reports a missing required field on the active branch', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition([field('t1', true)], [field('e1')]), { kind: 'full' }
        );
        assert.lengthOf(errors, 1);
        assert.include(errors[0], 'required');
    });

    it('reports both a missing required field and a smuggled inactive field', () => {
        const errors = SchemaHelper.validateConditionFields(
            condition([field('t1', true)], [field('e1')]), { kind: 'full', e1: 'x' }
        );
        assert.lengthOf(errors, 2);
    });

    it('treats an empty string as absent on both sides', () => {
        assert.deepEqual(
            SchemaHelper.validateConditionFields(
                condition([field('t1')], [field('e1')]), { kind: 'full', e1: '' }
            ),
            []
        );
    });
});
