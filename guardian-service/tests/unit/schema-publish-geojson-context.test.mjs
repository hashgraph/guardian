import assert from 'node:assert/strict';
import { SchemaEntity } from '@guardian/interfaces';
import { generateSchemaContext, generatePackage } from '../../dist/helpers/import-helpers/schema/schema-publish-helper.js';

const COORDS_ID = 'https://purl.org/geojson/vocab#coordinates';
const BBOX_ID = 'https://purl.org/geojson/vocab#bbox';

const stringProp = (title = 'Field') => ({
    type: 'string',
    title,
    description: title,
    $comment: JSON.stringify({ term: title, '@id': `schema:${title}` })
});

const schemaDoc = (id, overrides = {}) => ({
    $id: id,
    title: id.replace('#', ''),
    type: 'object',
    $comment: JSON.stringify({ term: id.replace('#', ''), '@id': `schema:${id.replace('#', '')}` }),
    properties: { amount: stringProp() },
    ...overrides
});

const schemaItem = (iri, document, overrides = {}) => ({
    uuid: `uuid-${iri}`,
    iri,
    document,
    ...overrides
});

const geoDoc = (id) => schemaDoc(id, {
    properties: { place: { $ref: '#GeoJSON', title: 'g', description: 'g' } },
    $defs: { '#GeoJSON': schemaDoc('#GeoJSON') }
});

describe('generateSchemaContext (GeoJSON coordinates as @json)', () => {
    it('signs coordinates/bbox as @json for a non-EVC schema that uses #GeoJSON', () => {
        const context = generateSchemaContext(schemaItem('#A', geoDoc('#A'), { entity: SchemaEntity.VC }));
        assert.deepEqual(context['@context'].coordinates, { '@id': COORDS_ID, '@type': '@json' });
        assert.deepEqual(context['@context'].bbox, { '@id': BBOX_ID, '@type': '@json' });
    });

    it('signs coordinates/bbox as @json when the entity is undefined (still not EVC)', () => {
        const context = generateSchemaContext(schemaItem('#A', geoDoc('#A')));
        assert.equal(context['@context'].coordinates['@type'], '@json');
    });

    it('does NOT add @json terms for an EVC schema, even with #GeoJSON', () => {
        const context = generateSchemaContext(schemaItem('#A', geoDoc('#A'), { entity: SchemaEntity.EVC }));
        assert.equal(context['@context'].coordinates, undefined);
        assert.equal(context['@context'].bbox, undefined);
    });

    it('does NOT add @json terms for a non-EVC schema without #GeoJSON', () => {
        const context = generateSchemaContext(schemaItem('#A', schemaDoc('#A'), { entity: SchemaEntity.VC }));
        assert.equal(context['@context'].coordinates, undefined);
        assert.equal(context['@context'].bbox, undefined);
    });
});

describe('generatePackage (GeoJSON coordinates as @json)', () => {
    const owner = { owner: 'did:owner' };
    const options = (schemas, overrides = {}) => ({
        name: 'pkg',
        version: '1.0.0',
        type: 'publish',
        schemas,
        owner,
        ...overrides
    });

    it('signs coordinates/bbox as @json when no packaged schema is EVC', () => {
        const result = generatePackage(options([
            schemaItem('#A', geoDoc('#A'), { entity: SchemaEntity.VC }),
            schemaItem('#B', schemaDoc('#B'), { entity: SchemaEntity.VC })
        ]));
        assert.deepEqual(result.context['@context'].coordinates, { '@id': COORDS_ID, '@type': '@json' });
        assert.deepEqual(result.context['@context'].bbox, { '@id': BBOX_ID, '@type': '@json' });
    });

    it('does NOT add @json terms when ANY packaged schema is EVC', () => {
        const result = generatePackage(options([
            schemaItem('#A', geoDoc('#A'), { entity: SchemaEntity.VC }),
            schemaItem('#B', schemaDoc('#B'), { entity: SchemaEntity.EVC })
        ]));
        assert.equal(result.context['@context'].coordinates, undefined);
        assert.equal(result.context['@context'].bbox, undefined);
    });

    it('does NOT add @json terms when no packaged schema uses #GeoJSON', () => {
        const result = generatePackage(options([
            schemaItem('#A', schemaDoc('#A'), { entity: SchemaEntity.VC })
        ]));
        assert.equal(result.context['@context'].coordinates, undefined);
        assert.equal(result.context['@context'].bbox, undefined);
    });
});
