import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';

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

describe('DocumentGenerator.generateExample (simple field)', () => {
    it('returns 1 for number / integer types', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'number' })), 1);
        assert.equal(DocumentGenerator.generateExample(field({ type: 'integer' })), 1);
    });

    it('returns true for boolean type', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'boolean' })), true);
    });

    it('returns "example" for plain string with no format/pattern', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'string' })), 'example');
    });

    describe('string formats', () => {
        const cases = {
            date: '2000-01-01',
            time: '00:00:00',
            'date-time': '2000-01-01T01:00:00.000Z',
            duration: 'P1D',
            url: 'https://example.com',
            uri: 'example:uri',
            email: 'example@email.com',
        };
        for (const [format, expected] of Object.entries(cases)) {
            it(`format=${format} → "${expected}"`, () => {
                assert.equal(
                    DocumentGenerator.generateExample(field({ type: 'string', format })),
                    expected,
                );
            });
        }
    });

    describe('customType handling', () => {
        it('hederaAccount returns "0.0.1"', () => {
            assert.equal(
                DocumentGenerator.generateExample(
                    field({ type: 'string', customType: 'hederaAccount' }),
                ),
                '0.0.1',
            );
        });

        it('table returns the canonical table-CID JSON snippet', () => {
            const out = DocumentGenerator.generateExample(
                field({ type: 'string', customType: 'table' }),
            );
            assert.match(out, /^\{"type":"table"/);
        });

        it('enum returns the first enum value, or undefined when no values', () => {
            assert.equal(
                DocumentGenerator.generateExample(
                    field({ type: 'string', customType: 'enum', enum: ['A', 'B'] }),
                ),
                'A',
            );
            assert.equal(
                DocumentGenerator.generateExample(
                    field({ type: 'string', customType: 'enum' }),
                ),
                undefined,
            );
        });
    });

    describe('preference order: examples > default > inferred', () => {
        it('uses examples[0] when provided', () => {
            assert.equal(
                DocumentGenerator.generateExample(
                    field({ type: 'string', examples: ['picked'] }),
                ),
                'picked',
            );
        });

        it('uses default when examples is missing', () => {
            assert.equal(
                DocumentGenerator.generateExample(
                    field({ type: 'string', default: 'fallback' }),
                ),
                'fallback',
            );
        });
    });

    it('returns undefined for null type', () => {
        assert.equal(DocumentGenerator.generateExample(field({ type: 'null' })), undefined);
    });
});

describe('DocumentGenerator.generateDocument (top-level shape)', () => {
    it('generates id, type, @context and a value for each scalar field', () => {
        const schema = {
            iri: '#schema-1',
            type: 'schema-1',
            fields: [
                field({ name: 'a', type: 'string' }),
                field({ name: 'b', type: 'integer' }),
            ],
        };
        const doc = DocumentGenerator.generateDocument(schema);
        assert.ok(doc.id, 'should have an id');
        assert.equal(doc.type, 'schema-1');
        assert.deepEqual(doc['@context'], ['#schema-1']);
        assert.equal(doc.a, 'example');
        assert.equal(doc.b, 1);
    });

    it('honours rowPresets for matching field names', () => {
        const schema = {
            iri: '#s1',
            type: 's1',
            fields: [field({ name: 'name', type: 'string' })],
        };
        const doc = DocumentGenerator.generateDocument(schema, undefined, { name: 'override' });
        assert.equal(doc.name, 'override');
    });

    it('wraps a scalar value in an array when field.isArray=true', () => {
        const schema = {
            iri: '#s1',
            type: 's1',
            fields: [field({ name: 'tags', type: 'string', isArray: true })],
        };
        const doc = DocumentGenerator.generateDocument(schema);
        assert.ok(Array.isArray(doc.tags));
        assert.equal(doc.tags[0], 'example');
    });

    it('keeps an already-array preset as a single array (no double-wrap)', () => {
        const schema = {
            iri: '#s1',
            type: 's1',
            fields: [field({ name: 'tags', type: 'string', isArray: true })],
        };
        const doc = DocumentGenerator.generateDocument(schema, undefined, { tags: ['a', 'b'] });
        assert.deepEqual(doc.tags, ['a', 'b']);
    });
});

describe('DocumentGenerator.generateExample — ipfs pattern', () => {
    it('prefixes ipfs:// for the ipfs pattern', () => {
        const value = DocumentGenerator.generateExample(field({ type: 'string', pattern: '^ipfs://.+' }));
        assert.ok(value.startsWith('ipfs://'), `expected ipfs:// prefix, got ${value}`);
    });

    it('returns a generated id (not "example") for a non-ipfs pattern', () => {
        const value = DocumentGenerator.generateExample(field({ type: 'string', pattern: '^[0-9]+$' }));
        assert.equal(typeof value, 'string');
        assert.ok(value.length > 0);
        assert.ok(!value.startsWith('ipfs://'));
        assert.notEqual(value, 'example');
    });
});

describe('DocumentGenerator.generateDocument — reference fields', () => {
    const refDoc = (fieldDef, rowPresets) => DocumentGenerator.generateDocument(
        { iri: '#s1', type: 's1', fields: [fieldDef] },
        undefined,
        rowPresets,
    );

    it('generates a GeoJSON FeatureCollection using availableOptions[0] as the geometry type', () => {
        const doc = refDoc(field({ name: 'geo', isRef: true, type: '#GeoJSON', availableOptions: ['Polygon'] }));
        assert.equal(doc.geo.type, 'FeatureCollection');
        assert.equal(doc.geo.features[0].geometry.type, 'Polygon');
        assert.equal(doc.geo.features[0].geometry.coordinates[0][0][0], -77.9584065268336);
    });

    it('defaults GeoJSON geometry to Point [0,0] when no availableOptions', () => {
        const doc = refDoc(field({ name: 'geo', isRef: true, type: '#GeoJSON' }));
        assert.equal(doc.geo.features[0].geometry.type, 'Point');
        assert.deepEqual(doc.geo.features[0].geometry.coordinates, [0.0, 0.0]);
    });

    it('falls back to Point coordinates for an unknown geometry type', () => {
        const doc = refDoc(field({ name: 'geo', isRef: true, type: '#GeoJSON', availableOptions: ['Custom'] }));
        assert.equal(doc.geo.features[0].geometry.type, 'Custom');
        assert.deepEqual(doc.geo.features[0].geometry.coordinates, [0.0, 0.0]);
    });

    it('generates a SentinelHub request object', () => {
        const doc = refDoc(field({ name: 'sat', isRef: true, type: '#SentinelHUB' }));
        assert.equal(doc.sat.layers, 'NATURAL-COLOR');
        assert.equal(doc.sat.format, 'image/jpeg');
        assert.equal(doc.sat.maxcc, 10);
        assert.equal(doc.sat.width, 10);
        assert.equal(doc.sat.height, 10);
        assert.deepEqual(doc.sat['@context'], ['#s1']);
    });

    it('recurses into a sub-document, resolving its type via parseRef', () => {
        const doc = refDoc(field({
            name: 'sub',
            isRef: true,
            type: '#TestSub',
            fields: [field({ name: 'x', type: 'integer' })],
        }));
        assert.equal(doc.sub.x, 1);
        assert.equal(doc.sub.type, 'TestSub');
        assert.deepEqual(doc.sub['@context'], ['#s1']);
    });

    it('wraps a reference value in an array when isArray=true', () => {
        const doc = refDoc(field({ name: 'sat', isRef: true, type: '#SentinelHUB', isArray: true }));
        assert.ok(Array.isArray(doc.sat));
        assert.equal(doc.sat[0].layers, 'NATURAL-COLOR');
    });
});
