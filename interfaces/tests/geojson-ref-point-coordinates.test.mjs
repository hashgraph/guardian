import assert from 'node:assert/strict';
import PointCoordinates from '../dist/helpers/geojson-schema/ref/point-coordinates.js';

describe('GeoJSON PointCoordinates ref schema', () => {
    it('is an array of numbers', () => {
        assert.equal(PointCoordinates.type, 'array');
        assert.equal(PointCoordinates.items.type, 'number');
    });

    it('requires at least 2 items (longitude, latitude — altitude optional per RFC-7946 §3.1.1)', () => {
        assert.equal(PointCoordinates.minItems, 2);
    });

    it('does not pin maxItems (allows the optional altitude component)', () => {
        assert.equal(PointCoordinates.maxItems, undefined);
    });
});
