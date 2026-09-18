import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.validate', () => {
    const valid = {
        name: 'foo',
        uuid: 'uuid-1',
        document: { $id: 'https://x#uuid-1' },
    };

    it('passes a fully populated object schema', () => {
        assert.equal(SchemaHelper.validate(valid), true);
    });

    it('passes when document is a JSON string', () => {
        const schema = { ...valid, document: JSON.stringify(valid.document) };
        assert.equal(SchemaHelper.validate(schema), true);
    });

    it('fails when name is missing', () => {
        assert.equal(SchemaHelper.validate({ ...valid, name: '' }), false);
    });

    it('fails when uuid is missing', () => {
        assert.equal(SchemaHelper.validate({ ...valid, uuid: '' }), false);
    });

    it('fails when document is missing', () => {
        assert.equal(SchemaHelper.validate({ ...valid, document: null }), false);
    });

    it('fails when document.$id is missing', () => {
        assert.equal(
            SchemaHelper.validate({ ...valid, document: { foo: 'bar' } }),
            false,
        );
    });

    it('returns false for malformed JSON document', () => {
        assert.equal(
            SchemaHelper.validate({ ...valid, document: 'not-json' }),
            false,
        );
    });
});

describe('SchemaHelper.updatePermission', () => {
    it('marks isOwner / isCreator based on the supplied owner identity', () => {
        const data = [
            { owner: 'alice', creator: 'alice' },
            { owner: 'bob', creator: 'alice' },
            { owner: null, creator: null },
        ];
        SchemaHelper.updatePermission(data, { owner: 'alice', creator: 'alice' });
        assert.equal(data[0].isOwner, true);
        assert.equal(data[0].isCreator, true);
        assert.equal(data[1].isOwner, false);
        assert.equal(data[1].isCreator, true);
        // For falsy owner/creator the implementation short-circuits and
        // assigns the falsy value itself (null), not literally false.
        assert.ok(!data[2].isOwner);
        assert.ok(!data[2].isCreator);
    });
});

describe('SchemaHelper.updateOwner', () => {
    it('rebuilds $id, $comment, and stamps owner/creator from the owner record', () => {
        const data = {
            uuid: 'uuid-1',
            version: '1.0.0',
            contextURL: 'https://x',
            document: {
                $id: 'https://x#uuid-1&1.0.0',
                $comment: '{"previousVersion":"0.9.0"}',
            },
        };
        const result = SchemaHelper.updateOwner(data, {
            owner: 'did:owner', creator: 'did:creator', username: 'fallback',
        });
        assert.equal(result.owner, 'did:owner');
        assert.equal(result.creator, 'did:creator');
        // $id rebuilt from uuid + version.
        assert.equal(result.document.$id, '#uuid-1&1.0.0');
    });

    it('falls back to username when owner/creator are missing', () => {
        const data = {
            uuid: 'uuid-1',
            version: '1.0.0',
            contextURL: '',
            document: { $id: 'https://x#uuid-1&1.0.0' },
        };
        const result = SchemaHelper.updateOwner(data, { username: 'alice' });
        assert.equal(result.owner, 'alice');
        assert.equal(result.creator, 'alice');
    });

    it('parses a JSON-string document and reassigns it as an object', () => {
        const data = {
            uuid: 'uuid-1',
            version: '1.0.0',
            contextURL: '',
            document: JSON.stringify({ $id: 'https://x#uuid-1&1.0.0' }),
        };
        const result = SchemaHelper.updateOwner(data, { username: 'alice' });
        assert.equal(typeof result.document, 'object');
        assert.equal(result.document.$id, '#uuid-1&1.0.0');
    });
});
