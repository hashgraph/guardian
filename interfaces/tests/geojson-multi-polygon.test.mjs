import assert from 'node:assert/strict';
import MultiPolygon from '../dist/helpers/geojson-schema/multi-polygon.js';

describe('GeoJSON MultiPolygon schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(MultiPolygon.title, 'GeoJSON MultiPolygon');
        assert.equal(MultiPolygon.type, 'object');
    });

    it('requires type and coordinates', () => {
        assert.deepEqual(MultiPolygon.required, ['type', 'coordinates']);
    });

    it('pins the type enum to ["MultiPolygon"]', () => {
        assert.deepEqual(MultiPolygon.properties.type.enum, ['MultiPolygon']);
    });

    it('coordinates is an array of polygon-coordinate arrays', () => {
        const coords = MultiPolygon.properties.coordinates;
        assert.equal(coords.type, 'array');
        assert.equal(coords.items.type, 'array');
        assert.equal(coords.items.items.type, 'array');
        assert.equal(coords.items.items.minItems, 4);
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(MultiPolygon.properties.bbox.type, 'array');
        assert.equal(MultiPolygon.properties.bbox.minItems, 4);
    });
});
