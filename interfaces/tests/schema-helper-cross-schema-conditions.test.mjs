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

describe('SchemaHelper.parseConditions — refFieldsOf fallback', () => {
    it('resolves a nested IF predicate via schemaCache when the ref field\'s own fields are not inlined', () => {
        // Regression guard: before refFieldsOf existed, a bare `(refField as any).fields?.length`
        // check meant that any ref field whose sub-schema fields weren't already attached to the
        // SchemaField object caused the whole nested predicate to be silently dropped, even when
        // those fields were available via schemaCache from parsing elsewhere in the same pass.
        const leaf = field('leaf', { type: 'string' });
        const subRef = field('sub', { isRef: true, type: '#SubIri', fields: undefined });
        const rootFields = [subRef];

        const schemaCache = new Map();
        schemaCache.set('#SubIri', { fields: [leaf], conditions: [] });

        const document = {
            allOf: [{
                if: {
                    properties: { sub: { properties: { leaf: { const: 'go' } }, required: ['leaf'] } },
                    required: ['sub'],
                },
                then: { properties: { c: { type: 'string' } } },
            }],
        };

        const [cond] = SchemaHelper.parseConditions(document, 'ctx:', rootFields, schemaCache);

        assert.notEqual(cond.ifCondition, null, 'ifCondition must resolve, not silently drop the nested predicate');
        assert.equal(cond.ifCondition.field.name, 'leaf');
        assert.equal(cond.ifCondition.fieldValue, 'go');
        assert.deepEqual(cond.ifCondition.fieldPath, ['sub', 'leaf']);
    });

    it('resolves a nested cross-schema target the same way', () => {
        const leaf = field('leaf', { type: 'string' });
        const subRef = field('sub', { isRef: true, type: '#SubIri', fields: undefined });
        const rootFields = [field('trigger'), subRef];

        const schemaCache = new Map();
        schemaCache.set('#SubIri', { fields: [leaf], conditions: [] });

        const document = {
            allOf: [{
                if: { properties: { trigger: { const: 'go' } }, required: ['trigger'] },
                then: {},
                else: { properties: { sub: { properties: { leaf: false } } } },
            }],
        };

        const [cond] = SchemaHelper.parseConditions(document, 'ctx:', rootFields, schemaCache);

        // A field forbidden (properties.X: false) inside the raw JSON's `else` branch means it's
        // allowed when the IF is true — so it surfaces as a `thenTargets` entry, not `elseTargets`.
        assert.ok(cond.thenTargets?.length, 'the cross-schema target must be resolved, not dropped');
        assert.equal(cond.thenTargets[0].field.name, 'leaf');
        assert.deepEqual(cond.thenTargets[0].fieldPath, ['sub', 'leaf']);
    });

    it('still returns no predicate when the ref field is genuinely unresolvable (not in fields, cache, or $defs)', () => {
        const subRef = field('sub', { isRef: true, type: '#Missing', fields: undefined });
        const rootFields = [subRef];

        const document = {
            allOf: [{
                if: {
                    properties: { sub: { properties: { leaf: { const: 'go' } }, required: ['leaf'] } },
                    required: ['sub'],
                },
                then: {},
            }],
        };

        const [cond] = SchemaHelper.parseConditions(document, 'ctx:', rootFields, new Map());
        assert.equal(cond.ifCondition, null, 'a genuinely missing sub-schema cannot be invented');
    });
});

describe('SchemaHelper.buildDocument — buildCrossRequired optional-target guard', () => {
    // This guard has been independently flagged as a "bug" twice by different reviews — it is
    // intentional. An optional cross-schema target must not be force-required in the branch
    // where it's allowed, but it must still be hidden via buildCrossForbidden in the other branch.
    it('requires only the required target, but forbids both targets in the opposite branch', () => {
        const conditions = [{
            ifCondition: { field: field('trigger'), fieldValue: 'x' },
            thenFields: [],
            elseFields: [],
            thenTargets: [
                { field: field('leaf1', { required: true }), fieldPath: ['sub', 'leaf1'] },
                { field: field('leaf2', { required: false }), fieldPath: ['sub', 'leaf2'] },
            ],
            elseTargets: [],
        }];
        const doc = SchemaHelper.buildDocument(baseSchema(), [field('trigger')], conditions);

        assert.deepEqual(doc.allOf[0].then.properties.sub.required, ['leaf1'],
            'only the required target is added to then.required');
        assert.equal(doc.allOf[0].else.properties.sub.properties.leaf1, false,
            'the required target must still be forbidden in else');
        assert.equal(doc.allOf[0].else.properties.sub.properties.leaf2, false,
            'the optional target must also be forbidden in else, even though it was never required');
    });
});
