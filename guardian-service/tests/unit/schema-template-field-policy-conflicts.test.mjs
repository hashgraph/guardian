import assert from 'node:assert/strict';
import { buildFieldPolicyConflicts } from '../../dist/api/schema-template.service.js';

const RESET = 'RESET_TO_TEMPLATE';
const KEEP = 'KEEP_CUSTOM_CHANGES';
const MODIFIED = 'FIELD_MODIFIED_IN_POLICY';
const REMOVED = 'FIELD_REMOVED_IN_POLICY';

const FIELD_ID = 'tf-1';

const field = (name, extra = {}) => ({
    templateFieldId: FIELD_ID,
    name,
    description: 'Amount',
    type: 'string',
    required: false,
    ...extra
});

const documentWith = (...names) => ({
    type: 'object',
    properties: Object.fromEntries(names.map((name) => [name, { type: 'string' }]))
});

const condition = () => ({
    ifCondition: { field: { templateFieldId: FIELD_ID, name: 'amount' }, fieldValue: 'x' }
});

const run = ({ previous, policy, next, templateName, policyName, conditions = [], arrayDependencies = [] }) =>
    buildFieldPolicyConflicts({
        templateSchemaId: 's-1',
        previousSchema: { name: 'Schema', fields: previous ? [previous] : [], conditions: [], arrayDependencies: [] },
        nextSchema: { name: 'Schema', fields: [next], conditions, arrayDependencies },
        policySnapshot: { name: 'Schema', fields: policy ? [policy] : [], conditions: [], arrayDependencies: [] },
        // A field with no config entry is locked by default, and locked fields never conflict.
        nextSchemaConfig: { fields: { [FIELD_ID]: { locked: false } } },
        policyDocument: policyName ? documentWith(policyName) : documentWith(),
        templateDocument: documentWith(templateName)
    });

describe('buildFieldPolicyConflicts: renamed key referenced by the template', () => {
    const renamedAndEdited = () => ({
        previous: field('amount'),
        policy: field('quantity', { required: true }),
        next: field('amount'),
        templateName: 'amount',
        policyName: 'quantity'
    });

    it('offers only reset when a condition triggers off the renamed field', () => {
        const conflicts = run({ ...renamedAndEdited(), conditions: [condition()] });
        assert.equal(conflicts.length, 1);
        assert.equal(conflicts[0].type, MODIFIED);
        assert.deepEqual(conflicts[0].allowedActions, [RESET]);
        assert.match(conflicts[0].message, /must be reset/);
    });

    it('offers only reset when a repeatable link names the renamed field', () => {
        const conflicts = run({
            ...renamedAndEdited(),
            arrayDependencies: [{ field: ['amount'], on: ['other'] }]
        });
        assert.equal(conflicts.length, 1);
        assert.deepEqual(conflicts[0].allowedActions, [RESET]);
        assert.match(conflicts[0].message, /must be reset/);
    });

    it('offers only reset when the field is an AND predicate of a condition', () => {
        const conflicts = run({
            ...renamedAndEdited(),
            conditions: [{
                ifCondition: {
                    AND: [
                        { field: { templateFieldId: 'other-id' }, fieldValue: 'y' },
                        { field: { templateFieldId: FIELD_ID }, fieldValue: 'x' }
                    ]
                }
            }]
        });
        assert.deepEqual(conflicts[0].allowedActions, [RESET]);
    });

    it('offers keep and reset when the renamed field is not referenced', () => {
        const conflicts = run(renamedAndEdited());
        assert.equal(conflicts.length, 1);
        assert.deepEqual(conflicts[0].allowedActions, [KEEP, RESET]);
        assert.doesNotMatch(conflicts[0].message, /must be reset/);
    });

    it('offers keep and reset when the key is unchanged, even if the field is referenced', () => {
        const conflicts = run({
            previous: field('amount'),
            policy: field('amount', { required: true }),
            next: field('amount'),
            templateName: 'amount',
            policyName: 'amount',
            conditions: [condition()]
        });
        assert.equal(conflicts.length, 1);
        assert.deepEqual(conflicts[0].allowedActions, [KEEP, RESET]);
        assert.doesNotMatch(conflicts[0].message, /must be reset/);
    });

    it('ignores references to other fields', () => {
        const conflicts = run({
            ...renamedAndEdited(),
            conditions: [{ ifCondition: { field: { templateFieldId: 'other-id' }, fieldValue: 'x' } }]
        });
        assert.deepEqual(conflicts[0].allowedActions, [KEEP, RESET]);
    });
});

describe('buildFieldPolicyConflicts: deleted field (regression guard)', () => {
    const deleted = (extra = {}) => run({
        previous: field('amount'),
        policy: undefined,
        next: field('amount'),
        templateName: 'amount',
        policyName: undefined,
        ...extra
    });

    it('offers only reset when the template depends on the deleted field', () => {
        const conflicts = deleted({ conditions: [condition()] });
        assert.equal(conflicts.length, 1);
        assert.equal(conflicts[0].type, REMOVED);
        assert.deepEqual(conflicts[0].allowedActions, [RESET]);
    });

    it('offers keep and reset when nothing depends on it', () => {
        const conflicts = deleted();
        assert.equal(conflicts.length, 1);
        assert.deepEqual(conflicts[0].allowedActions, [KEEP, RESET]);
    });
});
