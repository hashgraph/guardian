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
