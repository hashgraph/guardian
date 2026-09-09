import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

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

const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

describe('SchemaHelper.parseConditions — if shapes', () => {
    const fields = [field('a'), field('b'), field('c')];
    const run = (nodeIf) => SchemaHelper.parseConditions(
        { allOf: [{ if: nodeIf, then: { properties: { c: { type: 'string' } } } }] },
        'ctx:',
        fields,
        new Map(),
    );

    it('maps a plain properties block with one const to a single predicate', () => {
        const [cond] = run({ properties: { a: { const: 1 } } });
        assert.equal(cond.ifCondition.field.name, 'a');
        assert.equal(cond.ifCondition.fieldValue, 1);
    });

    it('maps a properties block with several consts to AND', () => {
        const [cond] = run({ properties: { a: { const: 1 }, b: { const: 2 } } });
        assert.equal(cond.ifCondition.AND.length, 2);
        assert.deepEqual(cond.ifCondition.AND.map((p) => p.field.name), ['a', 'b']);
    });

    it('yields a null ifCondition when no property carries a const', () => {
        const [cond] = run({ properties: { a: { type: 'string' } } });
        assert.equal(cond.ifCondition, null);
    });

    it('maps anyOf branches to OR', () => {
        const [cond] = run({ anyOf: [{ properties: { a: { const: 1 } } }, { properties: { b: { const: 2 } } }] });
        assert.equal(cond.ifCondition.OR.length, 2);
        assert.equal(cond.ifCondition.OR[1].fieldValue, 2);
    });

    it('flattens a single-predicate anyOf to a plain predicate', () => {
        const [cond] = run({ anyOf: [{ properties: { a: { const: 1 } } }] });
        assert.equal(cond.ifCondition.field.name, 'a');
    });

    it('maps allOf branches to AND', () => {
        const [cond] = run({ allOf: [{ properties: { a: { const: 1 } } }, { properties: { b: { const: 2 } } }] });
        assert.equal(cond.ifCondition.AND.length, 2);
    });

    it('flattens a single-predicate allOf to a plain predicate', () => {
        const [cond] = run({ allOf: [{ properties: { b: { const: 5 } } }] });
        assert.equal(cond.ifCondition.field.name, 'b');
        assert.equal(cond.ifCondition.fieldValue, 5);
    });

    it('yields a null ifCondition for a non-object if node', () => {
        const [cond] = run('not-an-object');
        assert.equal(cond.ifCondition, null);
    });

    it('ignores predicates that reference unknown fields', () => {
        const [cond] = run({ properties: { zz: { const: 1 }, a: { const: 2 } } });
        assert.equal(cond.ifCondition.field.name, 'a');
    });

    it('skips allOf entries without an if node', () => {
        const out = SchemaHelper.parseConditions({ allOf: [{ then: {} }] }, 'ctx:', fields, new Map());
        assert.deepEqual(out, []);
    });

    it('also reads conditions from a top-level anyOf array', () => {
        const out = SchemaHelper.parseConditions(
            { anyOf: [{ if: { properties: { a: { const: 1 } } }, then: { properties: { c: { type: 'string' } } } }] },
            'ctx:',
            fields,
            new Map(),
        );
        assert.equal(out.length, 1);
        assert.equal(out[0].thenFields.length, 1);
        assert.equal(out[0].thenFields[0].name, 'c');
    });

    it('returns [] for a missing document', () => {
        assert.deepEqual(SchemaHelper.parseConditions(null, 'ctx:', fields, new Map()), []);
    });
});

describe('SchemaHelper.buildDocument — condition serialization', () => {
    const build = (conditions) => SchemaHelper.buildDocument(baseSchema(), [field('a'), field('b')], conditions);

    it('serialises a single predicate into if.properties with const', () => {
        const doc = build([{ ifCondition: { field: { name: 'a' }, fieldValue: 'x' }, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf.length, 1);
        assert.deepEqual(doc.allOf[0].if.properties, { a: { const: 'x' } });
        assert.ok(doc.allOf[0].then.properties.t1);
        assert.deepEqual(doc.allOf[0].else, { properties: { t1: false } });
    });

    it('serialises a multi-predicate AND into if.allOf', () => {
        const ifCondition = { AND: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] };
        const doc = build([{ ifCondition, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf[0].if.allOf.length, 2);
        assert.deepEqual(doc.allOf[0].if.allOf[1].properties, { b: { const: 2 } });
    });

    it('flattens a single-element AND to plain properties', () => {
        const ifCondition = { AND: [{ field: { name: 'a' }, fieldValue: 1 }] };
        const doc = build([{ ifCondition, thenFields: [field('t1')], elseFields: [] }]);
        assert.deepEqual(doc.allOf[0].if.properties, { a: { const: 1 } });
    });

    it('serialises a multi-predicate OR into if.anyOf', () => {
        const ifCondition = { OR: [{ field: { name: 'a' }, fieldValue: 1 }, { field: { name: 'b' }, fieldValue: 2 }] };
        const doc = build([{ ifCondition, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf[0].if.anyOf.length, 2);
    });

    it('flattens a single-element OR to plain properties', () => {
        const ifCondition = { OR: [{ field: { name: 'b' }, fieldValue: 7 }] };
        const doc = build([{ ifCondition, thenFields: [field('t1')], elseFields: [] }]);
        assert.deepEqual(doc.allOf[0].if.properties, { b: { const: 7 } });
    });

    it('drops conditions whose AND list is empty', () => {
        const doc = build([{ ifCondition: { AND: [] }, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf, undefined);
    });

    it('drops conditions whose OR list is empty', () => {
        const doc = build([{ ifCondition: { OR: [] }, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf, undefined);
    });

    it('drops conditions without an ifCondition', () => {
        const doc = build([{ ifCondition: null, thenFields: [field('t1')], elseFields: [] }]);
        assert.equal(doc.allOf, undefined);
    });

    it('emits else when only elseFields are present', () => {
        const doc = build([{ ifCondition: { field: { name: 'a' }, fieldValue: 1 }, thenFields: [], elseFields: [field('e1', { required: true })] }]);
        assert.deepEqual(doc.allOf[0].then, { properties: { e1: false } });
        assert.ok(doc.allOf[0].else.properties.e1);
        // Branch `required` is not emitted; the flag rides in `$comment` instead.
        assert.equal('required' in doc.allOf[0].else, false);
        assert.equal(JSON.parse(doc.allOf[0].else.properties.e1.$comment).conditionRequired, true);
    });

    it('omits allOf entirely when no conditions are given', () => {
        const doc = build(undefined);
        assert.equal('allOf' in doc, false);
    });
});

describe('SchemaHelper — branch-level required round-trip', () => {
    const fields = [field('a'), field('b')];

    // A branch must never emit `required`: JSON Schema applies `else` whenever `if` fails,
    // including when the field the `if` reads was never asked, which would demand fields no
    // form can show. The flag is carried in `$comment` and enforced by
    // `SchemaHelper.validateConditionFields`.
    it('required thenField is marked in $comment, not then.required', () => {
        const doc = SchemaHelper.buildDocument(
            baseSchema(), fields,
            [{ ifCondition: { field: field('a'), fieldValue: 'x' }, thenFields: [field('b', { required: true })], elseFields: [] }]
        );
        assert.equal('required' in doc.allOf[0].then, false);
        assert.equal(JSON.parse(doc.allOf[0].then.properties.b.$comment).conditionRequired, true);
    });

    it('required elseField is marked in $comment, not else.required', () => {
        const doc = SchemaHelper.buildDocument(
            baseSchema(), fields,
            [{ ifCondition: { field: field('a'), fieldValue: 'x' }, thenFields: [], elseFields: [field('b', { required: true })] }]
        );
        assert.equal('required' in doc.allOf[0].else, false);
        assert.equal(JSON.parse(doc.allOf[0].else.properties.b.$comment).conditionRequired, true);
    });

    it('then.required survives parse → thenFields[].required', () => {
        const doc = {
            allOf: [{
                if: { properties: { a: { const: 'x' } } },
                then: { properties: { b: { type: 'string' } }, required: ['b'] },
            }],
        };
        const [cond] = SchemaHelper.parseConditions(doc, 'ctx:', fields, new Map());
        assert.equal(cond.thenFields.length, 1);
        assert.equal(cond.thenFields[0].name, 'b');
        assert.equal(cond.thenFields[0].required, true);
    });

    it('else.required survives parse → elseFields[].required', () => {
        const doc = {
            allOf: [{
                if: { properties: { a: { const: 'x' } } },
                else: { properties: { b: { type: 'string' } }, required: ['b'] },
            }],
        };
        const [cond] = SchemaHelper.parseConditions(doc, 'ctx:', fields, new Map());
        assert.equal(cond.elseFields.length, 1);
        assert.equal(cond.elseFields[0].name, 'b');
        assert.equal(cond.elseFields[0].required, true);
    });

    it('required thenField survives full build → parse round-trip', () => {
        const conditions = [{
            ifCondition: { field: field('a'), fieldValue: 'x' },
            thenFields: [field('b', { required: true })],
            elseFields: [],
        }];
        const doc = SchemaHelper.buildDocument(baseSchema(), fields, conditions);
        const [cond] = SchemaHelper.parseConditions(doc, 'ctx:', fields, new Map());
        assert.equal(cond.thenFields[0].required, true);
    });

    // These four assertions used to read `then.required` / `else.required`. That array is no
    // longer emitted, so the guarantee it protected — a required branch field stays required
    // across a save — is asserted end to end here instead: ajv must not demand the field
    // (otherwise a condition that was never asked makes the document unsatisfiable), while
    // `validateConditionFields` must.
    it('moves required enforcement from ajv to validateConditionFields', async () => {
        const { default: Ajv } = await import('ajv');
        const conditions = [{
            ifCondition: { field: field('a'), fieldValue: 'x' },
            thenFields: [field('b', { required: true })],
            elseFields: [],
        }];
        const document = SchemaHelper.buildDocument(baseSchema(), fields, conditions);

        const compiled = JSON.parse(JSON.stringify(document));
        delete compiled.$defs;
        delete compiled.$id;
        compiled.properties = { ...compiled.properties };
        delete compiled.properties['@context'];
        delete compiled.properties.type;
        compiled.required = (compiled.required || []).filter((n) => n !== '@context' && n !== 'type');
        const validate = new Ajv({ strict: false, allErrors: true }).compile(compiled);

        // `if` holds and `b` is missing: ajv stays silent, the code check speaks.
        assert.equal(validate({ a: 'x' }), true);
        const parsed = SchemaHelper.parseConditions(document, 'ctx:', fields, new Map());
        assert.equal(parsed[0].thenFields[0].required, true);
        const errors = SchemaHelper.validateConditionFields(parsed, { a: 'x' });
        assert.equal(errors.length, 1);
        assert.match(errors[0], /"b" is required/);

        // `if` does not hold: the field belongs to no active branch, so nothing demands it.
        assert.equal(validate({ a: 'other' }), true);
        assert.deepEqual(SchemaHelper.validateConditionFields(parsed, { a: 'other' }), []);
    });

    it('optional thenField carries no conditionRequired flag', () => {
        const doc = SchemaHelper.buildDocument(
            baseSchema(), fields,
            [{ ifCondition: { field: field('a'), fieldValue: 'x' }, thenFields: [field('b', { required: false })], elseFields: [] }]
        );
        assert.equal('required' in doc.allOf[0].then, false);
        assert.equal(JSON.parse(doc.allOf[0].then.properties.b.$comment).conditionRequired, undefined);
    });
});

describe('SchemaHelper.parseFields — sub-schema refs', () => {
    const doc = () => ({
        properties: {
            ref1: { $ref: '#sub' },
            ref2: { $ref: '#sub' },
        },
        required: [],
        $defs: {
            '#sub': { properties: { x: { type: 'string' } }, required: ['x'] },
        },
    });

    it('expands referenced sub-schemas into nested fields', () => {
        const fields = SchemaHelper.parseFields(doc(), 'ctx:', new Map(), null);
        assert.equal(fields.length, 2);
        assert.equal(fields[0].isRef, true);
        assert.equal(fields[0].fields.length, 1);
        assert.equal(fields[0].fields[0].name, 'x');
        assert.equal(fields[0].fields[0].required, true);
    });

    it('caches the parsed sub-schema by type', () => {
        const cache = new Map();
        SchemaHelper.parseFields(doc(), 'ctx:', cache, null);
        assert.ok(cache.has('#sub'));
        assert.equal(cache.get('#sub').fields.length, 1);
    });

    it('clones cached sub-fields per referencing field', () => {
        const fields = SchemaHelper.parseFields(doc(), 'ctx:', new Map(), null);
        assert.notEqual(fields[0].fields, fields[1].fields);
        assert.notEqual(fields[0].fields[0], fields[1].fields[0]);
    });

    it('uses the defs argument when the document has no $defs', () => {
        const { $defs, ...noDefs } = doc();
        const fields = SchemaHelper.parseFields(noDefs, 'ctx:', new Map(), $defs);
        assert.equal(fields[0].fields[0].name, 'x');
    });

    it('attaches a context with the ref type to ref fields', () => {
        const fields = SchemaHelper.parseFields(doc(), 'ctx:', new Map(), null);
        assert.equal(fields[0].context.type, 'sub');
        assert.deepEqual(fields[0].context.context, ['ctx:']);
    });
});
