import assert from 'node:assert/strict';
import LineStringCoordinates from '../dist/helpers/geojson-schema/ref/line-string-coordinates.js';

describe('GeoJSON LineStringCoordinates ref schema', () => {
    it('is an array whose items are point-coordinates (positions)', () => {
        assert.equal(LineStringCoordinates.type, 'array');
        assert.equal(LineStringCoordinates.items.type, 'array');
        assert.equal(LineStringCoordinates.items.items.type, 'number');
        assert.equal(LineStringCoordinates.items.minItems, 2);
    });

    it('requires at least 2 positions (RFC-7946 §3.1.4)', () => {
        assert.equal(LineStringCoordinates.minItems, 2);
    });
});
