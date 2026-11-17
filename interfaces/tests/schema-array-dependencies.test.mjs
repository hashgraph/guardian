import assert from 'node:assert/strict';
import { Schema } from '../dist/models/schema.js';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const dependencies = () => ([{
    field: ['quantification', 'projectInstanceBE'],
    on: ['projectDetails', 'projectLocation'],
    kind: 'array',
    title: ['projectInstance'],
    valueMappings: [
        { source: ['projectInstance'], target: ['projectInstanceBE'] },
    ],
}]);

const documentWith = (deps, previousVersion) => ({
    $id: '#u-1&1.0.0',
    $comment: SchemaHelper.buildSchemaComment(
        'u-1&1.0.0', 'ctx:#u-1&1.0.0', previousVersion, deps
    ),
    title: 'Root',
    description: 'd',
    type: 'object',
    properties: { field0: { type: 'string' } },
    required: [],
    $defs: {},
});

const readDependencies = (schemaData) =>
    SchemaHelper.parseSchemaComment(schemaData.document.$comment).arrayDependencies;

describe('buildSchemaComment — a schema without dependencies is untouched', () => {
    it('emits the legacy spaced format when no dependencies are given', () => {
        assert.equal(SchemaHelper.buildSchemaComment('t', 'u'), '{ "@id": "u", "term": "t" }');
    });

    it('emits the legacy spaced format with a previous version', () => {
        assert.equal(
            SchemaHelper.buildSchemaComment('t', 'u', '1.0.0'),
            '{ "@id": "u", "term": "t", "previousVersion": "1.0.0" }'
        );
    });

    it('emits the legacy spaced format for an empty dependency list', () => {
        assert.equal(
            SchemaHelper.buildSchemaComment('t', 'u', undefined, []),
            '{ "@id": "u", "term": "t" }'
        );
    });
});

describe('buildSchemaComment — array dependencies', () => {
    it('keeps the original key order when there are no dependencies', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u', '1.0.0');
        assert.deepEqual(Object.keys(JSON.parse(comment)), ['@id', 'term', 'previousVersion']);
    });

    it('omits previousVersion when it is not given', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u');
        assert.deepEqual(JSON.parse(comment), { '@id': 'u', term: 't' });
    });

    it('omits the key entirely for an empty list', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u', undefined, []);
        assert.equal('arrayDependencies' in JSON.parse(comment), false);
    });

    it('omits the key entirely for an undefined list', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u', undefined, undefined);
        assert.equal('arrayDependencies' in JSON.parse(comment), false);
    });

    it('appends the declaration after the existing keys', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u', '1.0.0', dependencies());
        assert.deepEqual(
            Object.keys(JSON.parse(comment)),
            ['@id', 'term', 'previousVersion', 'arrayDependencies']
        );
    });
});

describe('parseSchemaComment — array dependencies', () => {
    it('round-trips a declaration without losing a field', () => {
        const comment = SchemaHelper.buildSchemaComment('t', 'u', undefined, dependencies());
        assert.deepEqual(
            SchemaHelper.parseSchemaComment(comment).arrayDependencies,
            dependencies()
        );
    });

    it('returns an empty object for malformed input', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment('{not json'), {});
    });

    it('returns an empty object for an empty string', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment(''), {});
    });
});

describe('Schema model — array dependencies', () => {
    it('parses the declaration out of the root comment', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: documentWith(dependencies()) });
        assert.deepEqual(s.arrayDependencies, dependencies());
    });

    it('defaults to an empty list when the comment carries none', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: documentWith(undefined) });
        assert.deepEqual(s.arrayDependencies, []);
    });

    it('defaults to an empty list when the comment is malformed', () => {
        const document = documentWith(dependencies());
        document.$comment = '{not json';
        const s = new Schema({ iri: '#u-1&1.0.0', document });
        assert.deepEqual(s.arrayDependencies, []);
    });

    it('carries the declaration into a clone', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: documentWith(dependencies()) });
        assert.deepEqual(s.clone().arrayDependencies, dependencies());
    });

    it('writes the declaration back into the document on update', () => {
        const s = new Schema({ iri: '#u-1&1.0.0', document: documentWith(dependencies()) });
        s.arrayDependencies = dependencies();
        s.update(
            [{
                name: 'a', title: 'A', description: 'A', type: 'string',
                required: true, isArray: false, isRef: false, readOnly: false,
            }],
            []
        );
        assert.deepEqual(
            SchemaHelper.parseSchemaComment(s.document.$comment).arrayDependencies,
            dependencies()
        );
    });
});

describe('SchemaHelper version paths — the declaration survives', () => {
    it('setVersion keeps the declaration', () => {
        const data = {
            uuid: 'u-1',
            contextURL: 'ctx',
            document: documentWith(dependencies(), '1.0.0'),
        };
        SchemaHelper.setVersion(data, '1.0.1', '1.0.0');
        assert.deepEqual(readDependencies(data), dependencies());
    });

    it('updateVersion keeps the declaration', () => {
        const data = {
            uuid: 'u-1',
            contextURL: 'ctx',
            owner: 'did:o',
            creator: 'did:o',
            document: documentWith(dependencies(), '1.0.0'),
        };
        SchemaHelper.updateVersion(data, '1.0.1');
        assert.deepEqual(readDependencies(data), dependencies());
    });

    it('updateOwner keeps the declaration', () => {
        const data = {
            uuid: 'u-1',
            version: '1.0.0',
            contextURL: 'ctx',
            document: documentWith(dependencies(), '1.0.0'),
        };
        SchemaHelper.updateOwner(data, { owner: 'did:new', creator: 'did:new' });
        assert.deepEqual(readDependencies(data), dependencies());
    });

    it('a schema without a declaration stays without one after a version bump', () => {
        const data = {
            uuid: 'u-1',
            contextURL: 'ctx',
            document: documentWith(undefined, '1.0.0'),
        };
        SchemaHelper.setVersion(data, '1.0.1', '1.0.0');
        assert.equal(readDependencies(data), undefined);
    });
});


describe('collectArrayDependencies includes declarations in non-repeatable sub-schemas', () => {
    const links = [{ on: ['sources'], field: ['targets'], kind: 'array', title: ['name'],
        valueMappings: [{ source: ['name'], target: ['copied'] }] }];
    const child = { type: 'object', $comment: JSON.stringify({ arrayDependencies: links }), properties: {} };
    const root = () => ({ type: 'object', properties: { first: { $ref: '#child' }, second: { $ref: '#child' } },
        $defs: { '#child': child } });
    const chain = [
        { on: ['locations'], field: ['instances'], kind: 'array', title: ['name'] },
        { on: ['instances'], field: ['reports'], kind: 'array', title: ['label'] }
    ];
    const section = (ownLinks = chain) => ({ type: 'object', properties: { section: { $ref: '#section' } },
        $defs: { '#section': { type: 'object', $comment: JSON.stringify({ arrayDependencies: ownLinks }), properties: {} } } });

    it('prefixes both endpoints separately for each use and keeps entry paths relative', () => {
        const doc = root();
        const before = JSON.stringify(doc);
        assert.deepEqual(SchemaHelper.collectArrayDependencies(doc), ['first', 'second'].map(name => ({
            ...links[0], on: [name, 'sources'], field: [name, 'targets']
        })));
        assert.equal(JSON.stringify(doc), before);
    });

    it('does not follow a repeated container', () => {
        const doc = root();
        doc.properties.first = { type: 'array', items: { $ref: '#child' } };
        assert.equal(SchemaHelper.collectArrayDependencies(doc).length, 1);
    });

    it('follows object nesting and conditional branches', () => {
        const doc = root();
        doc.properties = { outer: { type: 'object', properties: { nested: { $ref: '#child' } } } };
        doc.allOf = [{ then: { properties: { conditional: { $ref: '#child' } } } }];
        assert.deepEqual(SchemaHelper.collectArrayDependencies(doc).map(link => link.on), [
            ['outer', 'nested', 'sources'], ['conditional', 'sources']
        ]);
    });

    it('ends a reference cycle and keeps independent branches', () => {
        const doc = root();
        doc.$defs['#child'] = { ...child, properties: { self: { $ref: '#child' } } };
        assert.equal(SchemaHelper.collectArrayDependencies(doc).length, 2);
    });

    it('keeps unsaved root declarations without writing them into the document', () => {
        const doc = { type: 'object', properties: {}, $defs: {} };
        assert.deepEqual(SchemaHelper.collectArrayDependencies(doc, links), links);
        assert.equal(doc.$comment, undefined);
    });

    it('skips an identical copy of a sub-schema link already declared by the parent', () => {
        const copy = { ...chain[0], on: ['section', 'locations'], field: ['section', 'instances'] };
        const result = SchemaHelper.collectArrayDependencies(section([chain[0]]), [copy]);
        assert.deepEqual(result, [copy]);
    });

    it('keeps different declarations without generating an automatic relationship', () => {
        const parent = { on: ['regions'], field: ['section', 'reports'], kind: 'array', title: ['region'] };
        const result = SchemaHelper.collectArrayDependencies(section(), [parent]);
        assert.deepEqual(result, [
            parent,
            { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array', title: ['name'] },
            { ...chain[1], on: ['section', 'instances'], field: ['section', 'reports'] }
        ]);
    });

    it('adds no automatic link when the top of the chain already has a parent source', () => {
        const parent = [
            { on: ['regions'], field: ['section', 'reports'], kind: 'array' },
            { on: ['areas'], field: ['section', 'locations'], kind: 'array' }
        ];
        const result = SchemaHelper.collectArrayDependencies(section(), parent);
        assert.deepEqual(result, [
            ...parent,
            { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array', title: ['name'] },
            { ...chain[1], on: ['section', 'instances'], field: ['section', 'reports'] }
        ]);
    });

    it('skips a sub-schema link that would close a cycle with the parent links', () => {
        const parent = { on: ['section', 'instances'], field: ['section', 'locations'], kind: 'array' };
        const result = SchemaHelper.collectArrayDependencies(section([chain[0]]), [parent]);
        assert.deepEqual(result, [parent]);
    });

    it('adds no automatic link that would close a cycle', () => {
        const extra = { on: ['locations'], field: ['extra'], kind: 'array' };
        const parent = { on: ['section', 'extra'], field: ['section', 'reports'], kind: 'array' };
        const result = SchemaHelper.collectArrayDependencies(section([...chain, extra]), [parent]);
        assert.deepEqual(result, [
            parent,
            { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array', title: ['name'] },
            { ...chain[1], on: ['section', 'instances'], field: ['section', 'reports'] },
            { on: ['section', 'locations'], field: ['section', 'extra'], kind: 'array' }
        ]);
    });

    it('does not replace a deeper declaration with an outer declaration', () => {
        const inner = { type: 'object', $comment: JSON.stringify({ arrayDependencies: [chain[0]] }), properties: {} };
        const outer = { type: 'object', properties: { inner: { $ref: '#inner' } },
            $comment: JSON.stringify({ arrayDependencies: [{ on: ['zones'], field: ['inner', 'instances'], kind: 'array' }] }) };
        const doc = { type: 'object', properties: { outer: { $ref: '#outer' } }, $defs: { '#outer': outer, '#inner': inner } };
        assert.deepEqual(SchemaHelper.collectArrayDependencies(doc), [
            { on: ['outer', 'zones'], field: ['outer', 'inner', 'instances'], kind: 'array' },
            { ...chain[0], on: ['outer', 'inner', 'locations'], field: ['outer', 'inner', 'instances'] }
        ]);
    });
});

describe('complete relationship equality', () => {
    const link = { on: ['a'], field: ['b'], kind: 'array', title: ['name'],
        valueMappings: [{ source: ['name'], target: ['copy'] }] };
    it('compares titles and copied values, not just array paths', () => {
        assert.equal(SchemaHelper.equalArrayDependencies(link, { ...link, title: ['other'] }), false);
        assert.equal(SchemaHelper.equalArrayDependencies(link, { ...link, valueMappings: [] }), false);
        assert.equal(SchemaHelper.equalArrayDependencies(link, structuredClone(link)), true);
    });
});
