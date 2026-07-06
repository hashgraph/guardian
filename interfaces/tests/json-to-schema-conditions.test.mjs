import assert from 'node:assert/strict';
import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';

const ctx = () => new ErrorContext().setPath(['schema', 'conditions']);
const fields = () => [{ name: 'a' }, { name: 'b' }];
const fieldJson = (key) => ({ key, type: 'String', required: 'None', availableOptions: [] });

describe('JsonToSchema.resolveFieldByName', () => {
    it('returns the matching field object', () => {
        const list = fields();
        assert.equal(JsonToSchema.resolveFieldByName('b', list, ctx()), list[1]);
    });

    it('throws for an unknown field name', () => {
        assert.throws(() => JsonToSchema.resolveFieldByName('zz', fields(), ctx()), /reference to an existing field/);
    });
});

describe('JsonToSchema.fromCondIf', () => {
    it('resolves a plain field predicate', () => {
        const list = fields();
        const result = JsonToSchema.fromCondIf({ if: { field: 'a', fieldValue: 'x' } }, list, ctx());
        assert.equal(result.field, list[0]);
        assert.equal(result.fieldValue, 'x');
    });

    it('throws when the plain field name does not exist', () => {
        assert.throws(() => JsonToSchema.fromCondIf({ if: { field: 'zz', fieldValue: 1 } }, fields(), ctx()));
    });

    it('throws for an empty AND array', () => {
        assert.throws(() => JsonToSchema.fromCondIf({ if: { AND: [] } }, fields(), ctx()), /type array/);
    });

    it('flattens a single-element AND to a plain predicate', () => {
        const list = fields();
        const result = JsonToSchema.fromCondIf({ if: { AND: [{ field: 'a', fieldValue: 1 }] } }, list, ctx());
        assert.equal(result.field, list[0]);
        assert.equal(result.fieldValue, 1);
        assert.equal('AND' in result, false);
    });

    it('resolves every AND clause to its field object', () => {
        const list = fields();
        const result = JsonToSchema.fromCondIf(
            { if: { AND: [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }] } },
            list,
            ctx(),
        );
        assert.equal(result.AND.length, 2);
        assert.equal(result.AND[0].field, list[0]);
        assert.equal(result.AND[1].field, list[1]);
        assert.equal(result.AND[1].fieldValue, 2);
    });

    it('throws when an AND clause references an unknown field', () => {
        assert.throws(() => JsonToSchema.fromCondIf(
            { if: { AND: [{ field: 'a', fieldValue: 1 }, { field: 'zz', fieldValue: 2 }] } },
            fields(),
            ctx(),
        ));
    });

    it('throws for an empty OR array', () => {
        assert.throws(() => JsonToSchema.fromCondIf({ if: { OR: [] } }, fields(), ctx()), /type array/);
    });

    it('flattens a single-element OR to a plain predicate', () => {
        const list = fields();
        const result = JsonToSchema.fromCondIf({ if: { OR: [{ field: 'b', fieldValue: 3 }] } }, list, ctx());
        assert.equal(result.field, list[1]);
        assert.equal(result.fieldValue, 3);
    });

    it('resolves every OR clause to its field object', () => {
        const list = fields();
        const result = JsonToSchema.fromCondIf(
            { if: { OR: [{ field: 'a', fieldValue: 1 }, { field: 'b', fieldValue: 2 }] } },
            list,
            ctx(),
        );
        assert.equal(result.OR.length, 2);
        assert.equal(result.OR[0].field, list[0]);
    });

    it('throws when the if node is missing entirely', () => {
        assert.throws(() => JsonToSchema.fromCondIf({}, fields(), ctx()));
    });
});

describe('JsonToSchema.fromCondFields', () => {
    it('parses then and else field arrays', () => {
        const result = JsonToSchema.fromCondFields(
            { then: [fieldJson('t1')], else: [fieldJson('e1')] },
            [], 'NONE', new Set(), ctx(),
        );
        assert.equal(result.then.length, 1);
        assert.equal(result.then[0].name, 't1');
        assert.equal(result.else[0].name, 'e1');
    });

    it('defaults a missing else to an empty list', () => {
        const result = JsonToSchema.fromCondFields({ then: [fieldJson('t1')] }, [], 'NONE', new Set(), ctx());
        assert.deepEqual(result.else, []);
    });

    it('defaults a missing then to an empty list', () => {
        const result = JsonToSchema.fromCondFields({ else: [fieldJson('e1')] }, [], 'NONE', new Set(), ctx());
        assert.deepEqual(result.then, []);
    });

    it('throws when then is not an array', () => {
        assert.throws(() => JsonToSchema.fromCondFields({ then: 'x' }, [], 'NONE', new Set(), ctx()), /type array/);
    });

    it('throws when else is not an array', () => {
        assert.throws(() => JsonToSchema.fromCondFields({ then: [fieldJson('t1')], else: 'x' }, [], 'NONE', new Set(), ctx()), /type array/);
    });

    it('throws when both branches end up empty', () => {
        assert.throws(() => JsonToSchema.fromCondFields({}, [], 'NONE', new Set(), ctx()), /at least one value/);
    });
});

describe('JsonToSchema.fromCondition / fromConditions', () => {
    it('combines the if predicate with parsed branch fields', () => {
        const list = fields();
        const condition = JsonToSchema.fromCondition(
            { if: { field: 'a', fieldValue: 'x' }, then: [fieldJson('t1')] },
            0, list, [], 'NONE', ctx(),
        );
        assert.equal(condition.ifCondition.field, list[0]);
        assert.equal(condition.thenFields[0].name, 't1');
        assert.deepEqual(condition.elseFields, []);
    });

    it('fromConditions returns [] for a missing value', () => {
        assert.deepEqual(JsonToSchema.fromConditions(undefined, fields(), [], 'NONE', ctx()), []);
    });

    it('fromConditions throws for a non-array value', () => {
        assert.throws(() => JsonToSchema.fromConditions({}, fields(), [], 'NONE', ctx()), /type array/);
    });

    it('fromConditions maps each entry through fromCondition', () => {
        const list = fields();
        const conditions = JsonToSchema.fromConditions(
            [
                { if: { field: 'a', fieldValue: 1 }, then: [fieldJson('t1')] },
                { if: { field: 'b', fieldValue: 2 }, else: [fieldJson('e1')] },
            ],
            list, [], 'NONE', ctx(),
        );
        assert.equal(conditions.length, 2);
        assert.equal(conditions[0].ifCondition.field, list[0]);
        assert.equal(conditions[1].elseFields[0].name, 'e1');
    });

    it('fromJson wires conditions through to the schema object', () => {
        const json = {
            name: 'S',
            entity: 'NONE',
            fields: [fieldJson('a')],
            conditions: [{ if: { field: 'a', fieldValue: 'yes' }, then: [fieldJson('extra')] }],
        };
        const result = JsonToSchema.fromJson(json, []);
        assert.equal(result.conditions.length, 1);
        assert.equal(result.conditions[0].ifCondition.field.name, 'a');
        assert.equal(result.conditions[0].thenFields[0].name, 'extra');
    });
});

describe('JsonToSchema.fromFields uniqueness', () => {
    it('throws when two fields share the same key', () => {
        assert.throws(
            () => JsonToSchema.fromFields([fieldJson('dup'), fieldJson('dup')], [], 'NONE', new Set(), ctx()),
            /must be unique/,
        );
    });

    it('tracks already-used names through the shared set', () => {
        const used = new Set(['taken']);
        assert.throws(() => JsonToSchema.fromFields([fieldJson('taken')], [], 'NONE', used, ctx()));
    });
});
