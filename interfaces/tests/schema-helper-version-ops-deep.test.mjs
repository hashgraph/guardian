import assert from 'node:assert/strict';

import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.setVersion', () => {
    it('rewrites $id and $comment for an object document', () => {
        const data = { uuid: 'uuidA', contextURL: 'http://c', document: {} };
        const out = SchemaHelper.setVersion(data, '2.0.0', '1.0.0');
        assert.equal(out.document.$id, '#uuidA&2.0.0');
        assert.equal(out.version, '2.0.0');
        const comment = JSON.parse(out.document.$comment);
        assert.equal(comment.term, 'uuidA&2.0.0');
        assert.equal(comment.previousVersion, '1.0.0');
        assert.equal(comment['@id'], 'http://c#uuidA&2.0.0');
    });

    it('parses a string document before rewriting', () => {
        const data = { uuid: 'uuidB', contextURL: '', document: JSON.stringify({ existing: true }) };
        const out = SchemaHelper.setVersion(data, '1.5.0');
        assert.equal(out.document.$id, '#uuidB&1.5.0');
        assert.equal(out.document.existing, true);
    });

    it('omits previousVersion in the comment when not provided', () => {
        const out = SchemaHelper.setVersion({ uuid: 'u', document: {} }, '1.0.0');
        const comment = JSON.parse(out.document.$comment);
        assert.equal(comment.previousVersion, undefined);
    });
});

describe('SchemaHelper.updateVersion', () => {
    function makeData(prev, contextURL) {
        return {
            uuid: 'uuidA',
            owner: 'o1',
            creator: 'c1',
            contextURL: contextURL ?? 'http://c',
            document: { $id: '#uuidA&1.0.0', $comment: JSON.stringify({ previousVersion: prev }) },
        };
    }

    it('accepts a greater version and rewrites identity', () => {
        const out = SchemaHelper.updateVersion(makeData('1.0.0'), '2.0.0');
        assert.equal(out.version, '2.0.0');
        assert.equal(out.document.$id, '#uuidA&2.0.0');
        assert.equal(out.uuid, 'uuidA');
    });

    it('carries the previousVersion into the new comment', () => {
        const out = SchemaHelper.updateVersion(makeData('1.0.0'), '2.0.0');
        const comment = JSON.parse(out.document.$comment);
        assert.equal(comment.previousVersion, '1.0.0');
    });

    it('throws on an invalid version format', () => {
        assert.throws(() => SchemaHelper.updateVersion(makeData('1.0.0'), 'not-a-version'), /Invalid version format/);
    });

    it('throws when the new version is not greater than previous', () => {
        assert.throws(() => SchemaHelper.updateVersion(makeData('3.0.0'), '2.0.0'), /Version must be greater than 3.0.0/);
    });

    it('throws when the new version equals the previous', () => {
        assert.throws(() => SchemaHelper.updateVersion(makeData('2.0.0'), '2.0.0'), /Version must be greater than/);
    });

    it('prefers creator over owner for the resulting owner field', () => {
        const out = SchemaHelper.updateVersion(makeData('1.0.0'), '2.0.0');
        assert.equal(out.owner, 'c1');
        assert.equal(out.creator, 'c1');
    });

    it('falls back to document uuid when data.uuid is absent', () => {
        const data = {
            owner: 'o1',
            contextURL: 'http://c',
            document: { $id: '#docUuid&1.0.0', $comment: JSON.stringify({ previousVersion: '1.0.0' }) },
        };
        const out = SchemaHelper.updateVersion(data, '2.0.0');
        assert.equal(out.uuid, 'docUuid');
    });

    it('parses a string document', () => {
        const data = {
            uuid: 'uuidA',
            owner: 'o1',
            contextURL: 'http://c',
            document: JSON.stringify({ $id: '#uuidA&1.0.0', $comment: JSON.stringify({ previousVersion: '1.0.0' }) }),
        };
        const out = SchemaHelper.updateVersion(data, '2.0.0');
        assert.equal(out.document.$id, '#uuidA&2.0.0');
    });
});

describe('SchemaHelper.updateOwner', () => {
    function makeData() {
        return { document: { $id: '#uuidA&1.0.0', $comment: JSON.stringify({ previousVersion: '0.9.0' }) } };
    }

    it('sets owner and creator from explicit fields', () => {
        const out = SchemaHelper.updateOwner(makeData(), { owner: 'newOwner', creator: 'newCreator' });
        assert.equal(out.owner, 'newOwner');
        assert.equal(out.creator, 'newCreator');
    });

    it('falls back to username for owner and creator', () => {
        const out = SchemaHelper.updateOwner(makeData(), { username: 'bob' });
        assert.equal(out.owner, 'bob');
        assert.equal(out.creator, 'bob');
    });

    it('derives version and uuid from the document when missing', () => {
        const out = SchemaHelper.updateOwner(makeData(), { username: 'bob' });
        assert.equal(out.version, '1.0.0');
        assert.equal(out.uuid, 'uuidA');
        assert.equal(out.document.$id, '#uuidA&1.0.0');
    });

    it('preserves an existing version and uuid on the data', () => {
        const data = { version: '5.0.0', uuid: 'fixed', document: { $id: '#uuidA&1.0.0' } };
        const out = SchemaHelper.updateOwner(data, { username: 'bob' });
        assert.equal(out.version, '5.0.0');
        assert.equal(out.uuid, 'fixed');
        assert.equal(out.document.$id, '#fixed&5.0.0');
    });

    it('parses a string document', () => {
        const data = { document: JSON.stringify({ $id: '#uuidA&1.0.0' }) };
        const out = SchemaHelper.updateOwner(data, { owner: 'o', creator: 'c' });
        assert.equal(out.document.$id, '#uuidA&1.0.0');
    });
});

describe('SchemaHelper.updatePermission', () => {
    it('flags isOwner and isCreator by exact match', () => {
        const data = [
            { owner: 'a', creator: 'a' },
            { owner: 'b', creator: 'c' },
        ];
        SchemaHelper.updatePermission(data, { owner: 'a', creator: 'a' });
        assert.equal(data[0].isOwner, true);
        assert.equal(data[0].isCreator, true);
        assert.equal(data[1].isOwner, false);
        assert.equal(data[1].isCreator, false);
    });

    it('isOwner is falsy when element.owner is missing', () => {
        const data = [{ creator: 'a' }];
        SchemaHelper.updatePermission(data, { owner: 'a', creator: 'a' });
        assert.ok(!data[0].isOwner);
        assert.equal(data[0].isCreator, true);
    });

    it('handles an empty list without error', () => {
        const data = [];
        SchemaHelper.updatePermission(data, { owner: 'a', creator: 'a' });
        assert.deepEqual(data, []);
    });

    it('isCreator is falsy when creators differ', () => {
        const data = [{ owner: 'a', creator: 'x' }];
        SchemaHelper.updatePermission(data, { owner: 'a', creator: 'a' });
        assert.equal(data[0].isOwner, true);
        assert.equal(data[0].isCreator, false);
    });
});

describe('SchemaHelper.updateIRI', () => {
    it('reads iri from an object document $id', () => {
        const out = SchemaHelper.updateIRI({ document: { $id: '#zzz&1.0.0' } });
        assert.equal(out.iri, '#zzz&1.0.0');
    });

    it('reads iri from a string document', () => {
        const out = SchemaHelper.updateIRI({ document: JSON.stringify({ $id: '#str&2.0.0' }) });
        assert.equal(out.iri, '#str&2.0.0');
    });

    it('sets iri to null when document has no $id', () => {
        const out = SchemaHelper.updateIRI({ document: { properties: {} } });
        assert.equal(out.iri, null);
    });

    it('builds iri from uuid and version when no document', () => {
        const out = SchemaHelper.updateIRI({ uuid: 'qq', version: '1.0.0' });
        assert.equal(out.iri, '#qq&1.0.0');
    });

    it('builds iri from uuid alone when version is absent', () => {
        const out = SchemaHelper.updateIRI({ uuid: 'qq' });
        assert.equal(out.iri, '#qq');
    });

    it('sets iri to null when document string is unparsable', () => {
        const out = SchemaHelper.updateIRI({ document: '{bad' });
        assert.equal(out.iri, null);
    });
});

describe('SchemaHelper.updateObjectContext', () => {
    it('sets schema type and contextURL on the object', () => {
        const schema = { type: '#myType', contextURL: 'http://ctx', fields: [] };
        const out = SchemaHelper.updateObjectContext(schema, { name: 'x' });
        assert.equal(out.type, '#myType');
        assert.deepEqual(out['@context'], ['http://ctx']);
        assert.equal(out.name, 'x');
    });

    it('strips type and @context from non-ref nested objects', () => {
        const schema = {
            type: '#root',
            contextURL: 'http://ctx',
            fields: [{ name: 'nested', isRef: false }],
        };
        const json = { nested: { type: 'old', '@context': ['old'], value: 1 } };
        const out = SchemaHelper.updateObjectContext(schema, json);
        assert.equal(out.nested.type, undefined);
        assert.equal(out.nested['@context'], undefined);
        assert.equal(out.nested.value, 1);
    });

    it('applies child context to ref fields', () => {
        const schema = {
            type: '#root',
            contextURL: 'http://ctx',
            fields: [{
                name: 'child', isRef: true,
                context: { type: 'ChildType', context: ['http://child'] },
                fields: [],
            }],
        };
        const json = { child: { value: 1 } };
        const out = SchemaHelper.updateObjectContext(schema, json);
        assert.equal(out.child.type, 'ChildType');
        assert.deepEqual(out.child['@context'], ['http://child']);
    });
});
