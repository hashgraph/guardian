import assert from 'node:assert/strict';
import * as SchemaHelperModule from '../dist/helpers/schema-helper.js';

const { SchemaHelper } = SchemaHelperModule;

const field = (name, over = {}) => ({
    name,
    title: name,
    description: name,
    type: 'string',
    required: false,
    isArray: false,
    isRef: false,
    readOnly: false,
    ...over,
});

describe('SchemaHelper.getConditionTriggerSignature', () => {
    it('reads a single-predicate trigger signature', () => {
        const cond = { ifCondition: { field: field('a', { templateFieldId: 't-a' }), fieldValue: 'x' } };
        assert.deepEqual(SchemaHelper.getConditionTriggerSignature(cond), ['SINGLE', 't-a:"x"']);
    });

    it('returns null when the trigger field has no templateFieldId', () => {
        const cond = { ifCondition: { field: field('a'), fieldValue: 'x' } };
        assert.equal(SchemaHelper.getConditionTriggerSignature(cond), null);
    });

    it('returns null for an AND condition if any predicate is missing an id', () => {
        const cond = {
            ifCondition: {
                AND: [
                    { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
                    { field: field('b'), fieldValue: 2 },
                ],
            },
        };
        assert.equal(SchemaHelper.getConditionTriggerSignature(cond), null);
    });

    it('sorts multi-predicate signature parts so order does not affect matching', () => {
        const cond = {
            ifCondition: {
                AND: [
                    { field: field('b', { templateFieldId: 't-b' }), fieldValue: 2 },
                    { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
                ],
            },
        };
        assert.deepEqual(SchemaHelper.getConditionTriggerSignature(cond), ['AND', 't-a:1', 't-b:2']);
    });

    it('distinguishes two conditions sharing the same trigger field but different values', () => {
        const conditionA = { ifCondition: { field: field('status', { templateFieldId: 't-status' }), fieldValue: 'A' } };
        const conditionB = { ifCondition: { field: field('status', { templateFieldId: 't-status' }), fieldValue: 'B' } };
        assert.notDeepEqual(
            SchemaHelper.getConditionTriggerSignature(conditionA),
            SchemaHelper.getConditionTriggerSignature(conditionB)
        );
    });

    it('distinguishes AND from OR over the same predicates', () => {
        const predicates = [
            { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
            { field: field('b', { templateFieldId: 't-b' }), fieldValue: 2 },
        ];
        const andCond = { ifCondition: { AND: predicates } };
        const orCond = { ifCondition: { OR: predicates } };
        assert.notDeepEqual(
            SchemaHelper.getConditionTriggerSignature(andCond),
            SchemaHelper.getConditionTriggerSignature(orCond)
        );
    });
});

describe('SchemaHelper.getConditionTriggerPredicates', () => {
    it('returns AND predicates', () => {
        const predicates = [{ field: field('a'), fieldValue: 1 }, { field: field('b'), fieldValue: 2 }];
        assert.deepEqual(SchemaHelper.getConditionTriggerPredicates({ AND: predicates }), predicates);
    });

    it('returns OR predicates', () => {
        const predicates = [{ field: field('a'), fieldValue: 1 }];
        assert.deepEqual(SchemaHelper.getConditionTriggerPredicates({ OR: predicates }), predicates);
    });

    it('wraps a single predicate in an array', () => {
        const single = { field: field('a'), fieldValue: 1 };
        assert.deepEqual(SchemaHelper.getConditionTriggerPredicates(single), [single]);
    });

    it('returns an empty array for a falsy ifCondition', () => {
        assert.deepEqual(SchemaHelper.getConditionTriggerPredicates(null), []);
    });
});
