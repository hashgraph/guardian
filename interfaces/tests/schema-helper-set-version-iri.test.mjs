import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.setVersion', () => {
    it('rebuilds $id, $comment and stamps version', () => {
        const data = {
            uuid: 'uuid-1',
            contextURL: 'https://x',
            document: { $id: 'old-id', $comment: '{}' },
        };
        const result = SchemaHelper.setVersion(data, '2.1.0', '2.0.0');
        assert.equal(result.version, '2.1.0');
        assert.equal(result.document.$id, '#uuid-1&2.1.0');
        const comment = JSON.parse(result.document.$comment);
        assert.equal(comment.previousVersion, '2.0.0');
    });

    it('parses a JSON-string document and reassigns it as an object', () => {
        const data = {
            uuid: 'uuid-1',
            contextURL: '',
            document: JSON.stringify({ $id: 'x' }),
        };
        const result = SchemaHelper.setVersion(data, '1.1.0', '1.0.0');
        assert.equal(typeof result.document, 'object');
    });
});

describe('SchemaHelper.updateIRI', () => {
    it('reads iri from existing document.$id', () => {
        const result = SchemaHelper.updateIRI({
            document: { $id: '#existing-id' },
        });
        assert.equal(result.iri, '#existing-id');
    });

    it('parses JSON-string document', () => {
        const result = SchemaHelper.updateIRI({
            document: JSON.stringify({ $id: '#parsed' }),
        });
        assert.equal(result.iri, '#parsed');
    });

    it('sets iri to null when document is present but $id is missing', () => {
        const result = SchemaHelper.updateIRI({ document: {} });
        assert.equal(result.iri, null);
    });

    it('builds iri from uuid+version when no document is present', () => {
        const result = SchemaHelper.updateIRI({ uuid: 'u', version: '1.0.0' });
        assert.equal(result.iri, '#u&1.0.0');
    });

    it('returns iri=null on a parse error (malformed JSON document)', () => {
        const result = SchemaHelper.updateIRI({ document: 'not-json' });
        assert.equal(result.iri, null);
    });
});
