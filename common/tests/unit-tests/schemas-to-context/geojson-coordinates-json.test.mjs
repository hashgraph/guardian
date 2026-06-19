import assert from 'node:assert/strict';
import esmock from 'esmock';

const COORDS_ID = 'https://purl.org/geojson/vocab#coordinates';
const BBOX_ID = 'https://purl.org/geojson/vocab#bbox';

const { schemasToContext } = await esmock('../../../dist/helpers/schemas-to-context.js', {
    '../../../dist/helpers/jsonld-schema/schemas-to-context-impl.js': {
        schemasToContext: () => ({
            '@context': {
                place: { '@id': 'https://example.org/place' },
            },
        }),
    },
});

const withGeoJson = (extra = []) => new Map([['#GeoJSON', { geo: true }], ...extra]);

describe('@unit schemasToContext (GeoJSON coordinates as @json)', () => {
    it('maps root coordinates to an @json literal when enabled and #GeoJSON is present', () => {
        const out = schemasToContext([], withGeoJson(), { geoJsonCoordinatesAsJson: true });
        assert.deepEqual(out['@context'].coordinates, { '@id': COORDS_ID, '@type': '@json' });
    });

    it('maps root bbox to an @json literal when enabled and #GeoJSON is present', () => {
        const out = schemasToContext([], withGeoJson(), { geoJsonCoordinatesAsJson: true });
        assert.deepEqual(out['@context'].bbox, { '@id': BBOX_ID, '@type': '@json' });
    });

    it('still merges the #GeoJSON additional context alongside the @json terms', () => {
        const out = schemasToContext([], withGeoJson(), { geoJsonCoordinatesAsJson: true });
        assert.deepEqual(out['@context']['#GeoJSON'], { geo: true });
        assert.equal(out['@context'].coordinates['@type'], '@json');
    });

    it('does NOT add the @json terms when the flag is false', () => {
        const out = schemasToContext([], withGeoJson(), { geoJsonCoordinatesAsJson: false });
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });

    it('does NOT add the @json terms when the flag is omitted', () => {
        const out = schemasToContext([], withGeoJson(), {});
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });

    it('does NOT add the @json terms when contextSettings is absent', () => {
        const out = schemasToContext([], withGeoJson());
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });

    it('does NOT add the @json terms when #GeoJSON is not among the additional contexts', () => {
        const additional = new Map([['#SentinelHUB', { hub: true }]]);
        const out = schemasToContext([], additional, { geoJsonCoordinatesAsJson: true });
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });

    it('does NOT add the @json terms when there are no additional contexts', () => {
        const out = schemasToContext([], undefined, { geoJsonCoordinatesAsJson: true });
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });

    it('does NOT add the @json terms for an empty additional contexts map', () => {
        const out = schemasToContext([], new Map(), { geoJsonCoordinatesAsJson: true });
        assert.equal(out['@context'].coordinates, undefined);
        assert.equal(out['@context'].bbox, undefined);
    });
});
