import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const doc = (over = {}) => ({
    $id: '#u-1&1.0.0',
    $comment: '{ "@id": "ctx:#u-1&1.0.0", "term": "u-1&1.0.0" }',
    title: 'My Schema',
    description: 'A description',
    type: 'object',
    properties: {
        amount: {
            type: 'number',
            title: 'Amount',
            description: 'Amount',
            $comment: JSON.stringify({ term: 'amount' }),
        },
        tags: {
            type: 'array',
            title: 'Tags',
            items: { type: 'string' },
            $comment: JSON.stringify({ term: 'tags' }),
        },
    },
    required: ['amount'],
    ...over,
});

const schema = (over = {}) => new Schema({
    uuid: 'u-1',
    version: '1.0.0',
    contextURL: 'ctx:',
    iri: '#u-1&1.0.0',
    document: doc(),
    ...over,
});

describe('Schema model — constructor document parsing', () => {
    it('parses fields from the document', () => {
        const s = schema();
        const names = s.fields.map((f) => f.name).sort();
        assert.deepEqual(names, ['amount', 'tags']);
    });

    it('derives the type from uuid and version', () => {
        assert.equal(schema().type, 'u-1&1.0.0');
    });

    it('reads previousVersion from the $comment', () => {
        const s = schema({ document: doc({ $comment: '{ "term": "x", "previousVersion": "0.9.0" }' }) });
        assert.equal(s.previousVersion, '0.9.0');
    });

    it('leaves previousVersion undefined when not present', () => {
        assert.equal(schema().previousVersion, undefined);
    });

    it('marks a required scalar field as required', () => {
        const amount = schema().fields.find((f) => f.name === 'amount');
        assert.equal(amount.required, true);
    });

    it('marks a non-required field as not required', () => {
        const tags = schema().fields.find((f) => f.name === 'tags');
        assert.equal(tags.required, false);
    });

    it('detects array fields', () => {
        const tags = schema().fields.find((f) => f.name === 'tags');
        assert.equal(tags.isArray, true);
    });

    it('defaults entity to NONE and status to DRAFT', () => {
        const s = schema();
        assert.equal(s.entity, 'NONE');
        assert.equal(s.status, 'DRAFT');
    });

    it('generates a uuid when none is supplied', () => {
        const s = new Schema();
        assert.ok(typeof s.uuid === 'string' && s.uuid.length > 0);
    });

    it('produces a schema: contextURL for the empty constructor', () => {
        const s = new Schema();
        assert.ok(s.contextURL.startsWith('schema:'));
    });
});

describe('Schema model — setPaths', () => {
    it('sets a flat path equal to the field name', () => {
        const amount = schema().fields.find((f) => f.name === 'amount');
        assert.equal(amount.path, 'amount');
    });

    it('sets fullPath using the iri prefix', () => {
        const amount = schema().fields.find((f) => f.name === 'amount');
        assert.equal(amount.fullPath, '#u-1&1.0.0/amount');
    });

    it('sets dotted child paths for nested refs', () => {
        const refDoc = doc({
            properties: {
                child: { $ref: '#sub', $comment: JSON.stringify({ term: 'child' }) },
            },
            required: [],
            $defs: { '#sub': { properties: { leaf: { type: 'string', $comment: JSON.stringify({ term: 'leaf' }) } } } },
        });
        const s = schema({ document: refDoc });
        const child = s.fields.find((f) => f.name === 'child');
        assert.equal(child.fields[0].path, 'child.leaf');
    });
});

describe('Schema model — setTypes (arrayLvl / fullType)', () => {
    it('gives a scalar field arrayLvl 0', () => {
        const amount = schema().fields.find((f) => f.name === 'amount');
        assert.equal(amount.arrayLvl, 0);
        assert.equal(amount.fullType, 'number');
    });

    it('gives an array field arrayLvl 1 and a []-suffixed fullType', () => {
        const tags = schema().fields.find((f) => f.name === 'tags');
        assert.equal(tags.arrayLvl, 1);
        assert.equal(tags.fullType, 'string[]');
    });

    it('uses object as the fullType base for refs', () => {
        const refDoc = doc({
            properties: { child: { $ref: '#sub', $comment: JSON.stringify({ term: 'child' }) } },
            required: [],
            $defs: { '#sub': { properties: {} } },
        });
        const s = schema({ document: refDoc });
        const child = s.fields.find((f) => f.name === 'child');
        assert.equal(child.fullType, 'object');
    });

    it('accumulates arrayLvl across nested array refs', () => {
        const refDoc = doc({
            properties: {
                rows: {
                    type: 'array',
                    items: { $ref: '#sub' },
                    $comment: JSON.stringify({ term: 'rows' }),
                },
            },
            required: [],
            $defs: { '#sub': { properties: { cells: { type: 'array', items: { type: 'string' }, $comment: JSON.stringify({ term: 'cells' }) } } } },
        });
        const s = schema({ document: refDoc });
        const rows = s.fields.find((f) => f.name === 'rows');
        const cells = rows.fields.find((f) => f.name === 'cells');
        assert.equal(rows.arrayLvl, 1);
        assert.equal(cells.arrayLvl, 2);
        assert.equal(cells.fullType, 'string[][]');
    });
});

describe('Schema model — getDeepFields', () => {
    const nestedSchema = () => {
        const refDoc = doc({
            properties: { child: { $ref: '#sub', $comment: JSON.stringify({ term: 'child' }) } },
            required: [],
            $defs: { '#sub': { properties: { leaf: { type: 'string', $comment: JSON.stringify({ term: 'leaf' }) } } } },
        });
        return schema({ document: refDoc });
    };

    it('returns one node per top-level field', () => {
        const nodes = nestedSchema().getDeepFields();
        assert.equal(nodes.length, 1);
        assert.equal(nodes[0].path, 'child');
    });

    it('nests deep fields under their parent', () => {
        const nodes = nestedSchema().getDeepFields();
        assert.equal(nodes[0].fields[0].path, 'child.leaf');
    });

    it('reports object type for ref nodes', () => {
        const nodes = nestedSchema().getDeepFields();
        assert.equal(nodes[0].type, 'object');
    });

    it('attaches the underlying field to each node', () => {
        const nodes = nestedSchema().getDeepFields();
        assert.equal(nodes[0].field.name, 'child');
    });
});

describe('Schema model — getField / getFields / searchFields', () => {
    const nestedSchema = () => {
        const refDoc = doc({
            properties: { child: { $ref: '#sub', $comment: JSON.stringify({ term: 'child' }) } },
            required: [],
            $defs: { '#sub': { properties: { leaf: { type: 'string', $comment: JSON.stringify({ term: 'leaf' }) } } } },
        });
        return schema({ document: refDoc });
    };

    it('getFields flattens nested fields', () => {
        const names = nestedSchema().getFields().map((f) => f.name).sort();
        assert.deepEqual(names, ['child', 'leaf']);
    });

    it('getField resolves a dotted nested path', () => {
        const f = nestedSchema().getField('child.leaf');
        assert.equal(f.name, 'leaf');
    });

    it('getField returns null for an unknown path', () => {
        assert.equal(nestedSchema().getField('nope'), null);
    });

    it('searchFields returns fields passing the predicate', () => {
        const result = nestedSchema().searchFields((f) => f.name === 'leaf');
        assert.equal(result.length, 1);
        assert.equal(result[0].name, 'leaf');
    });

    it('searchFields returns [] when nothing matches', () => {
        assert.deepEqual(nestedSchema().searchFields(() => false), []);
    });
});

describe('Schema model — clone & static factories', () => {
    it('clone copies identity fields', () => {
        const c = schema().clone();
        assert.equal(c.uuid, 'u-1');
        assert.equal(c.version, '1.0.0');
        assert.equal(c.type, 'u-1&1.0.0');
    });

    it('clone shares the same fields reference', () => {
        const s = schema();
        assert.equal(s.clone().fields, s.fields);
    });

    it('Schema.from returns a Schema for valid input', () => {
        const s = Schema.from({ uuid: 'x', version: '1.0.0', contextURL: 'ctx:', document: doc() });
        assert.ok(s instanceof Schema);
    });

    it('Schema.fromDocument builds from a bare document', () => {
        const s = Schema.fromDocument(doc());
        assert.ok(s instanceof Schema);
        assert.ok(s.fields.length > 0);
    });
});

describe('Schema model — updateDocument round-trip', () => {
    it('rebuilds a document from parsed fields', () => {
        const s = schema();
        s.updateDocument();
        assert.ok(s.document.properties.amount);
        assert.ok(s.document.properties.tags);
    });

    it('keeps required projection after updateDocument', () => {
        const s = schema();
        s.updateDocument();
        assert.ok(s.document.required.includes('amount'));
    });

    it('re-parses to the same field names after updateDocument', () => {
        const s = schema();
        s.updateDocument();
        const reparsed = SchemaHelper.parseFields(s.document, 'ctx:', new Map(), null);
        const names = reparsed.map((f) => f.name).sort();
        assert.deepEqual(names, ['amount', 'tags']);
    });
});

describe('Schema model — setVersion guards', () => {
    it('accepts a greater version and records the previous one', () => {
        const s = schema();
        s.version = '1.0.0';
        s.setVersion('1.1.0');
        assert.equal(s.version, '1.1.0');
        assert.equal(s.previousVersion, '1.0.0');
    });

    it('throws on an invalid version format', () => {
        assert.throws(() => schema().setVersion('not-a-version'), /Invalid version format/);
    });

    it('throws when the new version is not greater', () => {
        const s = schema();
        s.version = '2.0.0';
        assert.throws(() => s.setVersion('1.0.0'), /Version must be greater/);
    });
});
