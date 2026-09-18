import assert from 'node:assert/strict';
import Geometry from '../dist/helpers/geojson-schema/geometry.js';

describe('GeoJSON Geometry oneOf union', () => {
    it('declares the correct title', () => {
        assert.equal(Geometry.title, 'GeoJSON Geometry');
    });

    it('lists all six primary geometry types in oneOf', () => {
        const titles = Geometry.oneOf.map((s) => s.title);
        assert.deepEqual(titles.sort(), [
            'GeoJSON LineString',
            'GeoJSON MultiLineString',
            'GeoJSON MultiPoint',
            'GeoJSON MultiPolygon',
            'GeoJSON Point',
            'GeoJSON Polygon',
        ]);
    });

    it('does NOT include Feature, FeatureCollection or GeometryCollection (those live in geo-json.js)', () => {
        const titles = Geometry.oneOf.map((s) => s.title);
        assert.ok(!titles.includes('GeoJSON Feature'));
        assert.ok(!titles.includes('GeoJSON FeatureCollection'));
        assert.ok(!titles.includes('GeoJSON GeometryCollection'));
    });
});
