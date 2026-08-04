import assert from 'node:assert/strict';
import { getSchemaReferenceIris } from '../../dist/api/schema.service.js';

describe('schema reference helper', () => {
    it('finds parent references from the document even when stored defs are empty', () => {
        const refs = getSchemaReferenceIris({
            iri: '#root&1.0.0',
            defs: [],
            document: {
                type: 'object',
                properties: {
                    child: {
                        $ref: '#child&1.0.0',
                        title: 'Child'
                    }
                }
            }
        });

        assert.equal(refs.has('#child&1.0.0'), true);
        assert.equal(refs.has('child&1.0.0'), true);
    });

    it('keeps stored defs and nested array item references in the same result', () => {
        const refs = getSchemaReferenceIris({
            iri: '#root&1.0.0',
            defs: '#stored-child&1.0.0',
            document: {
                type: 'object',
                properties: {
                    children: {
                        type: 'array',
                        items: {
                            $ref: '#array-child&1.0.0'
                        }
                    }
                }
            }
        });

        assert.equal(refs.has('#stored-child&1.0.0'), true);
        assert.equal(refs.has('#array-child&1.0.0'), true);
    });
});
