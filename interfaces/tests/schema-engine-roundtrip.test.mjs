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

const baseSchema = (over = {}) => ({
    uuid: 'u-1',
    version: '1.0.0',
    name: 'N',
    description: 'D',
    contextURL: 'ctx:',
    ...over,
});

const buildOne = (f) => SchemaHelper.buildDocument(baseSchema(), [f], []);
const parseBack = (doc) => SchemaHelper.parseFields(doc, 'ctx:', new Map(), null);

describe('SchemaHelper.buildField — type matrix', () => {
    const types = ['string', 'number', 'integer', 'boolean'];
    for (const t of types) {
        it(`emits a scalar ${t} field with the type preserved`, () => {
            const prop = SchemaHelper.buildField(field('f', { type: t }), 'f', 'ctx:');
            assert.equal(prop.type, t);
            assert.equal(prop.readOnly, false);
        });
        it(`emits an array of ${t} with items.type`, () => {
            const prop = SchemaHelper.buildField(field('f', { type: t, isArray: true }), 'f', 'ctx:');
            assert.equal(prop.type, 'array');
            assert.equal(prop.items.type, t);
        });
    }

    it('uses the field name when no title is provided', () => {
        const prop = SchemaHelper.buildField(field('myField', { title: null }), 'myField', 'ctx:');
        assert.equal(prop.title, 'myField');
    });

    it('uses the field name when no description is provided', () => {
        const prop = SchemaHelper.buildField(field('myField', { description: null }), 'myField', 'ctx:');
        assert.equal(prop.description, 'myField');
    });

    it('marks read-only fields', () => {
        const prop = SchemaHelper.buildField(field('f', { readOnly: true }), 'f', 'ctx:');
        assert.equal(prop.readOnly, true);
    });

    it('carries examples through when present', () => {
        const prop = SchemaHelper.buildField(field('f', { examples: ['a', 'b'] }), 'f', 'ctx:');
        assert.deepEqual(prop.examples, ['a', 'b']);
    });

    it('omits examples when absent', () => {
        const prop = SchemaHelper.buildField(field('f'), 'f', 'ctx:');
        assert.equal('examples' in prop, false);
    });

    it('carries a default value through', () => {
        const prop = SchemaHelper.buildField(field('f', { default: 7 }), 'f', 'ctx:');
        assert.equal(prop.default, 7);
    });

    it('omits a falsy default', () => {
        const prop = SchemaHelper.buildField(field('f', { default: 0 }), 'f', 'ctx:');
        assert.equal('default' in prop, false);
    });

    it('writes a $ref for ref fields', () => {
        const prop = SchemaHelper.buildField(field('f', { isRef: true, type: '#child' }), 'f', 'ctx:');
        assert.equal(prop.$ref, '#child');
        assert.equal('type' in prop, false);
    });

    it('writes items.$ref for array ref fields', () => {
        const prop = SchemaHelper.buildField(field('f', { isRef: true, isArray: true, type: '#child' }), 'f', 'ctx:');
        assert.equal(prop.type, 'array');
        assert.equal(prop.items.$ref, '#child');
    });

    it('writes enum / format / pattern for scalar fields', () => {
        const prop = SchemaHelper.buildField(field('f', {
            enum: ['x', 'y'],
            format: 'date',
            pattern: '^a',
        }), 'f', 'ctx:');
        assert.deepEqual(prop.enum, ['x', 'y']);
        assert.equal(prop.format, 'date');
        assert.equal(prop.pattern, '^a');
    });

    it('writes a remoteLink ref alongside scalar type', () => {
        const prop = SchemaHelper.buildField(field('f', { remoteLink: '#remote' }), 'f', 'ctx:');
        assert.equal(prop.$ref, '#remote');
        assert.equal(prop.type, 'string');
    });

    it('always attaches a $comment', () => {
        const prop = SchemaHelper.buildField(field('f'), 'f', 'ctx:');
        assert.ok(typeof prop.$comment === 'string');
        assert.ok(prop.$comment.includes('"term":"f"'));
    });
});

describe('SchemaHelper round-trip — scalar field invariants', () => {
    const cases = [
        ['string', {}],
        ['number', {}],
        ['integer', {}],
        ['boolean', {}],
        ['string', { format: 'date' }],
        ['string', { format: 'date-time' }],
        ['string', { format: 'time' }],
        ['string', { pattern: '^[a-z]+$' }],
        ['string', { unit: 'kg' }],
        ['string', { unit: 'm', unitSystem: 'postfix' }],
        ['string', { customType: 'geo' }],
    ];
    for (const [type, over] of cases) {
        const label = `${type} ${JSON.stringify(over)}`;
        it(`preserves type across build->parse for ${label}`, () => {
            const f = field('amount', { type, ...over, required: true });
            const doc = buildOne(f);
            const [parsed] = parseBack(doc);
            assert.equal(parsed.type, type);
            assert.equal(parsed.name, 'amount');
            assert.equal(parsed.required, true);
        });
    }

    it('preserves unit metadata across round-trip', () => {
        const doc = buildOne(field('w', { unit: 'kg', unitSystem: 'postfix' }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.unit, 'kg');
        assert.equal(parsed.unitSystem, 'postfix');
    });

    it('preserves customType across round-trip', () => {
        const doc = buildOne(field('g', { customType: 'geo' }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.customType, 'geo');
    });

    it('preserves pattern across round-trip', () => {
        const doc = buildOne(field('p', { pattern: '^x' }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.pattern, '^x');
    });

    it('preserves format across round-trip', () => {
        const doc = buildOne(field('d', { format: 'date' }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.format, 'date');
    });

    it('preserves enum across round-trip', () => {
        const doc = buildOne(field('e', { enum: ['a', 'b', 'c'] }));
        const [parsed] = parseBack(doc);
        assert.deepEqual(parsed.enum, ['a', 'b', 'c']);
    });

    it('marks isArray across round-trip', () => {
        const doc = buildOne(field('arr', { isArray: true }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.isArray, true);
    });
});

describe('SchemaHelper round-trip — required projection', () => {
    it('lists required fields in document.required', () => {
        const doc = SchemaHelper.buildDocument(baseSchema(), [
            field('a', { required: true }),
            field('b', { required: false }),
            field('c', { required: true }),
        ], []);
        assert.ok(doc.required.includes('a'));
        assert.ok(doc.required.includes('c'));
        assert.equal(doc.required.includes('b'), false);
    });

    it('always includes the system @context and type as required', () => {
        const doc = SchemaHelper.buildDocument(baseSchema(), [field('a')], []);
        assert.ok(doc.required.includes('@context'));
        assert.ok(doc.required.includes('type'));
    });

    it('parses back a required field as required:true', () => {
        const doc = buildOne(field('x', { required: true }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.required, true);
    });

    it('parses back a non-required field as required:false', () => {
        const doc = buildOne(field('x', { required: false }));
        const [parsed] = parseBack(doc);
        assert.equal(parsed.required, false);
    });
});

describe('SchemaHelper round-trip — system field injection & skipping', () => {
    const doc = () => SchemaHelper.buildDocument(baseSchema(), [field('user')], []);

    it('injects @context, type and id system properties', () => {
        const d = doc();
        assert.ok(d.properties['@context']);
        assert.ok(d.properties['type']);
        assert.ok(d.properties['id']);
    });

    it('marks the id system property read-only', () => {
        assert.equal(doc().properties.id.readOnly, true);
    });

    it('marks @context and type read-only', () => {
        const d = doc();
        assert.equal(d.properties['@context'].readOnly, true);
        assert.equal(d.properties['type'].readOnly, true);
    });

    it('skips read-only system fields when includeSystemProperties is false', () => {
        const fields = SchemaHelper.parseFields(doc(), 'ctx:', new Map(), null, false);
        const names = fields.map((f) => f.name);
        assert.equal(names.includes('id'), false);
        assert.equal(names.includes('@context'), false);
        assert.equal(names.includes('type'), false);
        assert.ok(names.includes('user'));
    });

    it('includes read-only system fields when includeSystemProperties is true', () => {
        const fields = SchemaHelper.parseFields(doc(), 'ctx:', new Map(), null, true);
        const names = fields.map((f) => f.name);
        assert.ok(names.includes('id'));
        assert.ok(names.includes('user'));
    });

    it('sets additionalProperties:false on built documents', () => {
        assert.equal(doc().additionalProperties, false);
    });

    it('builds an $id and $comment header', () => {
        const d = doc();
        assert.equal(d.$id, '#u-1&1.0.0');
        assert.ok(d.$comment.includes('"term": "u-1&1.0.0"'));
    });

    it('uses schema name/description as document title/description', () => {
        const d = SchemaHelper.buildDocument(baseSchema({ name: 'Title!', description: 'Desc!' }), [field('a')], []);
        assert.equal(d.title, 'Title!');
        assert.equal(d.description, 'Desc!');
    });
});

describe('SchemaHelper.getFieldsFromObject — via buildDocument', () => {
    it('throws when a field name contains spaces', () => {
        assert.throws(
            () => SchemaHelper.buildDocument(baseSchema(), [field('bad name')], []),
            /must not contain spaces/,
        );
    });

    it('keeps the first occurrence on duplicate field names', () => {
        const d = SchemaHelper.buildDocument(baseSchema(), [
            field('dup', { title: 'first' }),
            field('dup', { title: 'second' }),
        ], []);
        assert.ok(d.properties.dup.$comment.includes('"term":"dup"'));
    });

    it('does not overwrite the system id property with a user field', () => {
        const d = SchemaHelper.buildDocument(baseSchema(), [field('id', { type: 'number' })], []);
        assert.equal(d.properties.id.readOnly, true);
    });
});

describe('SchemaHelper.parseFields — ordering by orderPosition', () => {
    const docWithOrders = () => ({
        properties: {
            a: { type: 'string', title: 'a', $comment: JSON.stringify({ term: 'a', orderPosition: 3 }) },
            b: { type: 'string', title: 'b', $comment: JSON.stringify({ term: 'b', orderPosition: 1 }) },
            c: { type: 'string', title: 'c', $comment: JSON.stringify({ term: 'c', orderPosition: 2 }) },
            z: { type: 'string', title: 'z' },
        },
        required: [],
    });

    it('places unordered fields before ordered ones', () => {
        const fields = parseBack(docWithOrders());
        assert.equal(fields[0].name, 'z');
    });

    it('sorts ordered fields by orderPosition ascending', () => {
        const fields = parseBack(docWithOrders());
        const ordered = fields.filter((f) => f.order >= 1).map((f) => f.name);
        assert.deepEqual(ordered, ['b', 'c', 'a']);
    });

    it('assigns order -1 to fields without an orderPosition', () => {
        const fields = parseBack(docWithOrders());
        const z = fields.find((f) => f.name === 'z');
        assert.equal(z.order, -1);
    });

    it('returns [] for a document without properties', () => {
        assert.deepEqual(SchemaHelper.parseFields({}, 'ctx:', new Map(), null), []);
    });

    it('returns [] for a null document', () => {
        assert.deepEqual(SchemaHelper.parseFields(null, 'ctx:', new Map(), null), []);
    });
});

describe('SchemaHelper.parseFields — nested $ref chains', () => {
    const docChain = () => ({
        properties: { root: { $ref: '#L1' } },
        required: ['root'],
        $defs: {
            '#L1': { properties: { mid: { $ref: '#L2' } }, required: [] },
            '#L2': { properties: { leaf: { type: 'string' } }, required: ['leaf'] },
        },
    });

    it('resolves a two-level ref chain', () => {
        const fields = parseBack(docChain());
        assert.equal(fields[0].name, 'root');
        assert.equal(fields[0].isRef, true);
        assert.equal(fields[0].fields[0].name, 'mid');
        assert.equal(fields[0].fields[0].fields[0].name, 'leaf');
    });

    it('marks the deepest required field', () => {
        const fields = parseBack(docChain());
        assert.equal(fields[0].fields[0].fields[0].required, true);
    });

    it('caches each ref level by type', () => {
        const cache = new Map();
        SchemaHelper.parseFields(docChain(), 'ctx:', cache, null);
        assert.ok(cache.has('#L1'));
        assert.ok(cache.has('#L2'));
    });

    it('reuses cached parse for repeated refs in the same document', () => {
        const doc = {
            properties: { a: { $ref: '#S' }, b: { $ref: '#S' } },
            required: [],
            $defs: { '#S': { properties: { v: { type: 'string' } }, required: [] } },
        };
        const cache = new Map();
        const fields = SchemaHelper.parseFields(doc, 'ctx:', cache, null);
        assert.equal(fields[0].fields[0].name, 'v');
        assert.equal(fields[1].fields[0].name, 'v');
        assert.equal(cache.size, 1);
    });

    it('detaches cloned sub-fields between sibling refs', () => {
        const doc = {
            properties: { a: { $ref: '#S' }, b: { $ref: '#S' } },
            required: [],
            $defs: { '#S': { properties: { v: { type: 'string' } }, required: [] } },
        };
        const fields = SchemaHelper.parseFields(doc, 'ctx:', new Map(), null);
        fields[0].fields[0].name = 'mutated';
        assert.equal(fields[1].fields[0].name, 'v');
    });
});

describe('SchemaHelper.findRefs / uniqueRefs — via class shapes', () => {
    const fakeSchema = (iri, doc, fields) => ({ iri, document: doc, fields });

    it('returns built-in GeoJSON ref when a field references #GeoJSON', () => {
        const target = fakeSchema('#T', {}, [{ isRef: true, type: '#GeoJSON' }]);
        const refs = SchemaHelper.findRefs(target, []);
        assert.ok(refs['#GeoJSON']);
    });

    it('returns built-in SentinelHUB ref when referenced', () => {
        const target = fakeSchema('#T', {}, [{ isRef: true, type: '#SentinelHUB' }]);
        const refs = SchemaHelper.findRefs(target, []);
        assert.ok(refs['#SentinelHUB']);
    });

    it('resolves a ref to another schema in the list', () => {
        const child = fakeSchema('#child', { properties: { x: { type: 'string' } } }, []);
        const target = fakeSchema('#T', {}, [{ isRef: true, type: '#child' }]);
        const refs = SchemaHelper.findRefs(target, [child]);
        assert.ok(refs['#child']);
        assert.deepEqual(refs['#child'].properties, { x: { type: 'string' } });
    });

    it('ignores non-ref fields', () => {
        const target = fakeSchema('#T', {}, [{ isRef: false, type: 'string' }]);
        const refs = SchemaHelper.findRefs(target, []);
        assert.deepEqual(refs, {});
    });

    it('ignores ref fields whose type is unknown', () => {
        const target = fakeSchema('#T', {}, [{ isRef: true, type: '#missing' }]);
        const refs = SchemaHelper.findRefs(target, []);
        assert.deepEqual(refs, {});
    });

    it('flattens nested $defs and strips the $defs key', () => {
        const child = fakeSchema('#child', {
            properties: { x: { type: 'string' } },
            $defs: { '#grand': { properties: { y: { type: 'string' } } } },
        }, []);
        const target = fakeSchema('#T', {}, [{ isRef: true, type: '#child' }]);
        const refs = SchemaHelper.findRefs(target, [child]);
        assert.ok(refs['#child']);
        assert.ok(refs['#grand']);
        assert.equal('$defs' in refs['#child'], false);
    });
});
