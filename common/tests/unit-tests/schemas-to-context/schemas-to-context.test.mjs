import assert from 'node:assert/strict';
import esmock from 'esmock';

const { schemasToContext } = await esmock('../../../dist/helpers/schemas-to-context.js', {
    '@transmute/jsonld-schema': {
        schemasToContext: (schemas) => ({
            '@context': {
                name: { '@id': 'https://www.schema.org/text' },
                age: { '@id': 'https://www.schema.org/integer' },
                schemasCount: schemas?.length ?? 0,
            },
        }),
    },
});

describe('@unit schemasToContext', () => {
    it('rewrites "@id":"https://www.schema.org/text" → "@type":"https://www.schema.org/text"', () => {
        const out = schemasToContext([{ schema: 1 }]);
        assert.equal(out['@context'].name['@type'], 'https://www.schema.org/text');
        assert.equal(out['@context'].name['@id'], undefined);
    });

    it('leaves non-text "@id" entries untouched', () => {
        const out = schemasToContext([{ schema: 1 }]);
        assert.equal(out['@context'].age['@id'], 'https://www.schema.org/integer');
        assert.equal(out['@context'].age['@type'], undefined);
    });

    it('merges additionalContexts on top of the base context', () => {
        const additional = new Map([
            ['foo', { '@id': 'https://example.com/foo' }],
            ['bar', 'http://example.com/bar'],
        ]);
        const out = schemasToContext([], additional);
        assert.deepEqual(out['@context'].foo, { '@id': 'https://example.com/foo' });
        assert.equal(out['@context'].bar, 'http://example.com/bar');
    });

    it('additional context entries can OVERWRITE keys from the base', () => {
        const additional = new Map([
            ['name', 'overwritten-by-additional'],
        ]);
        const out = schemasToContext([], additional);
        assert.equal(out['@context'].name, 'overwritten-by-additional');
    });

    it('handles undefined additionalContexts (no error)', () => {
        const out = schemasToContext([{ schema: 1 }]);
        assert.ok(out['@context']);
    });

    it('handles empty additionalContexts map (no merge)', () => {
        const out = schemasToContext([{ schema: 1 }], new Map());
        // Only the base context keys
        assert.deepEqual(Object.keys(out['@context']).sort(), ['age', 'name', 'schemasCount']);
    });

    it('forwards schemas argument count through to the underlying library', () => {
        const out = schemasToContext([{ a: 1 }, { b: 2 }, { c: 3 }]);
        assert.equal(out['@context'].schemasCount, 3);
    });

    it('result is a fresh object — repeated calls do not share references', () => {
        const a = schemasToContext([]);
        const b = schemasToContext([]);
        assert.notStrictEqual(a, b);
        assert.notStrictEqual(a['@context'], b['@context']);
    });
});
