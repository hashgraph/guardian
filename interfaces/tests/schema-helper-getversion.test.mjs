import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.getVersion', () => {
    it('extracts version and previousVersion from a populated document', () => {
        const result = SchemaHelper.getVersion({
            document: {
                $id: 'https://x#uuid-1&2.0.0',
                $comment: '{"previousVersion":"1.5.0"}',
            },
        });
        assert.equal(result.version, '2.0.0');
        assert.equal(result.previousVersion, '1.5.0');
    });

    it('parses JSON-string documents', () => {
        const result = SchemaHelper.getVersion({
            document: JSON.stringify({
                $id: 'https://x#uuid-1&3.0.0',
                $comment: '{"previousVersion":"2.0.0"}',
            }),
        });
        assert.equal(result.version, '3.0.0');
        assert.equal(result.previousVersion, '2.0.0');
    });

    it('returns null/null on parse failure (malformed input)', () => {
        const result = SchemaHelper.getVersion({ document: 'not-json' });
        assert.equal(result.version, null);
        assert.equal(result.previousVersion, null);
    });

    it('returns null/null when the document is missing', () => {
        const result = SchemaHelper.getVersion({});
        assert.equal(result.version, null);
        assert.equal(result.previousVersion, null);
    });
});

describe('SchemaHelper.updateObjectContext', () => {
    it('stamps schema.type and @context onto the json', () => {
        const json = SchemaHelper.updateObjectContext(
            { type: 'uuid-1&1.0.0', contextURL: 'https://x', fields: [] },
            { existing: 'value' },
        );
        assert.equal(json.type, 'uuid-1&1.0.0');
        assert.deepEqual(json['@context'], ['https://x']);
        assert.equal(json.existing, 'value');
    });
});

describe('SchemaHelper.map', () => {
    it('returns [] for null/undefined input', () => {
        assert.deepEqual(SchemaHelper.map(null), []);
        assert.deepEqual(SchemaHelper.map(undefined), []);
    });

    it('maps each ISchema to a Schema instance', () => {
        const result = SchemaHelper.map([
            {
                uuid: 'uuid-1',
                document: { $id: 'https://x#uuid-1&1.0.0', $comment: '{}' },
            },
        ]);
        assert.equal(result.length, 1);
        assert.equal(typeof result[0], 'object');
    });
});
