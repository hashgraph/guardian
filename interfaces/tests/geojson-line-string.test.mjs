import assert from 'node:assert/strict';
import LineString from '../dist/helpers/geojson-schema/line-string.js';

describe('GeoJSON LineString schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(LineString.title, 'GeoJSON LineString');
        assert.equal(LineString.type, 'object');
    });

    it('requires type and coordinates', () => {
        assert.deepEqual(LineString.required, ['type', 'coordinates']);
    });

    it('pins the type enum to ["LineString"]', () => {
        assert.deepEqual(LineString.properties.type.enum, ['LineString']);
    });

    it('coordinates is an array of ≥2 position arrays (per RFC-7946 §3.1.4)', () => {
        const coords = LineString.properties.coordinates;
        assert.equal(coords.type, 'array');
        assert.equal(coords.minItems, 2);
        assert.equal(coords.items.type, 'array');
        assert.equal(coords.items.minItems, 2);
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(LineString.properties.bbox.type, 'array');
        assert.equal(LineString.properties.bbox.minItems, 4);
    });
});
