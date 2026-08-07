import assert from 'node:assert/strict';
import GeoJsonContext from '../dist/helpers/geojson-schema/geo-json-context.js';

describe('GeoJSON JSON-LD @context', () => {
    it('declares JSON-LD version 1.1', () => {
        assert.equal(GeoJsonContext['@context']['@version'], 1.1);
    });

    it('maps the geojson vocab prefix to the canonical URL', () => {
        assert.equal(GeoJsonContext['@context'].geojson, 'https://purl.org/geojson/vocab#');
    });

    it('aliases every geometry/feature type under the geojson vocab', () => {
        const ctx = GeoJsonContext['@context'];
        for (const t of [
            'Feature',
            'FeatureCollection',
            'GeometryCollection',
            'LineString',
            'MultiLineString',
            'MultiPoint',
            'MultiPolygon',
            'Point',
            'Polygon',
        ]) {
            assert.equal(ctx[t], `geojson:${t}`, `${t} should map to geojson:${t}`);
        }
    });

    it('bbox and coordinates are ordered lists', () => {
        const ctx = GeoJsonContext['@context'];
        assert.equal(ctx.bbox['@container'], '@list');
        assert.equal(ctx.coordinates['@container'], '@list');
    });

    it('features is an unordered set', () => {
        assert.equal(GeoJsonContext['@context'].features['@container'], '@set');
    });

    it('id and type map to JSON-LD reserved keywords', () => {
        const ctx = GeoJsonContext['@context'];
        assert.equal(ctx.id, '@id');
        assert.equal(ctx.type, '@type');
    });

    it('properties maps to geojson:properties (not the JSON-LD reserved word)', () => {
        assert.equal(GeoJsonContext['@context'].properties, 'geojson:properties');
    });
});
