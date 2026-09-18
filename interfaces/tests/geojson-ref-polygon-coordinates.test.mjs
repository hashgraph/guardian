import assert from 'node:assert/strict';
import PolygonCoordinates from '../dist/helpers/geojson-schema/ref/polygon-coordinates.js';

describe('GeoJSON PolygonCoordinates ref schema', () => {
    it('is an array of linear-ring arrays', () => {
        assert.equal(PolygonCoordinates.type, 'array');
        assert.equal(PolygonCoordinates.items.type, 'array');
        assert.equal(PolygonCoordinates.items.minItems, 4);
    });

    it('inner ring items are position arrays (≥2 numbers)', () => {
        const ring = PolygonCoordinates.items;
        assert.equal(ring.items.type, 'array');
        assert.equal(ring.items.minItems, 2);
        assert.equal(ring.items.items.type, 'number');
    });
});
