/**
 * Fidelity test for the vendored schemasToContext helper.
 *
 * schemasToContext was vendored in-tree to drop @transmute/jsonld-schema. This guards the
 * vendored implementation against drift: its @context output for a representative schema must
 * stay byte-identical to what the previous @transmute implementation produced (the oracle in
 * tests/fixtures/credentials/schemas-to-context.json was generated with that implementation).
 * Schema-context output is baked into published credentials, so silent drift would be permanent.
 */
import { assert } from 'chai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { schemasToContext } from '../../../dist/helpers/schemas-to-context.js';
import { schemasToContext as schemasToContextImpl } from '../../../dist/helpers/jsonld-schema/schemas-to-context-impl.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/credentials');
const read = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));

// Class/property embeddings are encoded as a JSON-stringified { term, @id } under $comment,
// matching the shape Guardian schemas emit (see fixtures/credentials/schema.json).
const embed = (term, id) => JSON.stringify({ term, '@id': id });

describe('schemasToContext (vendored)', function () {
    it('produces the same @context as the previous @transmute implementation', function () {
        const schema = read('schema.json');
        const oracle = read('schemas-to-context.json');
        const result = schemasToContext([schema.document]);
        assert.deepEqual(result, oracle);
    });
});

describe('schemasToContext property embedding extraction', function () {
    // Locks the fragile handlePropertyEmbeddings line `extractEmbedding(prop, classEmbedding)`:
    // it detects a property embedding by scanning every supported attribute but extracts it
    // using the CLASS's embedding attribute. Guardian relies on class and property embeddings
    // both being $comment; these tests pin that homogeneous behavior and document the limitation.
    it('maps a property term under its class when both use $comment', function () {
        const schema = {
            $id: 'urn:test:Thing',
            $comment: embed('Thing', 'urn:test:Thing#Thing'),
            type: 'object',
            properties: {
                foo: { $comment: embed('foo', 'urn:test:Thing#foo'), type: 'string' },
            },
        };

        const result = schemasToContextImpl([schema]);

        assert.deepEqual(result['@context'].Thing, {
            '@id': 'urn:test:Thing#Thing',
            '@context': { foo: { '@id': 'urn:test:Thing#foo' } },
        });
    });

    it('throws when a property uses a different embedding attribute than its class', function () {
        const schema = {
            $id: 'urn:test:Thing',
            $comment: embed('Thing', 'urn:test:Thing#Thing'),
            type: 'object',
            properties: {
                // class embedding is $comment, property embedding is $linkedData — unsupported mix
                foo: { $linkedData: { term: 'foo', '@id': 'urn:test:Thing#foo' }, type: 'string' },
            },
        };

        assert.throws(() => schemasToContextImpl([schema]));
    });
});

describe('schemasToContext schema.org/text rewrite', function () {
    // The wrapper rewrites plain-text properties from @id to @type. Lock that behavior and its
    // dependency on the impl emitting the exact https://www.schema.org/text term.
    it('emits @type (not @id) for https://www.schema.org/text properties', function () {
        const schema = {
            $id: 'urn:test:Thing',
            $comment: embed('Thing', 'urn:test:Thing#Thing'),
            type: 'object',
            properties: {
                text: { $comment: embed('text', 'https://www.schema.org/text'), type: 'string' },
            },
        };

        const wrapped = schemasToContext([schema]);
        const impl = schemasToContextImpl([schema]);

        assert.deepEqual(wrapped['@context'].Thing['@context'].text, {
            '@type': 'https://www.schema.org/text',
        });
        // the impl still emits @id; the rewrite is the wrapper's responsibility
        assert.deepEqual(impl['@context'].Thing['@context'].text, {
            '@id': 'https://www.schema.org/text',
        });
    });
});
