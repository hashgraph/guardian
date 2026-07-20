import assert from 'node:assert/strict';
import MultiLineString from '../dist/helpers/geojson-schema/multi-line-string.js';

describe('GeoJSON MultiLineString schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(MultiLineString.title, 'GeoJSON MultiLineString');
        assert.equal(MultiLineString.type, 'object');
    });

    it('requires type and coordinates', () => {
        assert.deepEqual(MultiLineString.required, ['type', 'coordinates']);
    });

    it('pins the type enum to ["MultiLineString"]', () => {
        assert.deepEqual(MultiLineString.properties.type.enum, ['MultiLineString']);
    });

    it('coordinates is an array of line-string-coordinate arrays (each ≥2 positions)', () => {
        const coords = MultiLineString.properties.coordinates;
        assert.equal(coords.type, 'array');
        assert.equal(coords.items.type, 'array');
        assert.equal(coords.items.minItems, 2);
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(MultiLineString.properties.bbox.type, 'array');
        assert.equal(MultiLineString.properties.bbox.minItems, 4);
    });
});
