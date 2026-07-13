import assert from 'node:assert/strict';
import Polygon from '../dist/helpers/geojson-schema/polygon.js';

describe('GeoJSON Polygon schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(Polygon.title, 'GeoJSON Polygon');
        assert.equal(Polygon.type, 'object');
    });

    it('requires type and coordinates', () => {
        assert.deepEqual(Polygon.required, ['type', 'coordinates']);
    });

    it('pins the type enum to ["Polygon"]', () => {
        assert.deepEqual(Polygon.properties.type.enum, ['Polygon']);
    });

    it('coordinates is an array of linear-ring arrays (each ≥4 positions)', () => {
        const coords = Polygon.properties.coordinates;
        assert.equal(coords.type, 'array');
        assert.equal(coords.items.type, 'array');
        assert.equal(coords.items.minItems, 4);
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(Polygon.properties.bbox.type, 'array');
        assert.equal(Polygon.properties.bbox.minItems, 4);
    });
});
