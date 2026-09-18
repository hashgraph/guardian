import assert from 'node:assert/strict';
import MultiPoint from '../dist/helpers/geojson-schema/multi-point.js';

describe('GeoJSON MultiPoint schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(MultiPoint.title, 'GeoJSON MultiPoint');
        assert.equal(MultiPoint.type, 'object');
    });

    it('requires type and coordinates', () => {
        assert.deepEqual(MultiPoint.required, ['type', 'coordinates']);
    });

    it('pins the type enum to ["MultiPoint"]', () => {
        assert.deepEqual(MultiPoint.properties.type.enum, ['MultiPoint']);
    });

    it('coordinates is an array whose items are point coordinates (≥2 numbers)', () => {
        const coords = MultiPoint.properties.coordinates;
        assert.equal(coords.type, 'array');
        assert.equal(coords.items.type, 'array');
        assert.equal(coords.items.minItems, 2);
        assert.equal(coords.items.items.type, 'number');
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(MultiPoint.properties.bbox.type, 'array');
        assert.equal(MultiPoint.properties.bbox.minItems, 4);
    });
});
