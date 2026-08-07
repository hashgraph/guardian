import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';
import {
    FieldTypesDictionary,
    DefaultFieldDictionary,
} from '../dist/helpers/field-types-dictionary.js';

const field = (overrides) => ({
    name: 'f',
    type: null,
    format: null,
    pattern: null,
    isRef: false,
    isArray: false,
    examples: null,
    default: null,
    customType: null,
    ...overrides,
});

describe('@unit DocumentGenerator.generateExample — boundary inputs', () => {
    it('returns undefined when type is null', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: null })), undefined);
    });

    it('returns undefined when type is undefined', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: undefined })), undefined);
    });

    it('returns undefined for an empty-string type', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: '' })), undefined);
    });

    it('returns "example" for a number-format string (format ignored on number)', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'number', format: 'date' })), 1);
    });

    it('default is preferred over inferred number value', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'number', default: 7 })), 7);
    });

    it('a falsy zero default is NOT used (truthiness check) and number falls back to 1', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'number', default: 0 })), 1);
    });

    it('a falsy empty-string default is NOT used and string falls back to "example"', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string', default: '' })), 'example');
    });

    it('a falsy false default is NOT used and boolean falls back to true', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'boolean', default: false })), true);
    });

    it('examples[0] truthy short-circuits over default and inferred', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'number', examples: [99], default: 5 })),
            99,
        );
    });

    it('examples[0] falsy 0 is skipped, then default used', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'number', examples: [0], default: 5 })),
            5,
        );
    });

    it('examples=[] (empty array) falls through to inferred value', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'integer', examples: [] })), 1);
    });

    it('a unicode default string is returned verbatim', () => {
        const u = 'héllo-世界-😀';
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string', default: u })), u);
    });

    it('a very large default string is returned verbatim', () => {
        const big = 'x'.repeat(10000);
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string', default: big })), big);
    });
});

describe('@unit DocumentGenerator.generateExample — customType edges', () => {
    it('enum with null enum returns undefined', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'string', customType: 'enum', enum: null })),
            undefined,
        );
    });

    it('enum with empty array reads enum[0] as undefined', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'string', customType: 'enum', enum: [] })),
            undefined,
        );
    });

    it('enum returns a falsy first value (empty string) when present', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'string', customType: 'enum', enum: [''] })),
            '',
        );
    });

    it('file customType is not special-cased and falls to ipfs pattern handling', () => {
        const out = DocumentGenerator.generateExample(field({ type: 'string', customType: 'file', pattern: '^ipfs://.+' }));
        assert.ok(out.startsWith('ipfs://'));
    });

    it('unknown customType on string falls through to format/pattern/default chain', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string', customType: 'mystery' })), 'example');
    });

    it('table customType wins even when a format is also set', () => {
        const out = DocumentGenerator.generateExample(field({ type: 'string', customType: 'table', format: 'date' }));
        assert.match(out, /^\{"type":"table"/);
    });

    it('hederaAccount customType wins over pattern', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'string', customType: 'hederaAccount', pattern: '^ipfs://.+' })),
            '0.0.1',
        );
    });
});

describe('@unit DocumentGenerator.generateExample — string format/pattern interplay', () => {
    it('format takes precedence over pattern when both set', () => {
        assert.equal(
            DocumentGenerator.generateExample(field({ type: 'string', format: 'date', pattern: '^ipfs://.+' })),
            '2000-01-01',
        );
    });

    it('unknown format with a pattern falls through to the pattern branch', () => {
        const out = DocumentGenerator.generateExample(field({ type: 'string', format: 'bogus', pattern: '^ipfs://.+' }));
        assert.ok(out.startsWith('ipfs://'));
    });

    it('empty-string pattern is falsy so returns the plain "example" default', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string', pattern: '' })), 'example');
    });

    it('a non-ipfs pattern yields a generated id that is not "example"', () => {
        const out = DocumentGenerator.generateExample(field({ type: 'string', pattern: '^[A-Z]+$' }));
        assert.notEqual(out, 'example');
        assert.equal(typeof out, 'string');
        assert.ok(out.length > 0);
    });

    it('ipfs pattern only matches the exact literal "^ipfs://.+"', () => {
        const exact = DocumentGenerator.generateExample(field({ type: 'string', pattern: '^ipfs://.+' }));
        const variant = DocumentGenerator.generateExample(field({ type: 'string', pattern: '^ipfs://[a-z]+' }));
        assert.ok(exact.startsWith('ipfs://'));
        assert.ok(!variant.startsWith('ipfs://'));
    });
});

describe('@unit DocumentGenerator.generateExample — passes null context/option', () => {
    it('null type returns undefined even with null context/option', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'null' }), undefined);
    });

    it('handles a field that omits all optional keys', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string' }), 'example');
    });
});

describe('@unit DocumentGenerator.generateField — rowPresets edges', () => {
    const f = (extra) => ({ name: 'f', type: 'string', ...extra });

    it('undefined rowPresets object does not throw', () => {
        assert.equal(DocumentGenerator.generateField(f(), ['c'], null, undefined), 'example');
    });

    it('null rowPresets object does not throw', () => {
        assert.equal(DocumentGenerator.generateField(f(), ['c'], null, null), 'example');
    });

    it('preset of explicit undefined is treated as absent', () => {
        assert.equal(DocumentGenerator.generateField(f(), ['c'], null, { f: undefined }), 'example');
    });

    it('preset of null is honoured (defined, not undefined)', () => {
        assert.equal(DocumentGenerator.generateField(f({ type: 'number' }), ['c'], null, { f: null }), null);
    });

    it('preset of empty string is honoured', () => {
        assert.equal(DocumentGenerator.generateField(f(), ['c'], null, { f: '' }), '');
    });

    it('preset of false is honoured', () => {
        assert.equal(DocumentGenerator.generateField(f({ type: 'boolean' }), ['c'], null, { f: false }), false);
    });

    it('preset wins over examples and default', () => {
        assert.equal(
            DocumentGenerator.generateField(f({ examples: ['ex'], default: 'def' }), ['c'], null, { f: 'preset' }),
            'preset',
        );
    });

    it('null-typed field with a defined preset returns the preset wrapped per isArray', () => {
        assert.equal(DocumentGenerator.generateField(f({ type: 'null' }), ['c'], null, { f: 'kept' }), 'kept');
    });
});

describe('@unit DocumentGenerator.generateField — array wrapping boundaries', () => {
    it('isArray with undefined value returns undefined, not [undefined]', () => {
        assert.equal(DocumentGenerator.generateField({ name: 'f', type: 'null', isArray: true }, ['c'], null, {}), undefined);
    });

    it('isArray with a null preset wraps null into [null]', () => {
        assert.deepEqual(
            DocumentGenerator.generateField({ name: 'f', type: 'number', isArray: true }, ['c'], null, { f: null }),
            [null],
        );
    });

    it('isArray with empty-string preset wraps into [""]', () => {
        assert.deepEqual(
            DocumentGenerator.generateField({ name: 'f', type: 'string', isArray: true }, ['c'], null, { f: '' }),
            [''],
        );
    });

    it('isArray=false leaves an array value as-is', () => {
        assert.deepEqual(
            DocumentGenerator.generateField({ name: 'f', type: 'string', isArray: false }, ['c'], null, { f: ['a'] }),
            ['a'],
        );
    });

    it('isArray with an already-array preset is not double-wrapped', () => {
        assert.deepEqual(
            DocumentGenerator.generateField({ name: 'f', type: 'string', isArray: true }, ['c'], null, { f: ['a', 'b'] }),
            ['a', 'b'],
        );
    });
});

describe('@unit DocumentGenerator ref fields — examples short-circuit', () => {
    it('ref field with a truthy examples[0] returns it verbatim (no generation)', () => {
        const out = DocumentGenerator.generateField(
            { name: 'geo', type: '#GeoJSON', isRef: true, examples: [{ ok: 1 }] },
            ['c'], null, {},
        );
        assert.deepEqual(out, { ok: 1 });
    });

    it('ref field with falsy examples[0] still generates the GeoJSON default', () => {
        const out = DocumentGenerator.generateField(
            { name: 'geo', type: '#GeoJSON', isRef: true, examples: [null] },
            ['c'], null, {},
        );
        assert.equal(out.type, 'FeatureCollection');
    });

    it('ref field with empty examples array generates the default', () => {
        const out = DocumentGenerator.generateField(
            { name: 'sh', type: '#SentinelHUB', isRef: true, examples: [] },
            ['c'], null, {},
        );
        assert.equal(out.layers, 'NATURAL-COLOR');
    });
});

describe('@unit DocumentGenerator GeoJSON — preset and option edges', () => {
    const geo = (extra) => ({ name: 'geo', type: '#GeoJSON', isRef: true, ...extra });

    it('an array preset (non-plain-object) is ignored and defaults generate', () => {
        const out = DocumentGenerator.generateField(geo(), ['c'], null, { geo: { geo: [1, 2] } });
        assert.equal(out.type, 'FeatureCollection');
    });

    it('a null nested preset is ignored and defaults generate', () => {
        const out = DocumentGenerator.generateField(geo(), ['c'], null, { geo: { geo: null } });
        assert.equal(out.type, 'FeatureCollection');
    });

    it('availableOptions empty array falls back to Point', () => {
        const out = DocumentGenerator.generateField(geo({ availableOptions: [] }), ['c'], null, {});
        assert.equal(out.features[0].geometry.type, 'Point');
    });

    it('Point geometry uses the [0,0] default coordinates', () => {
        const out = DocumentGenerator.generateField(geo({ availableOptions: ['Point'] }), ['c'], null, {});
        assert.deepEqual(out.features[0].geometry.coordinates, [0, 0]);
    });

    it('a plain-object preset is returned by identity, ignoring availableOptions', () => {
        const preset = { type: 'FeatureCollection', features: [] };
        const out = DocumentGenerator.generateField(geo({ availableOptions: ['Polygon'] }), ['c'], null, { geo: { geo: preset } });
        assert.equal(out, preset);
    });

    it('always emits empty properties object on the feature', () => {
        const out = DocumentGenerator.generateField(geo(), ['c'], null, {});
        assert.deepEqual(out.features[0].properties, {});
    });
});

describe('@unit DocumentGenerator SentinelHUB — context wiring', () => {
    const sh = () => ({ name: 'sh', type: '#SentinelHUB', isRef: true });

    it('embeds the passed context array by reference into @context', () => {
        const ctx = ['#root'];
        const out = DocumentGenerator.generateField(sh(), ctx, null, {});
        assert.deepEqual(out['@context'], ['#root']);
    });

    it('numeric-string preset is not a plain object so defaults generate', () => {
        const out = DocumentGenerator.generateField(sh(), ['c'], null, { sh: { sh: '123' } });
        assert.equal(out.maxcc, 10);
    });
});

describe('@unit DocumentGenerator sub-documents — structure edges', () => {
    it('sub-document with empty fields array still gets type and @context', () => {
        const out = DocumentGenerator.generateField(
            { name: 'sub', type: '#Empty&1.0.0', isRef: true, fields: [] },
            ['c'], null, {},
        );
        assert.equal(out.type, 'Empty&1.0.0');
        assert.deepEqual(out['@context'], ['c']);
    });

    it('omits child fields whose generated value is undefined', () => {
        const out = DocumentGenerator.generateField(
            { name: 'sub', type: '#S', isRef: true, fields: [{ name: 'gone', type: 'null' }, { name: 'kept', type: 'integer' }] },
            ['c'], null, {},
        );
        assert.equal('gone' in out, false);
        assert.equal(out.kept, 1);
    });

    it('a child field literally named "type" is overwritten by the schema type', () => {
        const out = DocumentGenerator.generateField(
            { name: 'sub', type: '#S', isRef: true, fields: [{ name: 'type', type: 'string' }] },
            ['c'], null, {},
        );
        assert.equal(out.type, 'S');
    });

    it('parseRef strips the leading hash from the sub-document type', () => {
        const out = DocumentGenerator.generateField(
            { name: 'sub', type: '#Nested&2.1.0', isRef: true, fields: [] },
            ['c'], null, {},
        );
        assert.equal(out.type, 'Nested&2.1.0');
    });
});

describe('@unit DocumentGenerator.generateDocument — schema-level edges', () => {
    it('schema with no fields still yields id, type and @context', () => {
        const doc = DocumentGenerator.generateDocument({ iri: '#R', type: 'R', fields: [] });
        assert.ok(doc.id);
        assert.equal(doc.type, 'R');
        assert.deepEqual(doc['@context'], ['#R']);
    });

    it('undefined schema.iri produces a [undefined] @context', () => {
        const doc = DocumentGenerator.generateDocument({ type: 'R', fields: [] });
        assert.deepEqual(doc['@context'], [undefined]);
    });

    it('a field named "id" overrides the generated uuid (id set before the field loop)', () => {
        const doc = DocumentGenerator.generateDocument({
            iri: '#R', type: 'R', fields: [field({ name: 'id', type: 'string' })],
        });
        assert.equal(doc.id, 'example');
    });

    it('a field named "type" is overwritten by the schema type', () => {
        const doc = DocumentGenerator.generateDocument({
            iri: '#R', type: 'RealType', fields: [field({ name: 'type', type: 'string' })],
        });
        assert.equal(doc.type, 'RealType');
    });

    it('skips fields that generate undefined (null type, empty enum)', () => {
        const doc = DocumentGenerator.generateDocument({
            iri: '#R', type: 'R', fields: [
                field({ name: 'a', type: 'null' }),
                field({ name: 'b', type: 'string', customType: 'enum' }),
                field({ name: 'c', type: 'integer' }),
            ],
        });
        assert.equal('a' in doc, false);
        assert.equal('b' in doc, false);
        assert.equal(doc.c, 1);
    });

    it('rowPresets apply across multiple top-level fields', () => {
        const doc = DocumentGenerator.generateDocument(
            { iri: '#R', type: 'R', fields: [field({ name: 'a', type: 'string' }), field({ name: 'b', type: 'number' })] },
            undefined,
            { a: 'AA', b: 42 },
        );
        assert.equal(doc.a, 'AA');
        assert.equal(doc.b, 42);
    });

    it('explicit option object is used when provided', () => {
        const doc = DocumentGenerator.generateDocument(
            { iri: '#R', type: 'R', fields: [field({ name: 'a', type: 'string' })] },
            { enableHiddenFields: true },
        );
        assert.equal(doc.a, 'example');
    });

    it('two documents from the same schema differ only by id', () => {
        const s = { iri: '#R', type: 'R', fields: [field({ name: 'a', type: 'string' })] };
        const a = DocumentGenerator.generateDocument(s);
        const b = DocumentGenerator.generateDocument(s);
        assert.notEqual(a.id, b.id);
        assert.equal(a.a, b.a);
        assert.equal(a.type, b.type);
    });

    it('a unicode field name is preserved as a document key', () => {
        const doc = DocumentGenerator.generateDocument({
            iri: '#R', type: 'R', fields: [field({ name: '区域', type: 'string' })],
        });
        assert.equal(doc['区域'], 'example');
    });
});

describe('@unit FieldTypesDictionary.equal — error/boundary inputs', () => {
    it('matches catalogue String entry against an equivalent field', () => {
        const str = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'String');
        const fld = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(fld, str), true);
    });

    it('null format on field loosely equals undefined format on type', () => {
        const fld = { type: 'number', format: null, pattern: null, isRef: false, customType: null };
        const typ = { type: 'number', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(fld, typ), true);
    });

    it('a string-vs-number type mismatch is not loosely equal', () => {
        const fld = { type: '1', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        const typ = { type: 1, format: undefined, pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(fld, typ), true);
    });

    it('boolean false isRef loosely equals 0', () => {
        const fld = { type: 's', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        const typ = { type: 's', format: undefined, pattern: undefined, isRef: 0, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(fld, typ), true);
    });

    it('is symmetric for a matching pair', () => {
        const a = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        const b = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(a, b), FieldTypesDictionary.equal(b, a));
    });

    it('throws when the field argument is null', () => {
        assert.throws(() => FieldTypesDictionary.equal(null, { type: 's' }));
    });

    it('throws when the type argument is null', () => {
        assert.throws(() => FieldTypesDictionary.equal({ type: 's' }, null));
    });
});

describe('@unit FieldTypesDictionary — catalogue integrity', () => {
    it('every FieldTypes entry has a name and a type', () => {
        for (const t of FieldTypesDictionary.FieldTypes) {
            assert.ok(t.name);
            assert.ok(t.type);
        }
    });

    it('FieldTypes names are unique', () => {
        const names = FieldTypesDictionary.FieldTypes.map((t) => t.name);
        assert.equal(new Set(names).size, names.length);
    });

    it('exactly two ref entries (GeoJSON, SentinelHUB) in FieldTypes', () => {
        const refs = FieldTypesDictionary.FieldTypes.filter((t) => t.isRef).map((t) => t.name);
        assert.deepEqual(refs.sort(), ['GeoJSON', 'SentinelHUB']);
    });

    it('Image and File share the same ipfs pattern', () => {
        const img = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'Image');
        const file = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'File');
        assert.equal(img.pattern, file.pattern);
    });

    it('CustomFieldTypes unit entries differ only by unitSystem', () => {
        const units = FieldTypesDictionary.CustomFieldTypes.filter((t) => t.unitSystem);
        assert.equal(units.length, 2);
        assert.notEqual(units[0].unitSystem, units[1].unitSystem);
    });

    it('the same catalogue reference is returned on repeated reads (no clone)', () => {
        assert.equal(FieldTypesDictionary.FieldTypes, FieldTypesDictionary.FieldTypes);
    });
});

describe('@unit DefaultFieldDictionary.getDefaultFields — boundaries', () => {
    it('returns [] for null entity', () => {
        assert.deepEqual(DefaultFieldDictionary.getDefaultFields(null), []);
    });

    it('returns [] for undefined entity', () => {
        assert.deepEqual(DefaultFieldDictionary.getDefaultFields(undefined), []);
    });

    it('returns [] for an empty-string entity', () => {
        assert.deepEqual(DefaultFieldDictionary.getDefaultFields(''), []);
    });

    it('VC and EVC return structurally identical copies', () => {
        assert.deepEqual(
            DefaultFieldDictionary.getDefaultFields('VC'),
            DefaultFieldDictionary.getDefaultFields('EVC'),
        );
    });

    it('successive VC calls return distinct array instances', () => {
        const a = DefaultFieldDictionary.getDefaultFields('VC');
        const b = DefaultFieldDictionary.getDefaultFields('VC');
        assert.notEqual(a, b);
        assert.deepEqual(a, b);
    });

    it('mutating a nested returned field does not corrupt the catalogue', () => {
        const a = DefaultFieldDictionary.getDefaultFields('VC');
        a[1].title = 'changed';
        assert.equal(DefaultFieldDictionary.vcDefaultFields[1].title, 'Relationships');
    });

    it('a non-VC each call returns a fresh empty array literal', () => {
        const a = DefaultFieldDictionary.getDefaultFields('USER');
        const b = DefaultFieldDictionary.getDefaultFields('USER');
        assert.notEqual(a, b);
    });
});
