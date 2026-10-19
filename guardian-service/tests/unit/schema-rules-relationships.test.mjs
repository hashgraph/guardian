import assert from 'node:assert/strict';
import {
    buildRelationshipsSchemas,
    pickRelationshipsPolicy,
} from '../../dist/api/helpers/schema-rules-relationships.js';

const sub2 = { title: 'sub2', properties: { a: { type: 'string' } } };
const sub1 = { title: 'sub1', properties: { s2: { $ref: '#s2' } } };

const schemas = () => [
    {
        iri: '#root', entity: 'VC', context: { x: 1 }, defs: ['#s1', '#s2'],
        document: { title: 'root', properties: { s1: { $ref: '#s1' } }, $defs: { '#s1': { ...sub1 }, '#s2': { ...sub2 } } },
    },
    { iri: '#s1', entity: 'NONE', context: {}, defs: ['#s2'], document: { ...sub1, $defs: { '#s2': { ...sub2 } } } },
    { iri: '#s2', entity: 'NONE', context: {}, defs: [], document: { ...sub2 } },
    { iri: '#unused', entity: 'NONE', context: {}, defs: [], document: { title: 'unused' } },
];

describe('schema rule relationships', () => {
    it('keeps only whitelisted policy fields', () => {
        const policy = pickRelationshipsPolicy({ id: '1', name: 'p', version: '1', status: 'PUBLISH', config: { big: true }, hashMap: {} });
        assert.deepEqual(policy, { id: '1', name: 'p', version: '1', status: 'PUBLISH' });
    });

    it('drops unreachable schemas and context, moves $defs out', () => {
        const result = buildRelationshipsSchemas(schemas());
        assert.deepEqual(result.map((s) => s.iri), ['#root', '#s1', '#s2']);
        for (const s of result) {
            assert.equal('context' in s, false);
            assert.equal(s.document.$defs, undefined);
        }
        assert.deepEqual(result[0].defs, ['#s1', '#s2']);
        assert.deepEqual(result[1].defs, ['#s2']);
    });

    it('keeps $defs inline when it cannot be restored from the list', () => {
        const list = schemas();
        list[0].document.$defs['#s1'] = { title: 'other' };
        const result = buildRelationshipsSchemas(list);
        assert.ok(result[0].document.$defs);
        assert.equal(result[1].document.$defs, undefined);
    });

    it('accepts string documents', () => {
        const list = schemas().map((s) => ({ ...s, document: JSON.stringify(s.document) }));
        const result = buildRelationshipsSchemas(list);
        assert.deepEqual(result.map((s) => s.iri), ['#root', '#s1', '#s2']);
        assert.equal(result[0].document.$defs, undefined);
    });
});
