import assert from 'node:assert/strict';
import GeometryCollection from '../dist/helpers/geojson-schema/geometry-collection.js';

describe('GeoJSON GeometryCollection schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(GeometryCollection.title, 'GeoJSON GeometryCollection');
        assert.equal(GeometryCollection.type, 'object');
    });

    it('requires type and geometries', () => {
        assert.deepEqual(GeometryCollection.required, ['type', 'geometries']);
    });

    it('pins the type enum to ["GeometryCollection"]', () => {
        assert.deepEqual(GeometryCollection.properties.type.enum, ['GeometryCollection']);
    });

    it('geometries is an array whose items oneOf the six primary geometry types', () => {
        assert.equal(GeometryCollection.properties.geometries.type, 'array');
        const titles = GeometryCollection.properties.geometries.items.oneOf.map((s) => s.title);
        assert.deepEqual(titles.sort(), [
            'GeoJSON LineString',
            'GeoJSON MultiLineString',
            'GeoJSON MultiPoint',
            'GeoJSON MultiPolygon',
            'GeoJSON Point',
            'GeoJSON Polygon',
        ]);
    });

    it('does NOT permit nested GeometryCollections (RFC-7946 §3.1.8)', () => {
        const titles = GeometryCollection.properties.geometries.items.oneOf.map((s) => s.title);
        assert.ok(!titles.includes('GeoJSON GeometryCollection'));
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(GeometryCollection.properties.bbox.type, 'array');
        assert.equal(GeometryCollection.properties.bbox.minItems, 4);
        assert.equal(GeometryCollection.properties.bbox.items.type, 'number');
    });
});
