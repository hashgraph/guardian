import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.getContext', () => {
    it('builds { type, @context } from item.iri and item.contextURL', () => {
        const ctx = SchemaHelper.getContext({
            iri: 'https://example.com#uuid-1&1.0.0',
            contextURL: 'https://example.com/ctx.jsonld',
        });
        assert.equal(ctx.type, 'uuid-1&1.0.0');
        assert.deepEqual(ctx['@context'], ['https://example.com/ctx.jsonld']);
    });

    it('returns null when iri is null', () => {
        const ctx = SchemaHelper.getContext({ iri: null, contextURL: 'x' });
        assert.equal(ctx.type, null);
        assert.deepEqual(ctx['@context'], ['x']);
    });

    it('emits an empty type for an empty iri', () => {
        const ctx = SchemaHelper.getContext({ iri: '', contextURL: 'ctx' });
        assert.equal(ctx.type, null);
    });
});
