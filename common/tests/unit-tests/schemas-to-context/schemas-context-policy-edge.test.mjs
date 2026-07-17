import { assert } from 'chai';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { schemasToContext } from '../../../dist/helpers/schemas-to-context.js';
import { GetPropertiesFromFile } from '../../../dist/helpers/policy-property.js';
import { GetGroupedCategories } from '../../../dist/helpers/policy-category.js';

const mkSchema = (term, fields) => ({
    '$id': '#' + term,
    '$comment': JSON.stringify({ term, '@id': 'https://example.com/#' + term }),
    title: term,
    type: 'object',
    properties: Object.fromEntries(
        Object.entries(fields).map(([key, id]) => [
            key,
            {
                title: key,
                type: 'string',
                '$comment': JSON.stringify({ term: key, '@id': id }),
            },
        ])
    ),
});

const TEXT = 'https://www.schema.org/text';
const INT = 'https://www.schema.org/integer';

const writeTemp = async (contents) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gpe-'));
    const file = path.join(dir, 'props.csv');
    await fs.writeFile(file, contents, 'utf8');
    return file;
};

describe('@unit schemasToContext (edge / real library)', () => {
    it('returns only the base traceability context for an empty schema list', () => {
        const out = schemasToContext([]);
        assert.equal(out['@context']['@version'], 1.1);
        assert.equal(out['@context']['@vocab'], 'https://w3id.org/traceability/#undefinedTerm');
        assert.equal(out['@context'].id, '@id');
        assert.equal(out['@context'].type, '@type');
    });

    it('throws TypeError when schemas is null', () => {
        assert.throws(() => schemasToContext(null), TypeError);
    });

    it('throws TypeError when schemas is undefined', () => {
        assert.throws(() => schemasToContext(undefined), TypeError);
    });

    it('throws TypeError when a schema element is null', () => {
        assert.throws(() => schemasToContext([null]), TypeError);
    });

    it('ignores an empty-object schema (no extra terms emitted)', () => {
        const out = schemasToContext([{}]);
        assert.deepEqual(Object.keys(out['@context']).sort(), ['@version', '@vocab', 'id', 'type']);
    });

    it('ignores a schema with no $id/properties', () => {
        const out = schemasToContext([{ title: 'X', type: 'object' }]);
        assert.deepEqual(Object.keys(out['@context']).sort(), ['@version', '@vocab', 'id', 'type']);
    });

    it('emits a nested @context for a populated schema keyed by its term', () => {
        const out = schemasToContext([mkSchema('Alpha', { a: TEXT })]);
        assert.ok(out['@context'].Alpha);
        assert.equal(out['@context'].Alpha['@id'], 'https://example.com/#Alpha');
        assert.ok(out['@context'].Alpha['@context'].a);
    });

    it('rewrites field "@id" of schema.org/text into "@type"', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })]);
        assert.equal(out['@context'].S['@context'].a['@type'], TEXT);
        assert.isUndefined(out['@context'].S['@context'].a['@id']);
    });

    it('leaves non-text field "@id" (integer) untouched', () => {
        const out = schemasToContext([mkSchema('S', { a: INT })]);
        assert.equal(out['@context'].S['@context'].a['@id'], INT);
        assert.isUndefined(out['@context'].S['@context'].a['@type']);
    });

    it('rewrites every occurrence of schema.org/text (replaceAll, not first-only)', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT, b: TEXT })]);
        assert.equal(out['@context'].S['@context'].a['@type'], TEXT);
        assert.equal(out['@context'].S['@context'].b['@type'], TEXT);
    });

    it('does NOT rewrite a longer URL that merely starts with schema.org/text', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT + 'area' })]);
        assert.equal(out['@context'].S['@context'].a['@id'], TEXT + 'area');
        assert.isUndefined(out['@context'].S['@context'].a['@type']);
    });

    it('mixes rewritten and untouched fields within one schema', () => {
        const out = schemasToContext([mkSchema('S', { txt: TEXT, num: INT })]);
        assert.equal(out['@context'].S['@context'].txt['@type'], TEXT);
        assert.equal(out['@context'].S['@context'].num['@id'], INT);
    });

    it('preserves a large field set without loss', () => {
        const fields = {};
        for (let i = 0; i < 50; i++) {
            fields['f' + i] = TEXT;
        }
        const out = schemasToContext([mkSchema('Big', fields)]);
        assert.equal(Object.keys(out['@context'].Big['@context']).length, 50);
    });

    it('preserves unicode in term and field keys', () => {
        const out = schemasToContext([mkSchema('Schéma_名', { café: TEXT })]);
        assert.ok(out['@context']['Schéma_名']);
        assert.equal(out['@context']['Schéma_名']['@context']['café']['@type'], TEXT);
    });

    it('merges additionalContexts entries on top of the real base context', () => {
        const additional = new Map([
            ['foo', { '@id': 'https://example.com/foo' }],
            ['bar', 'http://example.com/bar'],
        ]);
        const out = schemasToContext([], additional);
        assert.deepEqual(out['@context'].foo, { '@id': 'https://example.com/foo' });
        assert.equal(out['@context'].bar, 'http://example.com/bar');
    });

    it('additionalContexts can overwrite a schema-derived term', () => {
        const additional = new Map([['S', 'REPLACED']]);
        const out = schemasToContext([mkSchema('S', { a: TEXT })], additional);
        assert.equal(out['@context'].S, 'REPLACED');
    });

    it('additionalContexts can overwrite a base reserved key', () => {
        const out = schemasToContext([], new Map([['type', 'OVERWRITTEN']]));
        assert.equal(out['@context'].type, 'OVERWRITTEN');
    });

    it('an empty additionalContexts Map is a no-op', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })], new Map());
        assert.ok(out['@context'].S);
        assert.equal(out['@context'].S['@context'].a['@type'], TEXT);
    });

    it('ignores additionalContexts passed as a plain array (no .size)', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })], [['k', 'v']]);
        assert.isUndefined(out['@context'].k);
    });

    it('ignores additionalContexts passed as undefined', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })], undefined);
        assert.ok(out['@context'].S);
    });

    it('ignores additionalContexts passed as null', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })], null);
        assert.ok(out['@context'].S);
    });

    it('returns a fresh object graph on each call (no shared references)', () => {
        const a = schemasToContext([]);
        const b = schemasToContext([]);
        assert.notStrictEqual(a, b);
        assert.notStrictEqual(a['@context'], b['@context']);
    });

    it('result survives a JSON round-trip identically (deterministic shape)', () => {
        const out = schemasToContext([mkSchema('S', { a: TEXT })]);
        assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
    });

    it('merges fields from two schemas that share a term', () => {
        const out = schemasToContext([
            mkSchema('Dup', { a: TEXT }),
            mkSchema('Dup', { b: INT }),
        ]);
        assert.equal(out['@context'].Dup['@context'].a['@type'], TEXT);
        assert.equal(out['@context'].Dup['@context'].b['@id'], INT);
    });
});

describe('@unit GetPropertiesFromFile (edge)', () => {
    it('keeps an empty second column as empty-string value', async () => {
        const file = await writeTemp('a,\nb,');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [
            { title: 'a', value: '' },
            { title: 'b', value: '' },
        ]);
    });

    it('does not trim surrounding whitespace from title or value', async () => {
        const file = await writeTemp(' a , 1 ');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: ' a ', value: ' 1 ' }]);
    });

    it('leaves a trailing CR attached to the value on CRLF input', async () => {
        const file = await writeTemp('a,1\r\nb,2\r\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [
            { title: 'a', value: '1\r' },
            { title: 'b', value: '2\r' },
        ]);
    });

    it('skips a quoted field containing a comma (no CSV quote handling)', async () => {
        const file = await writeTemp('name,"x,y"');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('preserves unicode in title and value', async () => {
        const file = await writeTemp('café,naïve');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'café', value: 'naïve' }]);
    });

    it('skips a single-column row with no comma', async () => {
        const file = await writeTemp('solo');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('returns [] for a file of only newlines', async () => {
        const file = await writeTemp('\n\n\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('skips a two-column row whose title is empty', async () => {
        const file = await writeTemp(',v');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('skips a tab-separated row (only comma is a delimiter)', async () => {
        const file = await writeTemp('a\t1');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, []);
    });

    it('skips rows with three or more columns', async () => {
        const file = await writeTemp('a,1,2\nb,2\n');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'b', value: '2' }]);
    });

    it('treats a numeric-looking value as a string', async () => {
        const file = await writeTemp('count,42');
        const out = await GetPropertiesFromFile(file);
        assert.strictEqual(out[0].value, '42');
    });

    it('handles a file with no trailing newline', async () => {
        const file = await writeTemp('a,1');
        const out = await GetPropertiesFromFile(file);
        assert.deepEqual(out, [{ title: 'a', value: '1' }]);
    });

    it('rejects when the file does not exist', async () => {
        const missing = path.join(os.tmpdir(), 'gpe-missing-' + Date.now() + '.csv');
        const original = console.error;
        console.error = () => {};
        try {
            let threw = false;
            try {
                await GetPropertiesFromFile(missing);
            } catch {
                threw = true;
            }
            assert.isTrue(threw);
        } finally {
            console.error = original;
        }
    });

    it('returns a distinct array instance per call', async () => {
        const file = await writeTemp('a,1');
        const first = await GetPropertiesFromFile(file);
        const second = await GetPropertiesFromFile(file);
        assert.notStrictEqual(first, second);
        assert.deepEqual(first, second);
    });
});

describe('@unit GetGroupedCategories (edge)', () => {
    it('returns {} for an empty list', () => {
        assert.deepEqual(GetGroupedCategories([]), {});
    });

    it('throws TypeError when the list is null', () => {
        assert.throws(() => GetGroupedCategories(null), TypeError);
    });

    it('throws TypeError when the list is undefined', () => {
        assert.throws(() => GetGroupedCategories(undefined), TypeError);
    });

    it('buckets items with undefined type under the literal key "undefined"', () => {
        const out = GetGroupedCategories([{ id: 'x' }]);
        assert.deepEqual(out, { undefined: ['x'] });
    });

    it('buckets items with null type under the literal key "null"', () => {
        const out = GetGroupedCategories([{ id: 'x', type: null }]);
        assert.deepEqual(out, { null: ['x'] });
    });

    it('buckets items with empty-string type under the empty-string key', () => {
        const out = GetGroupedCategories([{ id: 'a', type: '' }]);
        assert.deepEqual(out, { '': ['a'] });
    });

    it('coerces a numeric type to its string key', () => {
        const out = GetGroupedCategories([{ id: 'a', type: 1 }, { id: 'b', type: 1 }]);
        assert.deepEqual(out, { 1: ['a', 'b'] });
    });

    it('pushes undefined id values without filtering them out', () => {
        const out = GetGroupedCategories([{ type: 'T' }]);
        assert.lengthOf(out.T, 1);
        assert.isUndefined(out.T[0]);
    });

    it('keeps duplicate ids in the same bucket (no dedupe)', () => {
        const out = GetGroupedCategories([{ id: 'a', type: 'T' }, { id: 'a', type: 'T' }]);
        assert.deepEqual(out.T, ['a', 'a']);
    });

    it('throws when type collides with an inherited Object property name (__proto__)', () => {
        assert.throws(() => GetGroupedCategories([{ id: 'a', type: '__proto__' }]), TypeError);
    });

    it('treats "constructor" type as a non-array inherited slot and throws', () => {
        assert.throws(() => GetGroupedCategories([{ id: 'a', type: 'constructor' }]), TypeError);
    });

    it('groups multiple types preserving first-seen id order per bucket', () => {
        const out = GetGroupedCategories([
            { id: 'a1', type: 'A' },
            { id: 'b1', type: 'B' },
            { id: 'a2', type: 'A' },
        ]);
        assert.deepEqual(out.A, ['a1', 'a2']);
        assert.deepEqual(out.B, ['b1']);
    });

    it('returns a plain object (own enumerable keys only)', () => {
        const out = GetGroupedCategories([{ id: 'a', type: 'A' }]);
        assert.deepEqual(Object.keys(out), ['A']);
    });
});
